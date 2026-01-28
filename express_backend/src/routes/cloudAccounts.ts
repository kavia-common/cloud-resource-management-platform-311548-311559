import express from 'express';
import { z } from 'zod';

import { requireAuth } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { validateBody, validateParams } from '../middleware/validate';
import {
  createCloudAccount,
  deleteCloudAccount,
  getCloudAccountById,
  listCloudAccounts,
  updateCloudAccount
} from '../db/repos/cloudAccountsRepo';
import { createAuditLog } from '../db/repos/auditLogsRepo';
import { notFound } from '../utils/httpErrors';

// PUBLIC_INTERFACE
export const cloudAccountsRouter = express.Router();

/**
 * @swagger
 * tags:
 *   - name: CloudAccounts
 *     description: Cloud account management (org-scoped)
 */

const idParamsSchema = z.object({
  id: z.string().uuid()
});

const createSchema = z.object({
  provider: z.enum(['aws', 'azure', 'gcp']),
  name: z.string().min(1),
  externalId: z.string().min(1),
  metadata: z.record(z.unknown()).optional()
});

const patchSchema = z
  .object({
    name: z.string().min(1).optional(),
    status: z.enum(['active', 'disabled', 'error']).optional(),
    metadata: z.record(z.unknown()).optional()
  })
  .refine((v) => v.name !== undefined || v.status !== undefined || v.metadata !== undefined, {
    message: 'At least one field must be provided'
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
 *
 * /api/v1/accounts:
 *   get:
 *     summary: List cloud accounts in the active org (alias of /api/v1/cloud-accounts)
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
 * /api/v1/cloud-accounts/{id}:
 *   get:
 *     summary: Get a cloud account by id in the active org
 *     tags: [CloudAccounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Cloud account
 *       404:
 *         description: Not found
 *
 * /api/v1/accounts/{id}:
 *   get:
 *     summary: Get a cloud account by id in the active org (alias of /api/v1/cloud-accounts/{id})
 *     tags: [CloudAccounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Cloud account
 *       404:
 *         description: Not found
 */
cloudAccountsRouter.get(
  '/:id',
  requireAuth,
  requirePermission('cloud_accounts:read'),
  validateParams(idParamsSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params as any as z.infer<typeof idParamsSchema>;
      const row = await getCloudAccountById({ orgId: req.auth!.orgId, id });
      if (!row) throw notFound('CLOUD_ACCOUNT_NOT_FOUND', 'Cloud account not found');

      return res.status(200).json({
        status: 'ok',
        item: {
          id: row.id,
          provider: row.provider,
          name: row.name,
          externalId: row.external_id,
          status: row.status,
          metadata: row.metadata,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }
      });
    } catch (err) {
      return next(err);
    }
  }
);

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
 *
 * /api/v1/accounts:
 *   post:
 *     summary: Create a cloud account in the active org (alias of /api/v1/cloud-accounts)
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

      await createAuditLog({
        orgId: req.auth!.orgId,
        actorUserId: req.auth!.userId,
        action: 'cloud_account:create',
        entityType: 'cloud_account',
        entityId: created.id,
        ipAddress: req.ip,
        userAgent: req.header('user-agent') || null,
        metadata: { provider: created.provider, externalId: created.external_id }
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

/**
 * @swagger
 * /api/v1/cloud-accounts/{id}:
 *   patch:
 *     summary: Update a cloud account in the active org
 *     tags: [CloudAccounts]
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
 *             properties:
 *               name: { type: string }
 *               status: { type: string, enum: [active, disabled, error] }
 *               metadata: { type: object }
 *     responses:
 *       200:
 *         description: Updated
 *       404:
 *         description: Not found
 *
 * /api/v1/accounts/{id}:
 *   patch:
 *     summary: Update a cloud account in the active org (alias of /api/v1/cloud-accounts/{id})
 *     tags: [CloudAccounts]
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
 *             properties:
 *               name: { type: string }
 *               status: { type: string, enum: [active, disabled, error] }
 *               metadata: { type: object }
 *     responses:
 *       200:
 *         description: Updated
 *       404:
 *         description: Not found
 */
cloudAccountsRouter.patch(
  '/:id',
  requireAuth,
  requirePermission('cloud_accounts:write'),
  validateParams(idParamsSchema),
  validateBody(patchSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params as any as z.infer<typeof idParamsSchema>;
      const body = req.body as z.infer<typeof patchSchema>;

      const updated = await updateCloudAccount({
        orgId: req.auth!.orgId,
        id,
        name: body.name,
        status: body.status,
        metadata: body.metadata
      });

      if (!updated) throw notFound('CLOUD_ACCOUNT_NOT_FOUND', 'Cloud account not found');

      await createAuditLog({
        orgId: req.auth!.orgId,
        actorUserId: req.auth!.userId,
        action: 'cloud_account:update',
        entityType: 'cloud_account',
        entityId: updated.id,
        ipAddress: req.ip,
        userAgent: req.header('user-agent') || null,
        metadata: { changed: Object.keys(body) }
      });

      return res.status(200).json({
        status: 'ok',
        item: {
          id: updated.id,
          provider: updated.provider,
          name: updated.name,
          externalId: updated.external_id,
          status: updated.status,
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

/**
 * @swagger
 * /api/v1/cloud-accounts/{id}:
 *   delete:
 *     summary: Delete a cloud account in the active org
 *     tags: [CloudAccounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Deleted
 *       404:
 *         description: Not found
 *
 * /api/v1/accounts/{id}:
 *   delete:
 *     summary: Delete a cloud account in the active org (alias of /api/v1/cloud-accounts/{id})
 *     tags: [CloudAccounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Deleted
 *       404:
 *         description: Not found
 */
cloudAccountsRouter.delete(
  '/:id',
  requireAuth,
  requirePermission('cloud_accounts:write'),
  validateParams(idParamsSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params as any as z.infer<typeof idParamsSchema>;

      const existing = await getCloudAccountById({ orgId: req.auth!.orgId, id });
      if (!existing) throw notFound('CLOUD_ACCOUNT_NOT_FOUND', 'Cloud account not found');

      const ok = await deleteCloudAccount({ orgId: req.auth!.orgId, id });
      if (!ok) throw notFound('CLOUD_ACCOUNT_NOT_FOUND', 'Cloud account not found');

      await createAuditLog({
        orgId: req.auth!.orgId,
        actorUserId: req.auth!.userId,
        action: 'cloud_account:delete',
        entityType: 'cloud_account',
        entityId: id,
        ipAddress: req.ip,
        userAgent: req.header('user-agent') || null,
        metadata: { provider: existing.provider, externalId: existing.external_id }
      });

      return res.status(200).json({ status: 'ok' });
    } catch (err) {
      return next(err);
    }
  }
);
