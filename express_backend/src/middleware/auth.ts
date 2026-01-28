import type { RequestHandler } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { unauthorized } from '../utils/httpErrors';

// PUBLIC_INTERFACE
export const requireAuth: RequestHandler = (req, _res, next) => {
  /** Require a valid Bearer JWT access token. Populates req.auth for downstream RBAC/org isolation. */

  const header = req.header('Authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return next(unauthorized('AUTH_REQUIRED', 'Missing Authorization: Bearer <token> header'));
  }

  try {
    const claims = verifyAccessToken(match[1]);
    req.auth = {
      userId: claims.sub,
      orgId: claims.orgId,
      permissions: Array.isArray(claims.permissions) ? claims.permissions : [],
      isSuperAdmin: Boolean(claims.isSuperAdmin)
    };
    return next();
  } catch {
    return next(unauthorized('INVALID_TOKEN', 'Invalid or expired access token'));
  }
};
