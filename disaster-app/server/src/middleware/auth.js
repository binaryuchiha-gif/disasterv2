/** JWT authentication and role authorisation. */
import jwt from 'jsonwebtoken';
import { HttpError } from './errorHandler.js';

const DEV_SECRET = 'change-me-in-production-disaster-app-dev-secret';
export const TOKEN_TTL = '12h';

export function getJwtSecret() {
  return process.env.JWT_SECRET && process.env.JWT_SECRET.length > 0
    ? process.env.JWT_SECRET
    : DEV_SECRET;
}

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, name: user.name },
    getJwtSecret(),
    { expiresIn: TOKEN_TTL }
  );
}

function readToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    return header.slice('Bearer '.length).trim();
  }
  return null;
}

export function requireAuth(req, res, next) {
  const token = readToken(req);
  if (!token) {
    next(new HttpError(401, 'Authentication required'));
    return;
  }
  try {
    req.user = jwt.verify(token, getJwtSecret());
    next();
  } catch {
    next(new HttpError(401, 'Session expired or token invalid'));
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user) {
    next(new HttpError(401, 'Authentication required'));
    return;
  }
  if (req.user.role !== 'admin') {
    next(new HttpError(403, 'Administrator access required'));
    return;
  }
  next();
}
