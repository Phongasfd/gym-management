import type { NextFunction, Request, RequestHandler, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { RedisStore, type RedisReply } from 'rate-limit-redis';
import { env } from '../config/env';
import { getRedis, type RedisClient } from '../config/redis';
import { logger } from '../lib/logger';

const passThrough: RequestHandler = (_req: Request, _res: Response, next: NextFunction) => next();

// The limiter sits in front of every /api request, so Redis must never make a request wait long.
const REDIS_COMMAND_TIMEOUT_MS = 1000;

class RedisUnavailableError extends Error {}

// What the store needs from a Redis client; narrow so tests can pass a fake.
export type RateLimitRedis = Pick<RedisClient, 'isReady' | 'sendCommand'>;

// While Redis is down or reconnecting, node-redis queues commands with no time limit, and every
// /api request used to hang behind the limiter. Refuse instead (and cap a command that never
// answers); with passOnStoreError the request then goes through without rate limiting.
function sendCommand(redis: RateLimitRedis, args: string[]): Promise<RedisReply> {
  if (!redis.isReady) return Promise.reject(new RedisUnavailableError('Redis is not connected'));
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new RedisUnavailableError(`Redis did not answer within ${REDIS_COMMAND_TIMEOUT_MS} ms`)),
      REDIS_COMMAND_TIMEOUT_MS,
    );
  });
  return Promise.race([redis.sendCommand(args) as Promise<RedisReply>, timeout]).finally(() => clearTimeout(timer));
}

function redisStore(redis: RateLimitRedis, prefix: string): RedisStore {
  const store = new RedisStore({
    prefix: `rl:${prefix}:`,
    sendCommand: (...args: string[]) => sendCommand(redis, args),
  });
  // The store loads its Lua scripts in its constructor and keeps the promises without a handler.
  // When Redis refused (REDIS_URL without the password, an ACL), those rejections were unhandled:
  // Node exited at startup and `restart: always` turned that into a crash loop. The store reloads
  // the scripts by itself on the next request. Redis still connecting at boot is normal: not logged.
  const report = (err: unknown) => {
    if (err instanceof RedisUnavailableError) return;
    logger.error('Redis rejected the rate-limit store; requests are not rate limited', {
      type: 'REDIS',
      prefix,
      error: err instanceof Error ? err.message : String(err),
    });
  };
  store.incrementScriptSha.catch(report);
  store.getScriptSha.catch(report);
  return store;
}

export function createLimiter(options: {
  prefix: string;
  windowMs: number;
  limit: number;
  message: string;
  redis?: RateLimitRedis;
}): RequestHandler {
  const { prefix, windowMs, limit, message, redis } = options;
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // Shared across instances when Redis is configured; per process otherwise.
    store: redis ? redisStore(redis, prefix) : undefined,
    // A broken or unreachable Redis lets requests through unlimited instead of failing them.
    passOnStoreError: true,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', { type: 'RATE_LIMIT', ip: req.ip, route: req.originalUrl });
      res.status(429).json({ message });
    },
  });
}

function limiter(prefix: string, windowMs: number, limit: number, message: string): RequestHandler {
  if (!env.rateLimitEnabled) return passThrough;
  return createLimiter({ prefix, windowMs, limit, message, redis: getRedis() });
}

export const globalLimiter = limiter('global', 60_000, 100, 'Too many requests from this IP, please try again later.');
export const loginLimiter = limiter('login', 60_000, 15, 'Too many login attempts from this IP, please try again after a minute.');
export const aiLimiter = limiter('ai', 10 * 60_000, 10, 'Too many AI requests, please try again later.');
