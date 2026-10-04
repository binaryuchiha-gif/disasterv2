import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

const selectAll = db.prepare('SELECT * FROM contacts ORDER BY id');

router.get('/', (req, res, next) => {
  try {
    res.json({ contacts: selectAll.all() });
  } catch (error) {
    next(error);
  }
});

export default router;
