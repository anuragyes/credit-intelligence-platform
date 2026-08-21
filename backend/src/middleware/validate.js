import { ValidationError } from '../common/errors.js';

/** Wraps a Zod schema as Express middleware, validating body/query/params. */
export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(new ValidationError(result.error.flatten()));
    }
    req[source] = result.data;
    next();
  };
}
