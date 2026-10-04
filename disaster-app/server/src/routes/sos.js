import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { db } from '../db.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/errorHandler.js';
import { EVENTS, emit } from '../socket.js';

const router = Router();

/** Generous enough for a live demo, strict enough to stop accidental loops. */
const sosLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many SOS requests, please wait a moment', details: null }
});

const insertSos = db.prepare(`
  INSERT INTO sos_events (name, phone, lat, lng, message, status, created_at)
  VALUES (@name, @phone, @lat, @lng, @message, 'open', datetime('now'))
`);

const selectById = db.prepare('SELECT * FROM sos_events WHERE id = ?');
const selectAll = db.prepare('SELECT * FROM sos_events ORDER BY created_at DESC LIMIT 200');
const selectByStatus = db.prepare(
  'SELECT * FROM sos_events WHERE status = ? ORDER BY created_at DESC LIMIT 200'
);

const createSchema = z.object({
  name: z.string().trim().max(120).optional().default(''),
  phone: z.string().trim().max(40).optional().default(''),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  message: z.string().trim().max(500).optional().default('')
});

const idSchema = z.object({ id: z.coerce.number().int().positive() });

const patchSchema = z.object({
  status: z.enum(['open', 'acknowledged', 'resolved'])
});

const listQuerySchema = z.object({
  status: z.enum(['open', 'acknowledged', 'resolved']).optional()
});

/** Human-friendly reference shown to the person who triggered the SOS. */
function referenceId(id, createdAt) {
  const datePart = (createdAt ?? '').slice(0, 10).replace(/-/g, '');
  return `SOS-${datePart || 'NA'}-${String(id).padStart(4, '0')}`;
}

function serialize(row) {
  if (!row) return null;
  return { ...row, reference: referenceId(row.id, row.created_at) };
}

router.post('/', sosLimiter, validate(createSchema), (req, res, next) => {
  try {
    const info = insertSos.run(req.body);
    const sos = serialize(selectById.get(info.lastInsertRowid));
    emit(EVENTS.sosNew, { sos });
    res.status(201).json({ sos });
  } catch (error) {
    next(error);
  }
});

router.get('/', requireAuth, requireAdmin, validate(listQuerySchema, 'query'), (req, res, next) => {
  try {
    const { status } = req.validatedQuery;
    const rows = status ? selectByStatus.all(status) : selectAll.all();
    res.json({ sos: rows.map(serialize) });
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
        throw new HttpError(404, 'SOS event not found');
      }
      const { status } = req.body;
      const resolvedAt = status === 'resolved' ? new Date().toISOString() : null;

      db.prepare('UPDATE sos_events SET status = ?, resolved_at = ? WHERE id = ?').run(
        status,
        resolvedAt,
        id
      );

      const sos = serialize(selectById.get(id));
      emit(EVENTS.sosUpdated, { sos });
      res.json({ sos });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
