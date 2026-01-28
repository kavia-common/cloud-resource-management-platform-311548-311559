import express from 'express';
import { authRouter } from './auth';
import { orgsRouter } from './orgs';
import { cloudAccountsRouter } from './cloudAccounts';
import { resourcesRouter } from './resources';
import { costsRouter } from './costs';
import { recommendationsRouter } from './recommendations';
import { auditLogsRouter } from './auditLogs';
import { getDbConnectionStringInUse } from '../db/pool';

// PUBLIC_INTERFACE
export const routes = express.Router();

/**
 * @swagger
 * /:
 *   get:
 *     summary: Health endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service health check passed
 */
routes.get('/', (_req, res) => {
  return res.status(200).json({
    status: 'ok',
    message: 'Service is healthy',
    timestamp: new Date().toISOString()
  });
});

/**
 * @swagger
 * /healthz:
 *   get:
 *     summary: Healthcheck endpoint (preferred)
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Healthcheck passed
 */
routes.get('/healthz', (_req, res) => {
  return res.status(200).json({
    status: 'ok',
    message: 'Service is healthy',
    timestamp: new Date().toISOString()
  });
});

/**
 * @swagger
 * /debug/db:
 *   get:
 *     summary: Debug DB connection (development only)
 *     tags: [Debug]
 *     responses:
 *       200:
 *         description: DB connection string (sanitized)
 */
routes.get('/debug/db', (_req, res) => {
  const conn = getDbConnectionStringInUse() || '';
  // Avoid leaking password
  const sanitized = conn.replace(/:\/\/([^:]+):([^@]+)@/g, '://$1:***@');
  return res.status(200).json({ status: 'ok', connection: sanitized });
});

routes.use('/api/v1/auth', authRouter);

// Organization endpoints
routes.use('/api/v1/orgs', orgsRouter);
// Alias for requested naming
routes.use('/api/v1/organizations', orgsRouter);

// Cloud accounts endpoints
routes.use('/api/v1/cloud-accounts', cloudAccountsRouter);
// Alias for requested naming
routes.use('/api/v1/accounts', cloudAccountsRouter);

routes.use('/api/v1/resources', resourcesRouter);
routes.use('/api/v1/costs', costsRouter);
routes.use('/api/v1/recommendations', recommendationsRouter);
routes.use('/api/v1/audit-logs', auditLogsRouter);
