import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { validateParams } from '../middleware/validate';
import { getOrgForUserById, listOrgsForUser } from '../db/repos/orgsRepo';
import { notFound } from '../utils/httpErrors';

// PUBLIC_INTERFACE
export const orgsRouter = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Orgs
 *     description: Organization membership & tenant context
 */

const orgIdParamsSchema = z.object({
  orgId: z.string().uuid()
});

/**
 * @swagger
 * /api/v1/orgs:
 *   get:
 *     summary: List organizations the current user belongs to
 *     tags: [Orgs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Orgs list
 *
 * /api/v1/organizations:
 *   get:
 *     summary: List organizations the current user belongs to (alias of /api/v1/orgs)
 *     tags: [Orgs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Orgs list
 */
orgsRouter.get('/', requireAuth, requirePermission('org:read'), async (req, res, next) => {
  try {
    const orgs = await listOrgsForUser(req.auth!.userId);
    return res.status(200).json({ status: 'ok', orgs });
  } catch (err) {
    return next(err);
  }
});

/**
 * @swagger
 * /api/v1/orgs/{orgId}:
 *   get:
 *     summary: Get an organization by id (only if user is an active member)
 *     tags: [Orgs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Org
 *       404:
 *         description: Not found
 *
 * /api/v1/organizations/{orgId}:
 *   get:
 *     summary: Get an organization by id (alias of /api/v1/orgs/{orgId})
 *     tags: [Orgs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Org
 *       404:
 *         description: Not found
 */
orgsRouter.get(
  '/:orgId',
  requireAuth,
  requirePermission('org:read'),
  validateParams(orgIdParamsSchema),
  async (req, res, next) => {
    try {
      const { orgId } = req.params as any as z.infer<typeof orgIdParamsSchema>;
      const org = await getOrgForUserById(req.auth!.userId, orgId);
      if (!org) throw notFound('ORG_NOT_FOUND', 'Organization not found');
      return res.status(200).json({ status: 'ok', org });
    } catch (err) {
      return next(err);
    }
  }
);
