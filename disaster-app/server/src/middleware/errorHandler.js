/** Central error handling with a consistent {error, details} response shape. */

export class HttpError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function notFound(req, res) {
  res.status(404).json({ error: 'Route not found', details: `${req.method} ${req.originalUrl}` });
}

/* eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity. */
export function errorHandler(err, req, res, next) {
  const status = err.status && Number.isInteger(err.status) ? err.status : 500;
  const message = status === 500 ? 'Internal server error' : err.message || 'Request failed';

  if (status === 500) {
    console.error('[error]', err);
  }

  res.status(status).json({
    error: message,
    details: err.details ?? (status === 500 ? null : (err.message ?? null))
  });
}
