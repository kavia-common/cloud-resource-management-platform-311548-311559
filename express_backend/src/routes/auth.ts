import express from 'express';
import bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import { z } from 'zod';

import { env } from '../utils/env';
import { validateBody } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { conflict, unauthorized, badRequest } from '../utils/httpErrors';
import { signAccessToken } from '../utils/jwt';
import { generateRefreshToken, hashRefreshToken } from '../utils/refreshToken';

import { createUser, getUserByEmail, getUserById } from '../db/repos/usersRepo';
import { getOrgForUserById, getOrgForUserBySlug, listOrgsForUser } from '../db/repos/orgsRepo';
import { getPermissionsForUserOrg } from '../db/repos/rbacRepo';
import {
  createRefreshToken as dbCreateRefreshToken,
  findActiveRefreshTokenByHash,
  revokeRefreshToken,
  rotateRefreshToken
} from '../db/repos/refreshTokensRepo';

// PUBLIC_INTERFACE
export const authRouter = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Authentication & session management
 */

authRouter.use(cookieParser());

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1).max(200).optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  orgSlug: z.string().min(1).optional()
});

const switchOrgSchema = z.object({
  orgId: z.string().uuid()
});

function refreshCookieOptions(req: express.Request) {
  const isSecure = req.secure || (req.header('x-forwarded-proto') || '').includes('https');
  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax' as const,
    domain: env.cookieDomain,
    path: '/',
    maxAge: env.refreshTokenTtlDays * 24 * 60 * 60 * 1000
  };
}

function extractRefreshToken(req: express.Request): string | null {
  const fromCookie = (req.cookies?.crm_refresh_token as string | undefined) || undefined;
  if (fromCookie) return fromCookie;

  // Allow body-based refresh token for non-browser clients.
  const fromBody = (req.body?.refreshToken as string | undefined) || undefined;
  if (fromBody) return fromBody;

  return null;
}

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user (dev-friendly)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               fullName: { type: string }
 *     responses:
 *       201:
 *         description: User created
 */
