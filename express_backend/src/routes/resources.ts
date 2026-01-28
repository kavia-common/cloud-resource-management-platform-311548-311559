import express from 'express';
import { z } from 'zod';

import { requireAuth } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { validateQuery } from '../middleware/validate';
import { listResources } from '../db/repos/resourcesRepo';

// PUBLIC_INTERFACE
export const resourcesRouter = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Resources
 *     description: Resource discovery and browsing (org-scoped)
 */

const listQuerySchema = z.object({
  provider: z.enum(['aws', 'azure', 'gcp']).optional(),
  cloudAccountId: z.string().uuid().optional(),
  resourceType: z.string().min(1).optional(),
  q: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});

/**
 * @swagger
 * /api/v1/resources:
 *   get:
 *     summary: List resources in the active org
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: provider
 *         schema: { type: string, enum: [aws, azure, gcp] }
 *       - in: query
 *         name: cloudAccountId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: resourceType
 *         schema: { type: string }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: Resource list
 */
resourcesRouter.get('/', requireAuth, requirePermission('resources:read'), validateQuery(listQuerySchema), async (req, res, next) => {
  try {
    const q = req.query as any as z.infer<typeof listQuerySchema>;
    const rows = await listResources({
      orgId: req.auth!.orgId,
      provider: q.provider,
      cloudAccountId: q.cloudAccountId,
      resourceType: q.resourceType,
      q: q.q,
      limit: q.limit,
      offset: q.offset
    });

    const items = rows.map((r) => ({
      id: r.id,
      cloudAccountId: r.cloud_account_id,
      provider: r.provider,
      resourceType: r.resource_type,
      providerResourceId: r.provider_resource_id,
      region: r.region,
      name: r.name,
      tags: r.tags,
      metadata: r.metadata,
      discoveredAt: r.discovered_at
    }));

    return res.status(200).json({ status: 'ok', items });
  } catch (err) {
    return next(err);
  }
});
