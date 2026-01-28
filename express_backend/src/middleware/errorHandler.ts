import type { ErrorRequestHandler } from 'express';
import { HttpError } from '../utils/httpErrors';

// PUBLIC_INTERFACE
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  /** Express error handler that returns consistent JSON errors. */

  // eslint-disable-next-line no-console
  console.error(err);

  if (err instanceof HttpError) {
    return res.status(err.status).json({
      status: 'error',
      code: err.code,
      message: err.message
    });
  }

  return res.status(500).json({
    status: 'error',
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Internal Server Error'
  });
};
