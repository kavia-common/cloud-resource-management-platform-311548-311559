import express from 'express';
import { z } from 'zod';

import { requireAuth } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { validateQuery } from '../middleware/validate';
import { listRecommendations } from '../db/repos/recommendationsRepo';

// PUBLIC_INTERFACE
export const recommendationsRouter = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Recommendations
 *     description: Optimization recommendations (org-scoped)
 */

const listQuerySchema = z.object({
  status: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});

/**
 * @swagger
 * /api/v1/recommendations:
 *   get:
 *     summary: List recommendations in the active org
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recommendation list
 */
recommendationsRouter.get(
  '/',
  requireAuth,
  requirePermission('recommendations:read'),
  validateQuery(listQuerySchema),
  async (req, res, next) => {
    try {
      const q = req.query as any as z.infer<typeof listQuerySchema>;
      const rows = await listRecommendations({
        orgId: req.auth!.orgId,
        status: q.status,
        limit: q.limit,
        offset: q.offset
      });

      const items = rows.map((r) => ({
        id: r.id,
        resourceId: r.resource_id,
        recommendationType: r.recommendation_type,
        severity: r.severity,
        title: r.title,
        description: r.description,
        status: r.status,
        potentialSavings: r.potential_savings,
        currency: r.currency,
        metadata: r.metadata,
        createdAt: r.created_at
      }));

      return res.status(200).json({ status: 'ok', items });
    } catch (err) {
      return next(err);
    }
  }
);
