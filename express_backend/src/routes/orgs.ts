import express from 'express';
import { requireAuth } from '../middleware/auth';
import { listOrgsForUser } from '../db/repos/orgsRepo';

// PUBLIC_INTERFACE
export const orgsRouter = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Orgs
 *     description: Organization membership & tenant context
 */

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
 */
orgsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const orgs = await listOrgsForUser(req.auth!.userId);
    return res.status(200).json({ status: 'ok', orgs });
  } catch (err) {
    return next(err);
  }
});
