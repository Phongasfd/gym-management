import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';

const server = createApp().listen(env.port, () => {
  logger.info(`Server is running on port ${env.port}`, { type: 'STARTUP', bookingStrategy: env.bookingStrategy });
});

// Graceful shutdown: stop accepting connections, let in-flight requests finish, then close the pool.
function shutdown(signal: string) {
  logger.info('Shutting down', { type: 'SHUTDOWN', signal });
  server.close(() => {
    prisma.$disconnect().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
