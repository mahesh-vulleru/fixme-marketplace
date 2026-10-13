import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { requestIdMiddleware } from './middleware/requestId';
import { requestLoggerMiddleware } from './middleware/logger';
import { apiRateLimiter } from './middleware/rateLimit';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import healthRoutes from './routes/healthRoutes';
import catalogueRoutes from './routes/catalogueRoutes';
import assetRoutes from './routes/assetRoutes';
import authRoutes from './routes/authRoutes';
import commerceRoutes from './routes/commerceRoutes';
import sellerTrustRoutes from './routes/sellerTrustRoutes';

export function createApp(): Express {
  const app = express();

  // Security headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // Strict origin allowlist CORS (never '*')
  const allowedOrigins = new Set([env.CLIENT_URL, env.ADMIN_URL]);
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.has(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed by CORS policy`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id'],
    })
  );

  // Request tracking and structured logging
  app.use(requestIdMiddleware);
  app.use(requestLoggerMiddleware);

  // Body & cookie parsing with safe size limits
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser(env.SESSION_SECRET));

  // Global API rate limiting
  app.use('/api/v1', apiRateLimiter);

  // API v1 Routes
  app.use('/api/v1/health', healthRoutes);
  app.use('/api/v1/assets', assetRoutes);
  app.use('/api/v1', authRoutes);
  app.use('/api/v1', catalogueRoutes);
  app.use('/api/v1', commerceRoutes);
  app.use('/api/v1', sellerTrustRoutes);

  // 404 & Central Error Handler
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

