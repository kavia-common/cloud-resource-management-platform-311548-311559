import type { ErrorRequestHandler } from 'express';
import { HttpError } from '../utils/httpErrors';

// PUBLIC_INTERFACE
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  /** Express error handler that returns consistent JSON errors. */

  // eslint-disable-next-line no-console
  console.error(err);

  // Handle common "CORS origin denied" error thrown by our cors origin callback.
  if (err && typeof err === 'object' && (err as any).message === 'Not allowed by CORS') {
    return res.status(403).json({
      status: 'error',
      code: 'CORS_DENIED',
      message: 'Origin not allowed'
    });
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({
      status: 'error',
      code: err.code,
      message: err.message
    });
  }

  // Handle a few common PostgreSQL errors in a user-friendly way.
  // (pg returns errors with a `code` field, e.g. 23505 unique_violation)
  const pgCode = err && typeof err === 'object' ? (err as any).code : undefined;
  if (pgCode === '23505') {
    return res.status(409).json({
      status: 'error',
      code: 'DB_CONFLICT',
      message: 'A record with the same unique key already exists'
    });
  }

  return res.status(500).json({
    status: 'error',
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Internal Server Error'
  });
};
