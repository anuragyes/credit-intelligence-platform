import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../common/errors.js';

export function requireAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(new UnauthorizedError('Missing bearer token'));

  try {
    const token = header.slice('Bearer '.length);
    const payload = jwt.verify(token, env.jwtAccessSecret);
    req.user = payload;
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired token'));
  }
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new UnauthorizedError('Insufficient role for this action'));
    }
    next();
  };
}
