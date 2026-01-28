import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from './env';
import type { AuthContext } from './authTypes';

export interface AccessTokenClaims extends jwt.JwtPayload {
  sub: string;
  orgId: string;
  permissions: string[];
  isSuperAdmin: boolean;
}

// PUBLIC_INTERFACE
export function signAccessToken(ctx: AuthContext): { token: string; expiresInSeconds: number } {
  /** Sign a short-lived JWT access token for API authentication and RBAC enforcement. */
  const jti = crypto.randomUUID();
  const expiresIn = env.accessTokenTtlSeconds;

  const token = jwt.sign(
    {
      orgId: ctx.orgId,
      permissions: ctx.permissions,
      isSuperAdmin: ctx.isSuperAdmin
    },
    env.jwtAccessSecret,
    {
      subject: ctx.userId,
      jwtid: jti,
      expiresIn
    }
  );

  return { token, expiresInSeconds: expiresIn };
}

// PUBLIC_INTERFACE
export function verifyAccessToken(token: string): AccessTokenClaims {
  /** Verify and decode a JWT access token. Throws if invalid/expired. */
  const decoded = jwt.verify(token, env.jwtAccessSecret) as AccessTokenClaims;

  if (!decoded.sub || !decoded.orgId) {
    throw new Error('Invalid access token claims');
  }

  return decoded;
}
