/** Request validation using zod schemas. */
import { HttpError } from './errorHandler.js';

/**
 * Validates and replaces req[source] with the parsed value.
 * source is one of 'body', 'query' or 'params'.
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join('.') || source,
        message: issue.message
      }));
      next(new HttpError(400, 'Validation failed', details));
      return;
    }
    if (source === 'query') {
      req.validatedQuery = result.data;
    } else if (source === 'params') {
      req.validatedParams = result.data;
    } else {
      req.body = result.data;
    }
    next();
  };
}
