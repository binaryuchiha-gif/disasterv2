import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { db } from '../db.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/errorHandler.js';
import { EVENTS, emit } from '../socket.js';

const router = Router();

/** Net upvotes needed before a community report is auto-verified. */
const AUTO_VERIFY_THRESHOLD = 3;

export const REPORT_TYPES = [
  'road_blocked',
  'flooded_area',
  'medical_help',
  'food_water',
  'person_missing',
  'power_outage'
];

const reportLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many reports, please wait a moment', details: null }
});

const voteLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many votes, please wait a moment', details: null }
});

const insertReport = db.prepare(`
  INSERT INTO reports (type, lat, lng, description, status, created_at)
  VALUES (@type, @lat, @lng, @description, 'unverified', datetime('now'))
`);

const selectById = db.prepare('SELECT * FROM reports WHERE id = ?');
const selectAll = db.prepare('SELECT * FROM reports ORDER BY created_at DESC LIMIT 300');
const selectByStatus = db.prepare(
  'SELECT * FROM reports WHERE status = ? ORDER BY created_at DESC LIMIT 300'
);

const createSchema = z.object({
  type: z.enum(REPORT_TYPES),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  description: z.string().trim().max(500).optional().default('')
});

const idSchema = z.object({ id: z.coerce.number().int().positive() });
const voteSchema = z.object({ direction: z.enum(['up', 'down']) });
const patchSchema = z.object({ status: z.enum(['unverified', 'verified', 'rejected']) });
const listQuerySchema = z.object({
  status: z.enum(['unverified', 'verified', 'rejected']).optional()
});

function serialize(row) {
  if (!row) return null;
  return { ...row, netVotes: row.upvotes - row.downvotes };
}

router.get('/', validate(listQuerySchema, 'query'), (req, res, next) => {
  try {
    const { status } = req.validatedQuery;
    const rows = status ? selectByStatus.all(status) : selectAll.all();
    res.json({ reports: rows.map(serialize) });
  } catch (error) {
    next(error);
  }
});

router.post('/', reportLimiter, validate(createSchema), (req, res, next) => {
  try {
    const info = insertReport.run(req.body);
    const report = serialize(selectById.get(info.lastInsertRowid));
    emit(EVENTS.reportNew, { report });
    res.status(201).json({ report });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/:id/vote',
  voteLimiter,
  validate(idSchema, 'params'),
  validate(voteSchema),
  (req, res, next) => {
    try {
      const { id } = req.validatedParams;
      const existing = selectById.get(id);
      if (!existing) {
        throw new HttpError(404, 'Report not found');
      }

      const column = req.body.direction === 'up' ? 'upvotes' : 'downvotes';
      db.prepare(`UPDATE reports SET ${column} = ${column} + 1 WHERE id = ?`).run(id);

      // Auto-verify once the community consensus is clear enough.
      const updated = selectById.get(id);
      if (
        updated.status === 'unverified' &&
        updated.upvotes - updated.downvotes >= AUTO_VERIFY_THRESHOLD
      ) {
        db.prepare("UPDATE reports SET status = 'verified' WHERE id = ?").run(id);
      }

      const report = serialize(selectById.get(id));
      emit(EVENTS.reportUpdated, { report });
      res.json({ report });
    } catch (error) {
      next(error);
    }
  }
);

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
        throw new HttpError(404, 'Report not found');
      }
      db.prepare('UPDATE reports SET status = ? WHERE id = ?').run(req.body.status, id);
      const report = serialize(selectById.get(id));
      emit(EVENTS.reportUpdated, { report });
      res.json({ report });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
