import express from 'express';
import { z } from 'zod';

import { requireAuth } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { validateQuery } from '../middleware/validate';
import { getCostSummary, getDailyCosts } from '../db/repos/costsRepo';

// PUBLIC_INTERFACE
export const costsRouter = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Costs
 *     description: Cost analytics (org-scoped)
 */

const rangeQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

/**
 * @swagger
 * /api/v1/costs/summary:
 *   get:
 *     summary: Get total cost for the active org within a date range
 *     tags: [Costs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, example: "2025-01-01" }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, example: "2025-01-31" }
 *     responses:
 *       200:
 *         description: Summary
 */
costsRouter.get('/summary', requireAuth, requirePermission('costs:read'), validateQuery(rangeQuerySchema), async (req, res, next) => {
  try {
    const q = req.query as any as z.infer<typeof rangeQuerySchema>;
    const summary = await getCostSummary({ orgId: req.auth!.orgId, startDate: q.startDate, endDate: q.endDate });
    return res.status(200).json({ status: 'ok', summary });
  } catch (err) {
    return next(err);
  }
});

/**
 * @swagger
 * /api/v1/costs/daily:
 *   get:
 *     summary: Get daily cost series for the active org within a date range
 *     tags: [Costs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Daily costs
 */
costsRouter.get('/daily', requireAuth, requirePermission('costs:read'), validateQuery(rangeQuerySchema), async (req, res, next) => {
  try {
    const q = req.query as any as z.infer<typeof rangeQuerySchema>;
    const series = await getDailyCosts({ orgId: req.auth!.orgId, startDate: q.startDate, endDate: q.endDate });
    return res.status(200).json({ status: 'ok', series });
  } catch (err) {
    return next(err);
  }
});
