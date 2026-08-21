import rateLimit from 'express-rate-limit';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts, try again later' } },
});

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
});
