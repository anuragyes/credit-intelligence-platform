import { AppError } from '../common/errors.js';
import { logger } from '../common/logger.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: 'ROUTE_NOT_FOUND', message: `No route for ${req.method} ${req.path}` } });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) logger.error({ err }, err.message);
    return res.status(err.statusCode).json({ error: { code: err.code, message: err.message, details: err.details } });
  }

  logger.error({ err }, 'Unhandled error');
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
}
