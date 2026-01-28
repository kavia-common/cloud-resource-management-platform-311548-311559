import express from 'express';
import { z } from 'zod';

import { requireAuth } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import { createCloudAccount, listCloudAccounts } from '../db/repos/cloudAccountsRepo';

// PUBLIC_INTERFACE
export const cloudAccountsRouter = express.Router();

/**
 * @swagger
 * tags:
 *   - name: CloudAccounts
 *     description: Cloud account management (org-scoped)
 */

const createSchema = z.object({
  provider: z.enum(['aws', 'azure', 'gcp']),
  name: z.string().min(1),
  externalId: z.string().min(1),
  metadata: z.record(z.unknown()).optional()
});

/**
 * @swagger
 * /api/v1/cloud-accounts:
 *   get:
 *     summary: List cloud accounts in the active org
 *     tags: [CloudAccounts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cloud accounts
 */
cloudAccountsRouter.get('/', requireAuth, requirePermission('cloud_accounts:read'), async (req, res, next) => {
  try {
    const rows = await listCloudAccounts(req.auth!.orgId);
    const items = rows.map((r) => ({
      id: r.id,
      provider: r.provider,
      name: r.name,
      externalId: r.external_id,
      status: r.status,
      metadata: r.metadata,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));

    return res.status(200).json({ status: 'ok', items });
  } catch (err) {
    return next(err);
  }
});

/**
 * @swagger
 * /api/v1/cloud-accounts:
 *   post:
 *     summary: Create a cloud account in the active org
 *     tags: [CloudAccounts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [provider, name, externalId]
 *             properties:
 *               provider: { type: string, enum: [aws, azure, gcp] }
 *               name: { type: string }
 *               externalId: { type: string }
 *               metadata: { type: object }
 *     responses:
 *       201:
 *         description: Created
 */
cloudAccountsRouter.post(
  '/',
  requireAuth,
  requirePermission('cloud_accounts:write'),
  validateBody(createSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof createSchema>;
      const created = await createCloudAccount({
        orgId: req.auth!.orgId,
        provider: body.provider,
        name: body.name,
        externalId: body.externalId,
        metadata: body.metadata
      });

      return res.status(201).json({
        status: 'ok',
        item: {
          id: created.id,
          provider: created.provider,
          name: created.name,
          externalId: created.external_id,
          status: created.status,
          metadata: created.metadata,
          createdAt: created.created_at,
          updatedAt: created.updated_at
        }
      });
    } catch (err) {
      return next(err);
    }
  }
);
