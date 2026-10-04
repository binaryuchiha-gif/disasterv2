import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { EVENTS, emit } from '../socket.js';

const router = Router();

const DISASTER_TYPES = ['flood', 'cyclone', 'earthquake', 'fire', 'tsunami'];

const insertAlert = db.prepare(`
  INSERT INTO alerts (title, body, severity, disaster_type, created_at, created_by)
  VALUES (@title, @body, @severity, @disaster_type, datetime('now'), @created_by)
`);

const selectById = db.prepare('SELECT * FROM alerts WHERE id = ?');
const selectRecent = db.prepare('SELECT * FROM alerts ORDER BY created_at DESC LIMIT 50');

const activateHazardsByType = db.prepare(
  "UPDATE hazard_zones SET active = 1, updated_at = datetime('now') WHERE disaster_type = ?"
);

const createSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(140),
  body: z.string().trim().min(3, 'Body must be at least 3 characters').max(1000),
  severity: z.enum(['info', 'warning', 'critical']).optional().default('info'),
  disaster_type: z.enum(DISASTER_TYPES).optional().nullable().default(null)
});

const simulateSchema = z.object({
  disaster_type: z.enum(DISASTER_TYPES)
});

router.get('/', (req, res, next) => {
  try {
    res.json({ alerts: selectRecent.all() });
  } catch (error) {
    next(error);
  }
});

router.post('/', requireAuth, requireAdmin, validate(createSchema), (req, res, next) => {
  try {
    const info = insertAlert.run({ ...req.body, created_by: req.user.sub });
    const alert = selectById.get(info.lastInsertRowid);
    emit(EVENTS.alertNew, { alert });
    res.status(201).json({ alert });
  } catch (error) {
    next(error);
  }
});

/**
 * Simulation used during demonstrations. Publishes a critical alert, activates
 * every hazard zone for the chosen disaster and asks clients to raise the alarm.
 */
router.post('/simulate', requireAuth, requireAdmin, validate(simulateSchema), (req, res, next) => {
  try {
    const { disaster_type: disasterType } = req.body;
    const label = disasterType.charAt(0).toUpperCase() + disasterType.slice(1);

    activateHazardsByType.run(disasterType);

    const info = insertAlert.run({
      title: `${label} emergency declared`,
      body: `A ${disasterType} emergency has been declared for the demonstration area. Move to the nearest recommended shelter and follow official instructions.`,
      severity: 'critical',
      disaster_type: disasterType,
      created_by: req.user.sub
    });
    const alert = selectById.get(info.lastInsertRowid);

    emit(EVENTS.alertNew, { alert });
    emit(EVENTS.hazardUpdated, { disasterType });
    emit(EVENTS.disasterSimulate, { disasterType, alert });

    res.status(201).json({ alert, disasterType });
  } catch (error) {
    next(error);
  }
});

export default router;
