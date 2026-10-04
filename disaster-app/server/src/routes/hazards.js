import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/errorHandler.js';
import { parseGeoJson } from '../services/geo.js';
import { EVENTS, emit } from '../socket.js';

const router = Router();

const selectAll = db.prepare('SELECT * FROM hazard_zones ORDER BY disaster_type, name');
const selectByType = db.prepare('SELECT * FROM hazard_zones WHERE disaster_type = ? ORDER BY name');
const selectById = db.prepare('SELECT * FROM hazard_zones WHERE id = ?');

const insertZone = db.prepare(`
  INSERT INTO hazard_zones (disaster_type, name, severity, geojson, active, updated_at)
  VALUES (@disaster_type, @name, @severity, @geojson, @active, datetime('now'))
`);

const deleteZone = db.prepare('DELETE FROM hazard_zones WHERE id = ?');

const DISASTER_TYPES = ['flood', 'cyclone', 'earthquake', 'fire', 'tsunami'];

function serialize(row) {
  if (!row) return null;
  return {
    ...row,
    active: Boolean(row.active),
    geojson: parseGeoJson(row.geojson)
  };
}

/** Accepts a GeoJSON geometry, Feature or FeatureCollection with polygons. */
const geojsonSchema = z.union([z.string(), z.record(z.any())]).transform((value, ctx) => {
  const parsed = typeof value === 'string' ? parseGeoJson(value) : value;
  if (!parsed || typeof parsed !== 'object') {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'geojson must be valid JSON' });
    return z.NEVER;
  }
  const allowed = ['Polygon', 'MultiPolygon', 'Feature', 'FeatureCollection'];
  if (!allowed.includes(parsed.type)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `geojson type must be one of ${allowed.join(', ')}`
    });
    return z.NEVER;
  }
  return parsed;
});

const idSchema = z.object({ id: z.coerce.number().int().positive() });

const querySchema = z.object({
  type: z.enum(DISASTER_TYPES).optional()
});

const createSchema = z.object({
  disaster_type: z.enum(DISASTER_TYPES),
  name: z.string().trim().min(2),
  severity: z.coerce.number().int().min(1).max(3),
  geojson: geojsonSchema,
  active: z.coerce.boolean().optional().default(true)
});

const patchSchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    severity: z.coerce.number().int().min(1).max(3).optional(),
    active: z.coerce.boolean().optional(),
    geojson: geojsonSchema.optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update'
  });

router.get('/', validate(querySchema, 'query'), (req, res, next) => {
  try {
    const { type } = req.validatedQuery;
    const rows = type ? selectByType.all(type) : selectAll.all();
    res.json({ hazards: rows.map(serialize) });
  } catch (error) {
    next(error);
  }
});

router.post('/', requireAuth, requireAdmin, validate(createSchema), (req, res, next) => {
  try {
    const payload = req.body;
    const info = insertZone.run({
      disaster_type: payload.disaster_type,
      name: payload.name,
      severity: payload.severity,
      geojson: JSON.stringify(payload.geojson),
      active: payload.active ? 1 : 0
    });
    const hazard = serialize(selectById.get(info.lastInsertRowid));
    emit(EVENTS.hazardUpdated, { hazard });
    res.status(201).json({ hazard });
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
        throw new HttpError(404, 'Hazard zone not found');
      }

      const name = req.body.name ?? existing.name;
      const severity = req.body.severity ?? existing.severity;
      const active = req.body.active ?? Boolean(existing.active);
      const geojson = req.body.geojson ? JSON.stringify(req.body.geojson) : existing.geojson;

      db.prepare(
        `UPDATE hazard_zones
         SET name = ?, severity = ?, active = ?, geojson = ?, updated_at = datetime('now')
         WHERE id = ?`
      ).run(name, severity, active ? 1 : 0, geojson, id);

      const hazard = serialize(selectById.get(id));
      emit(EVENTS.hazardUpdated, { hazard });
      res.json({ hazard });
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
      throw new HttpError(404, 'Hazard zone not found');
    }
    deleteZone.run(id);
    emit(EVENTS.hazardUpdated, { deleted: id });
    res.json({ deleted: id });
  } catch (error) {
    next(error);
  }
});

export default router;
