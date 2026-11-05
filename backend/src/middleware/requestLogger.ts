import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { logger } from '../lib/logger';

// Gives each request an id (echoed in X-Request-Id and in every log line) and logs it when it ends.
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();
  const incoming = req.get('X-Request-Id');
  req.requestId = incoming && /^[\w-]{1,64}$/.test(incoming) ? incoming : crypto.randomUUID();
  res.setHeader('X-Request-Id', req.requestId);

  res.on('finish', () => {
    const auth = req.auth;
    logger.info('HTTP request', {
      type: 'HTTP_REQUEST',
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      responseTimeMs: Number(process.hrtime.bigint() - start) / 1e6,
      ip: req.ip, // trust proxy is set, so this is the client IP from Nginx's X-Forwarded-For
      user: auth ? (auth.userType === 'member' ? auth.userId : auth.staffId) : undefined,
    });
  });
  next();
}
