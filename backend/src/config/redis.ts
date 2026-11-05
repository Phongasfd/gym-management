import { createClient } from 'redis';
import { logger } from '../lib/logger';
import { env } from './env';

export type RedisClient = ReturnType<typeof createClient>;

let client: RedisClient | undefined;

// Redis is optional: without REDIS_URL the rate limiter keeps its counters in memory.
export function getRedis(): RedisClient | undefined {
  if (!env.redisUrl) return undefined;
  if (!client) {
    client = createClient({ url: env.redisUrl });
    client.on('error', (err: Error) => logger.error('Redis error', { type: 'REDIS', error: err.message }));
    client.connect().catch((err: Error) => logger.error('Redis connect failed', { type: 'REDIS', error: err.message }));
  }
  return client;
}
