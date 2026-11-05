import { Prisma } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { AppError } from '../lib/AppError';
import { logger } from '../lib/logger';

// Body fields never written to logs, whatever the route.
const SENSITIVE_FIELDS = ['password', 'currentPassword', 'newPassword', 'confirm', 'confirmPassword', 'resetCode'];

interface Mapped {
  status: number;
  message: string;
  code?: string;
  details?: unknown;
}

function mapError(err: unknown): Mapped {
  if (err instanceof AppError) {
    return { status: err.statusCode, message: err.message, code: err.code, details: err.details };
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        return { status: 409, message: 'Already exists', code: 'DUPLICATE' };
      case 'P2025':
        return { status: 404, message: 'Record not found', code: 'NOT_FOUND' };
      case 'P2003':
        return { status: 400, message: 'Referenced record does not exist', code: 'INVALID_REFERENCE' };
      case 'P2034':
        return { status: 409, message: 'Conflicting update, please retry', code: 'CONFLICT' };
      case 'P2024':
        return { status: 503, message: 'Server is busy, please retry', code: 'POOL_TIMEOUT' };
      case 'P2010': {
        // Raw query failed: map the SQLSTATE the way Prisma would for its own queries.
        const sqlState = String((err.meta as { code?: unknown } | undefined)?.code ?? '');
        if (sqlState === '23514') return { status: 409, message: 'The change would break a data rule', code: 'CONSTRAINT_VIOLATION' };
        if (sqlState === '23505') return { status: 409, message: 'Already exists', code: 'DUPLICATE' };
        if (sqlState === '40001' || sqlState === '40P01') return { status: 409, message: 'Conflicting update, please retry', code: 'CONFLICT' };
        return { status: 500, message: 'Internal server error' };
      }
      default:
        return { status: 500, message: 'Internal server error' };
    }
  }
  // A CHECK constraint (e.g. booked_count <= capacity) refused the write.
  if (err instanceof Error && /violates check constraint/.test(err.message)) {
    return { status: 409, message: 'The change would break a data rule', code: 'CONSTRAINT_VIOLATION' };
  }
  const tagged = typeof err === 'object' && err !== null ? (err as { type?: string; code?: string }) : {};
  if (tagged.type === 'entity.parse.failed') {
    return { status: 400, message: 'Malformed JSON body', code: 'BAD_JSON' };
  }
  if (tagged.code === 'EBADCSRFTOKEN') {
    return { status: 403, message: 'Invalid CSRF token', code: 'BAD_CSRF' };
  }
  return { status: 500, message: 'Internal server error' };
}

// Express treats a middleware as an error handler only when it declares 4 parameters.
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const mapped = mapError(err);

  const body = req.body && typeof req.body === 'object' ? { ...(req.body as Record<string, unknown>) } : undefined;
  if (body) {
    for (const field of SENSITIVE_FIELDS) {
      if (field in body) body[field] = '[REDACTED]';
    }
  }

  const log = mapped.status >= 500 ? logger.error.bind(logger) : logger.warn.bind(logger);
  log(err instanceof Error ? err.message : 'Non-error thrown', {
    type: 'APP_ERROR',
    status: mapped.status,
    code: mapped.code,
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    body,
    stack: mapped.status >= 500 && err instanceof Error ? err.stack : undefined,
  });

  res.status(mapped.status).json({
    message: mapped.message,
    ...(mapped.code ? { code: mapped.code } : {}),
    ...(mapped.details !== undefined ? { details: mapped.details } : {}),
    ...(!env.isProd && mapped.status >= 500 && err instanceof Error ? { stack: err.stack } : {}),
  });
}
