import express from 'express';
import { z } from 'zod';

import { requireAuth } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { validateBody, validateParams, validateQuery } from '../middleware/validate';
import { createAuditLog } from '../db/repos/auditLogsRepo';
import { listRecommendations, updateRecommendationStatus } from '../db/repos/recommendationsRepo';
import { notFound } from '../utils/httpErrors';

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

const idParamsSchema = z.object({
  id: z.string().uuid()
});

const patchSchema = z.object({
  status: z.enum(['open', 'snoozed', 'applied', 'dismissed'])
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

/**
 * @swagger
 * /api/v1/recommendations/{id}:
 *   patch:
 *     summary: Update recommendation status (snooze/apply/dismiss/open) in the active org
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [open, snoozed, applied, dismissed] }
 *     responses:
 *       200:
 *         description: Updated
 *       404:
 *         description: Not found
 */
recommendationsRouter.patch(
  '/:id',
  requireAuth,
  // Using org:write because seed permissions do not currently define recommendations:write.
  requirePermission('org:write'),
  validateParams(idParamsSchema),
  validateBody(patchSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params as any as z.infer<typeof idParamsSchema>;
      const body = req.body as z.infer<typeof patchSchema>;

      const updated = await updateRecommendationStatus({ orgId: req.auth!.orgId, id, status: body.status });
      if (!updated) throw notFound('RECOMMENDATION_NOT_FOUND', 'Recommendation not found');

      await createAuditLog({
        orgId: req.auth!.orgId,
        actorUserId: req.auth!.userId,
        action: 'recommendation:update_status',
        entityType: 'recommendation',
        entityId: updated.id,
        ipAddress: req.ip,
        userAgent: req.header('user-agent') || null,
        metadata: { status: updated.status }
      });

      return res.status(200).json({
        status: 'ok',
        item: {
          id: updated.id,
          resourceId: updated.resource_id,
          recommendationType: updated.recommendation_type,
          severity: updated.severity,
          title: updated.title,
          description: updated.description,
          status: updated.status,
          potentialSavings: updated.potential_savings,
          currency: updated.currency,
          metadata: updated.metadata,
          createdAt: updated.created_at,
          updatedAt: updated.updated_at
        }
      });
    } catch (err) {
      return next(err);
    }
  }
);
