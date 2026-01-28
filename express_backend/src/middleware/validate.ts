import type { RequestHandler } from 'express';
import { ZodError, type ZodSchema } from 'zod';
import { badRequest } from '../utils/httpErrors';

// PUBLIC_INTERFACE
export function validateBody<T>(schema: ZodSchema<T>): RequestHandler {
  /** Validate and coerce request body using a Zod schema. */
  return (req, _res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(
          badRequest(
            'VALIDATION_ERROR',
            err.errors.map((e) => e.message).join('; ')
          )
        );
      }
      return next(err);
    }
  };
}

// PUBLIC_INTERFACE
export function validateQuery<T>(schema: ZodSchema<T>): RequestHandler {
  /** Validate and coerce request query using a Zod schema. */
  return (req, _res, next) => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(
          badRequest(
            'VALIDATION_ERROR',
            err.errors.map((e) => e.message).join('; ')
          )
        );
      }
      return next(err);
    }
  };
}

// PUBLIC_INTERFACE
export function validateParams<T>(schema: ZodSchema<T>): RequestHandler {
  /** Validate and coerce request params (req.params) using a Zod schema. */
  return (req, _res, next) => {
    try {
      req.params = schema.parse(req.params) as any;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(
          badRequest(
            'VALIDATION_ERROR',
            err.errors.map((e) => e.message).join('; ')
          )
        );
      }
      return next(err);
    }
  };
}
