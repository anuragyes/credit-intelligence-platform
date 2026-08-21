export class AppError extends Error {
  constructor(message, { statusCode = 500, code = 'INTERNAL_ERROR', details } = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class NotFoundError extends AppError {
  constructor(entity, id) {
    super(`${entity} not found${id ? `: ${id}` : ''}`, { statusCode: 404, code: 'NOT_FOUND' });
  }
}

export class ValidationError extends AppError {
  constructor(details) {
    super('Request failed validation', { statusCode: 400, code: 'VALIDATION_ERROR', details });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, { statusCode: 401, code: 'UNAUTHORIZED' });
  }
}

export class ConflictError extends AppError {
  constructor(message) {
    super(message, { statusCode: 409, code: 'CONFLICT' });
  }
}
