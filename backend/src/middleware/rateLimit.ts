import type { NextFunction, Request, RequestHandler, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { RedisStore, type RedisReply } from 'rate-limit-redis';
import { env } from '../config/env';
import { getRedis } from '../config/redis';
import { logger } from '../lib/logger';

const passThrough: RequestHandler = (_req: Request, _res: Response, next: NextFunction) => next();

function limiter(prefix: string, windowMs: number, limit: number, message: string): RequestHandler {
  if (!env.rateLimitEnabled) return passThrough;
  const redis = getRedis();
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // Shared across instances when Redis is configured; per process otherwise.
    store: redis
      ? new RedisStore({
          prefix: `rl:${prefix}:`,
          sendCommand: (...args: string[]) => redis.sendCommand(args) as Promise<RedisReply>,
        })
      : undefined,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', { type: 'RATE_LIMIT', ip: req.ip, route: req.originalUrl });
      res.status(429).json({ message });
    },
  });
}

export const globalLimiter = limiter('global', 60_000, 100, 'Too many requests from this IP, please try again later.');
export const loginLimiter = limiter('login', 60_000, 15, 'Too many login attempts from this IP, please try again after a minute.');
export const aiLimiter = limiter('ai', 10 * 60_000, 10, 'Too many AI requests, please try again later.');
