import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';

import { env } from './utils/env';
import { routes } from './routes';
import { errorHandler } from './middleware/errorHandler';

// swagger.js is CommonJS; with esModuleInterop it imports as default.
import swaggerSpec from '../swagger';

// PUBLIC_INTERFACE
export function createApp(): express.Express {
  /** Create and configure the Express app instance. */
  const app = express();

  app.disable('x-powered-by');

  if (env.trustProxy) {
    app.set('trust proxy', true);
  }

  app.use(helmet());

  app.use(
    rateLimit({
      windowMs: env.rateLimitWindowMs,
      max: env.rateLimitMax,
      standardHeaders: true,
      legacyHeaders: false
    })
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow non-browser clients (no Origin header) and allow "*" in config.
        if (!origin) return callback(null, true);
        if (env.allowedOrigins.includes('*')) return callback(null, true);
        if (env.allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
      },
      methods: env.allowedMethods,
      allowedHeaders: env.allowedHeaders,
      maxAge: env.corsMaxAge,
      credentials: true
    })
  );

  app.use(express.json({ limit: '1mb' }));

  // Swagger UI with dynamic server URL
  app.use('/docs', swaggerUi.serve, (req: Request, res: Response, next: NextFunction) => {
    const host = req.get('host');
    const actualPort = req.socket.localPort;

    let protocol = req.secure ? 'https' : req.protocol;
    const hasPort = host?.includes(':') ?? false;
    const needsPort =
      !hasPort &&
      ((protocol === 'http' && actualPort !== 80) || (protocol === 'https' && actualPort !== 443));

    const fullHost = needsPort && host ? `${host}:${actualPort}` : host;

    const dynamicSpec = {
      ...swaggerSpec,
      servers: [{ url: `${protocol}://${fullHost}` }]
    };

    return swaggerUi.setup(dynamicSpec)(req, res, next);
  });

  app.get('/openapi.json', (req: Request, res: Response) => {
    const host = req.get('host');
    const actualPort = req.socket.localPort;

    let protocol = req.secure ? 'https' : req.protocol;
    const hasPort = host?.includes(':') ?? false;
    const needsPort =
      !hasPort &&
      ((protocol === 'http' && actualPort !== 80) || (protocol === 'https' && actualPort !== 443));

    const fullHost = needsPort && host ? `${host}:${actualPort}` : host;

    const dynamicSpec = {
      ...swaggerSpec,
      servers: [{ url: `${protocol}://${fullHost}` }]
    };

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(dynamicSpec);
  });

  app.use('/', routes);

  app.use(errorHandler);

  return app;
}
