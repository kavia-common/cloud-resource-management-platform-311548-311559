import type { RequestHandler } from 'express';
import { forbidden, unauthorized } from '../utils/httpErrors';

// PUBLIC_INTERFACE
export function requirePermission(permissionKey: string): RequestHandler {
  /** Enforce that the authenticated user has the given permission within the active org. */
  return (req, _res, next) => {
    if (!req.auth) {
      return next(unauthorized('AUTH_REQUIRED', 'Authentication required'));
    }

    if (req.auth.isSuperAdmin) {
      return next();
    }

    if (!req.auth.permissions.includes(permissionKey)) {
      return next(forbidden('FORBIDDEN', `Missing permission: ${permissionKey}`));
    }

    return next();
  };
}
