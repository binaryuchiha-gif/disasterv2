import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../db.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/errorHandler.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email('A valid email address is required'),
  password: z.string().min(1, 'Password is required')
});

const selectUserByEmail = db.prepare(
  'SELECT id, name, email, password_hash, role FROM users WHERE email = ?'
);
const selectUserById = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?');

router.post('/login', validate(loginSchema), (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = selectUserByEmail.get(email.toLowerCase().trim());
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      throw new HttpError(401, 'Email or password is incorrect');
    }
    const token = signToken(user);
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me', requireAuth, (req, res, next) => {
  try {
    const user = selectUserById.get(req.user.sub);
    if (!user) {
      throw new HttpError(404, 'User no longer exists');
    }
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

export default router;
