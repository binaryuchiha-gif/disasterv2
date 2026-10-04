import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { db } from '../db.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const checkinLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many check-ins, please wait a moment', details: null }
});

const insertCheckin = db.prepare(`
  INSERT INTO checkins (name, lat, lng, message, created_at)
  VALUES (@name, @lat, @lng, @message, datetime('now'))
`);

const selectById = db.prepare('SELECT * FROM checkins WHERE id = ?');
const selectRecent = db.prepare('SELECT * FROM checkins ORDER BY created_at DESC LIMIT 100');
const selectByName = db.prepare(
  'SELECT * FROM checkins WHERE name LIKE ? ORDER BY created_at DESC LIMIT 100'
);

const createSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  lat: z.coerce.number().min(-90).max(90).optional().nullable().default(null),
  lng: z.coerce.number().min(-180).max(180).optional().nullable().default(null),
  message: z.string().trim().max(300).optional().default('')
});

const querySchema = z.object({
  name: z.string().trim().min(1).max(120).optional()
});

router.get('/', validate(querySchema, 'query'), (req, res, next) => {
  try {
    const { name } = req.validatedQuery;
    const rows = name ? selectByName.all(`%${name}%`) : selectRecent.all();
    res.json({ checkins: rows });
  } catch (error) {
    next(error);
  }
});

router.post('/', checkinLimiter, validate(createSchema), (req, res, next) => {
  try {
    const info = insertCheckin.run(req.body);
    res.status(201).json({ checkin: selectById.get(info.lastInsertRowid) });
  } catch (error) {
    next(error);
  }
});

export default router;
