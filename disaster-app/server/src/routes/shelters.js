import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { db } from '../db.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/errorHandler.js';
import { rankShelters } from '../services/ranking.js';
import { parseGeoJson } from '../services/geo.js';
import { getTravelTime, hasApiKey } from '../services/traffic.js';
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
  limit: z.coerce.number().int().min(1).max(20).optional().default(3),
  traffic: z
    .enum(['true', 'false'])
    .optional()
    .default('true')
    .transform((value) => value === 'true')
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

/** A group arriving together is recorded in one scan. */
const arrivalSchema = z.object({
  people: z.coerce.number().int().min(1).max(50).optional().default(1)
});

const arrivalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many arrivals recorded, please wait a moment', details: null }
});

router.get('/', (req, res, next) => {
  try {
    res.json({ shelters: selectAll.all().map(serialize) });
  } catch (error) {
    next(error);
  }
});

/**
 * How many top candidates get a live traffic lookup. Each one costs a routing
 * request, so the window is kept small and the results are cached upstream.
 */
const TRAFFIC_ENRICHMENT_WINDOW = 4;

/**
 * Adds traffic-aware travel time to the leading candidates and re-orders them
 * by the traffic-adjusted time. Hazard exclusion has already been applied by
 * the ranking service, so ordering here never reintroduces an unsafe shelter.
 */
async function applyTrafficEta(ranked, origin, limit) {
  if (!hasApiKey() || ranked.length === 0) {
    return { shelters: ranked.slice(0, limit), trafficSource: 'none' };
  }

  const window = ranked.slice(0, Math.min(TRAFFIC_ENRICHMENT_WINDOW, ranked.length));
  const remainder = ranked.slice(window.length);

  const enriched = await Promise.all(
    window.map(async (shelter) => {
      try {
        const travel = await getTravelTime(origin, { lat: shelter.lat, lng: shelter.lng });
        if (!travel.available) return shelter;
        return {
          ...shelter,
          etaMinutes: Number(travel.durationMin.toFixed(1)),
          freeFlowEtaMinutes: Number(travel.freeFlowDurationMin.toFixed(1)),
          trafficDelayMinutes: Number(travel.trafficDelayMin.toFixed(1)),
          roadDistanceKm: Number(travel.distanceKm.toFixed(2)),
          trafficAware: true
        };
      } catch {
        // A single failed lookup must not spoil the whole ranking.
        return shelter;
      }
    })
  );

  const anyTraffic = enriched.some((shelter) => shelter.trafficAware);
  if (anyTraffic) {
    // Fewest hazard intersections is guaranteed by exclusion, so the remaining
    // tie-break is the traffic-adjusted travel time.
    enriched.sort((a, b) => {
      if (a.trafficAware && b.trafficAware) return a.etaMinutes - b.etaMinutes;
      if (a.trafficAware) return -1;
      if (b.trafficAware) return 1;
      return b.score - a.score;
    });
  }

  return {
    shelters: [...enriched, ...remainder].slice(0, limit),
    trafficSource: anyTraffic ? 'tomtom' : 'unavailable'
  };
}

router.get('/nearest', validate(nearestQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { lat, lng, disaster, limit, traffic } = req.validatedQuery;
    const hazardRows = disaster
      ? selectActiveHazardsByType.all(disaster)
      : selectActiveHazards.all();
    const zones = hazardRows.map((row) => ({ ...row, geometry: parseGeoJson(row.geojson) }));
    const shelters = selectOpen.all();

    // Rank a slightly wider set so the traffic pass has candidates to reorder.
    const ranked = rankShelters(
      shelters,
      lat,
      lng,
      zones,
      Math.max(limit, TRAFFIC_ENRICHMENT_WINDOW)
    );

    const result = traffic
      ? await applyTrafficEta(ranked, { lat, lng }, limit)
      : { shelters: ranked.slice(0, limit), trafficSource: 'disabled' };

    res.json({
      origin: { lat, lng },
      disaster: disaster ?? null,
      excludedHazardZones: zones.length,
      candidates: shelters.length,
      trafficSource: result.trafficSource,
      shelters: result.shelters
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

/**
 * QR arrival check-in.
 *
 * Each shelter has a printable QR code pointing at the client route
 * /checkin/:id, which calls this endpoint to record one arrival. It is public
 * because people arriving at a shelter are not signed in, so it is rate
 * limited and refuses to exceed the recorded capacity.
 */
router.post(
  '/:id/arrive',
  arrivalLimiter,
  validate(idSchema, 'params'),
  validate(arrivalSchema),
  (req, res, next) => {
    try {
      const { id } = req.validatedParams;
      const { people } = req.body;
      const existing = selectById.get(id);

      if (!existing) {
        throw new HttpError(404, 'Shelter not found');
      }
      if (!existing.is_open) {
        throw new HttpError(409, 'This shelter is currently closed', {
          shelter: existing.name
        });
      }

      const free = existing.capacity - existing.occupied;
      if (free <= 0) {
        throw new HttpError(409, 'This shelter has reached capacity', {
          shelter: existing.name,
          capacity: existing.capacity
        });
      }
      if (people > free) {
        throw new HttpError(409, `Only ${free} places remain at this shelter`, {
          shelter: existing.name,
          free
        });
      }

      db.prepare(
        `UPDATE shelters
         SET occupied = occupied + ?, updated_at = datetime('now')
         WHERE id = ?`
      ).run(people, id);

      const shelter = serialize(selectById.get(id));
      emit(EVENTS.shelterUpdated, { shelter });

      res.status(201).json({
        shelter,
        recorded: people,
        message: `Arrival recorded at ${shelter.name}`
      });
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
