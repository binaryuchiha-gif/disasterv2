import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/errorHandler.js';
import { rankShelters } from '../services/ranking.js';
import { parseGeoJson } from '../services/geo.js';
import { EVENTS, emit } from '../socket.js';

const router = Router();

const selectAll = db.prepare('SELECT * FROM shelters ORDER BY name');
const selectById = db.prepare('SELECT * FROM shelters WHERE id = ?');
const selectOpen = db.prepare('SELECT * FROM shelters WHERE is_open = 1');
const selectActiveHazards = db.prepare(
  'SELECT id, disaster_type, name, severity, geojson FROM hazard_zones WHERE active = 1'
);
const selectActiveHazardsByType = db.prepare(
  'SELECT id, disaster_type, name, severity, geojson FROM hazard_zones WHERE active = 1 AND disaster_type = ?'
);

const insertShelter = db.prepare(`
  INSERT INTO shelters (name, type, lat, lng, address, capacity, occupied, is_open, phone, facilities, accessibility, updated_at)
  VALUES (@name, @type, @lat, @lng, @address, @capacity, @occupied, @is_open, @phone, @facilities, @accessibility, datetime('now'))
`);

const deleteShelter = db.prepare('DELETE FROM shelters WHERE id = ?');

/** Converts a database row into the JSON shape used by the client. */
function serialize(row) {
  if (!row) return null;
  let facilities = [];
  try {
    const parsed = JSON.parse(row.facilities ?? '[]');
    facilities = Array.isArray(parsed) ? parsed : [];
  } catch {
    facilities = [];
  }
  return {
    ...row,
    facilities,
    is_open: Boolean(row.is_open),
    accessibility: Boolean(row.accessibility),
    free: Math.max(0, row.capacity - row.occupied)
  };
}

const idSchema = z.object({ id: z.coerce.number().int().positive() });

const nearestQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  disaster: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(20).optional().default(3)
});

const createSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  type: z.string().trim().min(2).default('community_hall'),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  address: z.string().trim().optional().default(''),
  capacity: z.coerce.number().int().min(1, 'Capacity must be at least 1'),
  occupied: z.coerce.number().int().min(0).optional().default(0),
  is_open: z.coerce.boolean().optional().default(true),
  phone: z.string().trim().optional().default(''),
  facilities: z.array(z.string().trim()).optional().default([]),
  accessibility: z.coerce.boolean().optional().default(false)
});

const patchSchema = z
  .object({
    occupied: z.coerce.number().int().min(0).optional(),
    is_open: z.coerce.boolean().optional(),
    capacity: z.coerce.number().int().min(1).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one of occupied, is_open or capacity'
  });

router.get('/', (req, res, next) => {
  try {
    res.json({ shelters: selectAll.all().map(serialize) });
  } catch (error) {
    next(error);
  }
});

router.get('/nearest', validate(nearestQuerySchema, 'query'), (req, res, next) => {
  try {
    const { lat, lng, disaster, limit } = req.validatedQuery;
    const hazardRows = disaster
      ? selectActiveHazardsByType.all(disaster)
      : selectActiveHazards.all();
    const zones = hazardRows.map((row) => ({ ...row, geometry: parseGeoJson(row.geojson) }));
    const shelters = selectOpen.all();
    const ranked = rankShelters(shelters, lat, lng, zones, limit);

    res.json({
      origin: { lat, lng },
      disaster: disaster ?? null,
      excludedHazardZones: zones.length,
      candidates: shelters.length,
      shelters: ranked
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', requireAuth, requireAdmin, validate(createSchema), (req, res, next) => {
  try {
    const payload = req.body;
    if (payload.occupied > payload.capacity) {
      throw new HttpError(400, 'Occupied cannot exceed capacity');
    }
    const info = insertShelter.run({
      name: payload.name,
      type: payload.type,
      lat: payload.lat,
      lng: payload.lng,
      address: payload.address,
      capacity: payload.capacity,
      occupied: payload.occupied,
      is_open: payload.is_open ? 1 : 0,
      phone: payload.phone,
      facilities: JSON.stringify(payload.facilities),
      accessibility: payload.accessibility ? 1 : 0
    });
    const shelter = serialize(selectById.get(info.lastInsertRowid));
    emit(EVENTS.shelterCreated, { shelter });
    emit(EVENTS.shelterUpdated, { shelter });
    res.status(201).json({ shelter });
  } catch (error) {
    next(error);
  }
});

router.patch(
  '/:id',
  requireAuth,
  requireAdmin,
  validate(idSchema, 'params'),
  validate(patchSchema),
  (req, res, next) => {
    try {
      const { id } = req.validatedParams;
      const existing = selectById.get(id);
      if (!existing) {
        throw new HttpError(404, 'Shelter not found');
      }

      const capacity = req.body.capacity ?? existing.capacity;
      const occupied = req.body.occupied ?? existing.occupied;
      const isOpen = req.body.is_open ?? Boolean(existing.is_open);

      if (occupied > capacity) {
        throw new HttpError(400, 'Occupied cannot exceed capacity', {
          capacity,
          occupied
        });
      }

      db.prepare(
        `UPDATE shelters
         SET capacity = ?, occupied = ?, is_open = ?, updated_at = datetime('now')
         WHERE id = ?`
      ).run(capacity, occupied, isOpen ? 1 : 0, id);

      const shelter = serialize(selectById.get(id));
      emit(EVENTS.shelterUpdated, { shelter });
      res.json({ shelter });
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/:id', requireAuth, requireAdmin, validate(idSchema, 'params'), (req, res, next) => {
  try {
    const { id } = req.validatedParams;
    const existing = selectById.get(id);
    if (!existing) {
      throw new HttpError(404, 'Shelter not found');
    }
    deleteShelter.run(id);
    emit(EVENTS.shelterDeleted, { id });
    res.json({ deleted: id });
  } catch (error) {
    next(error);
  }
});

export default router;
