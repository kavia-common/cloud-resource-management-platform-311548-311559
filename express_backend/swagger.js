const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Cloud Resource Manager API',
      version: '1.0.0',
      description:
        'Backend API for the Cloud Resource Manager (auth, org isolation, RBAC, and core resource/cost endpoints).'
    },
    tags: [
      { name: 'Health', description: 'Health and status endpoints' },
      { name: 'Auth', description: 'Authentication & session management' },
      { name: 'Orgs', description: 'Organization membership & tenant context' },
      { name: 'CloudAccounts', description: 'Cloud account management (org-scoped)' },
      { name: 'Resources', description: 'Resource discovery and browsing (org-scoped)' },
      { name: 'Costs', description: 'Cost analytics (org-scoped)' },
      { name: 'Recommendations', description: 'Optimization recommendations (org-scoped)' },
      { name: 'AuditLogs', description: 'Audit logs (org-scoped)' },
      { name: 'Debug', description: 'Development-only debug endpoints' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token returned by POST /api/v1/auth/login'
        }
      }
    }
  },
  // Scan TS route files for @swagger blocks
  apis: ['./src/routes/**/*.ts']
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;
