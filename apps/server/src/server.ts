import { getEnv } from './config/env';
import { connectDatabase } from './config/db';
import { createApp } from './app';
import { logger } from './middleware/logger';
import { bootstrapAdminUser } from './seed/seedData';

async function bootstrap(): Promise<void> {
  // Validate environment variables at startup (throws clearly if invalid)
  const env = getEnv();

  // Connect to MongoDB (exits if connection fails)
  await connectDatabase();

  // Ensure predefined administrator is configured
  await bootstrapAdminUser();

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    logger.info('FixMe API Server started', {
      port: env.PORT,
      environment: env.NODE_ENV,
      clientUrl: env.CLIENT_URL,
      adminUrl: env.ADMIN_URL,
    });
  });

  const shutdown = (signal: string) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error('Fatal server startup error', {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});