authRouter.post('/register', validateBody(registerSchema), async (req, res, next) => {
  try {
    const { email, password, fullName } = req.body as z.infer<typeof registerSchema>;
    const existing = await getUserByEmail(email);
    if (existing) {
      throw conflict('EMAIL_IN_USE', 'Email is already registered');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser({ email, passwordHash, fullName });

    return res.status(201).json({
      status: 'ok',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        isActive: user.is_active,
        isSuperAdmin: user.is_super_admin
      }
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login with email/password and receive access+refresh tokens
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *               orgSlug: { type: string, description: "Optional org slug to select tenant context" }
 *     responses:
 *       200:
 *         description: Tokens issued
 */
authRouter.post('/login', validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password, orgSlug } = req.body as z.infer<typeof loginSchema>;

    const user = await getUserByEmail(email);
    if (!user || !user.is_active) {
      throw unauthorized('INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      throw unauthorized('INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const org =
      orgSlug ? await getOrgForUserBySlug(user.id, orgSlug) : (await listOrgsForUser(user.id))[0] || null;

    if (!org) {
      throw badRequest('NO_ORG', 'User is not a member of any active organization');
    }

    const permissions = await getPermissionsForUserOrg(user.id, org.id);

    const ctx = {
      userId: user.id,
      orgId: org.id,
      permissions,
      isSuperAdmin: user.is_super_admin
    };

    const { token: accessToken, expiresInSeconds } = signAccessToken(ctx);

    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashRefreshToken(refreshToken);
    const expiresAt = new Date(Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000);

    const ipAddress = req.ip;
    const userAgent = req.header('user-agent') || undefined;

    await dbCreateRefreshToken({
      orgId: org.id,
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt,
      ipAddress,
      userAgent
    });

    res.cookie('crm_refresh_token', refreshToken, refreshCookieOptions(req));

    return res.status(200).json({
      status: 'ok',
      accessToken,
      accessTokenExpiresIn: expiresInSeconds,
      org,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        isSuperAdmin: user.is_super_admin
      },
      permissions
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Rotate refresh token and issue a new access token
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: New tokens issued
 */
authRouter.post('/refresh', async (req, res, next) => {
  try {
    const raw = extractRefreshToken(req);
    if (!raw) {
      throw unauthorized('REFRESH_REQUIRED', 'Missing refresh token');
    }

    const tokenHash = hashRefreshToken(raw);
    const active = await findActiveRefreshTokenByHash(tokenHash);
    if (!active) {
      throw unauthorized('INVALID_REFRESH', 'Invalid or expired refresh token');
    }

    const user = await getUserById(active.user_id);
    if (!user || !user.is_active) {
      throw unauthorized('INVALID_REFRESH', 'Invalid refresh token context');
    }

    const org = await getOrgForUserById(user.id, active.org_id);
    if (!org) {
      throw unauthorized('INVALID_REFRESH', 'User no longer has access to this organization');
    }

    const permissions = await getPermissionsForUserOrg(user.id, org.id);

    // Rotate refresh token
    const newRefreshToken = generateRefreshToken();
    const newHash = hashRefreshToken(newRefreshToken);
    const newExpiresAt = new Date(Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000);

    const inserted = await dbCreateRefreshToken({
      orgId: org.id,
      userId: user.id,
      tokenHash: newHash,
      expiresAt: newExpiresAt,
      ipAddress: req.ip,
      userAgent: req.header('user-agent') || undefined
    });

    await rotateRefreshToken({ oldTokenId: active.id, newTokenId: inserted.id });

    const ctx = {
      userId: user.id,
      orgId: org.id,
      permissions,
      isSuperAdmin: user.is_super_admin
    };

    const { token: accessToken, expiresInSeconds } = signAccessToken(ctx);

    res.cookie('crm_refresh_token', newRefreshToken, refreshCookieOptions(req));

    return res.status(200).json({
      status: 'ok',
      accessToken,
      accessTokenExpiresIn: expiresInSeconds,
      org,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        isSuperAdmin: user.is_super_admin
      },
      permissions
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout (revoke refresh token)
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logged out
 */
authRouter.post('/logout', async (req, res, next) => {
  try {
    const raw = extractRefreshToken(req);
    if (raw) {
      const tokenHash = hashRefreshToken(raw);
      const active = await findActiveRefreshTokenByHash(tokenHash);
      if (active) {
        await revokeRefreshToken({ tokenId: active.id });
      }
    }

    res.clearCookie('crm_refresh_token', { domain: env.cookieDomain, path: '/' });

    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    return next(err);
  }
});

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current user and org context
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current session info
 */
authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) throw unauthorized('AUTH_REQUIRED', 'Authentication required');

    const user = await getUserById(req.auth.userId);
    if (!user) throw unauthorized('AUTH_REQUIRED', 'Authentication required');

    const org = await getOrgForUserById(user.id, req.auth.orgId);
    if (!org) throw unauthorized('AUTH_REQUIRED', 'Organization context invalid');

    return res.status(200).json({
      status: 'ok',
      user: { id: user.id, email: user.email, fullName: user.full_name, isSuperAdmin: user.is_super_admin },
      org,
      permissions: req.auth.permissions
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * @swagger
 * /api/v1/auth/switch-org:
 *   post:
 *     summary: Switch active org context (issues a new access token)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orgId]
 *             properties:
 *               orgId: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: New access token issued for selected org
 */
authRouter.post('/switch-org', requireAuth, validateBody(switchOrgSchema), async (req, res, next) => {
  try {
    if (!req.auth) throw unauthorized('AUTH_REQUIRED', 'Authentication required');

    const { orgId } = req.body as z.infer<typeof switchOrgSchema>;

    const org = await getOrgForUserById(req.auth.userId, orgId);
    if (!org) throw unauthorized('ORG_ACCESS_DENIED', 'No access to requested organization');

    const user = await getUserById(req.auth.userId);
    if (!user) throw unauthorized('AUTH_REQUIRED', 'Authentication required');

    const permissions = await getPermissionsForUserOrg(req.auth.userId, org.id);
    const ctx = {
      userId: req.auth.userId,
      orgId: org.id,
      permissions,
      isSuperAdmin: user.is_super_admin
    };

    const { token: accessToken, expiresInSeconds } = signAccessToken(ctx);

    return res.status(200).json({
      status: 'ok',
      accessToken,
      accessTokenExpiresIn: expiresInSeconds,
      org,
      permissions
    });
  } catch (err) {
    return next(err);
  }
});
