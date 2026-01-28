import express from 'express';
import { z } from 'zod';

import { requireAuth } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { validateQuery } from '../middleware/validate';
import { listAuditLogs } from '../db/repos/auditLogsRepo';

// PUBLIC_INTERFACE
export const auditLogsRouter = express.Router();

/**
 * @swagger
 * tags:
 *   - name: AuditLogs
 *     description: Audit logs (org-scoped)
 */

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});

/**
 * @swagger
 * /api/v1/audit-logs:
 *   get:
 *     summary: List audit logs for the active org
 *     tags: [AuditLogs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Audit logs
 */
auditLogsRouter.get('/', requireAuth, requirePermission('audit:read'), validateQuery(listQuerySchema), async (req, res, next) => {
  try {
    const q = req.query as any as z.infer<typeof listQuerySchema>;
    const rows = await listAuditLogs({ orgId: req.auth!.orgId, limit: q.limit, offset: q.offset });
    return res.status(200).json({ status: 'ok', items: rows });
  } catch (err) {
    return next(err);
  }
});
