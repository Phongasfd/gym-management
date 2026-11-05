import './config/env';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { configurePassport } from './config/passport';
import { AppError } from './lib/AppError';
import { buildOpenApiDocument } from './lib/openapi';
import { prisma } from './lib/prisma';
import { doubleCsrfProtection } from './middleware/csrf';
import { errorHandler } from './middleware/errorHandler';
import { globalLimiter } from './middleware/rateLimit';
import { requestLogger } from './middleware/requestLogger';
import { apiRouter } from './routes';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  // Postgres BIGINT columns come back as BigInt, which JSON.stringify cannot handle.
  app.set('json replacer', (_key: string, value: unknown) => (typeof value === 'bigint' ? value.toString() : value));
  // One proxy (Nginx) in front: req.ip is the client from X-Forwarded-For, which Nginx overwrites.
  app.set('trust proxy', 1);

  app.use(requestLogger);
  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigins,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      credentials: true,
      exposedHeaders: ['X-Request-Id'],
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(configurePassport().initialize());

  // Liveness/readiness for the load balancer and docker compose.
  app.get('/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ok' });
    } catch {
      res.status(503).json({ status: 'database unavailable' });
    }
  });
  app.get('/', (_req, res) => {
    res.send('Gym Management System Backend is running');
  });

  const openApi = buildOpenApiDocument();
  app.get('/api-docs.json', (_req, res) => {
    res.json(openApi);
  });
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApi));

  // CSRF on every state-changing request; GET/HEAD/OPTIONS are not checked.
  app.use(doubleCsrfProtection);
  app.use(globalLimiter);

  app.get('/api', (_req, res) => {
    res.json({ message: 'API is running' });
  });
  app.use(apiRouter);

  app.use((req, _res, next) => next(new AppError(`Not found: ${req.method} ${req.path}`, 404)));
  app.use(errorHandler);
  return app;
}
