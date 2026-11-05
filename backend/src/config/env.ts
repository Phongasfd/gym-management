import path from 'path';
import dotenv from 'dotenv';

// Loaded once, before anything reads process.env. Tests use .env.test; CI sets the variables directly.
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.join(__dirname, '..', '..', envFile), quiet: true });

export type BookingStrategyName = 'atomic' | 'row_lock' | 'serializable';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set`);
  }
  return value;
}

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be an integer, got "${raw}"`);
  }
  return value;
}

function bookingStrategy(): BookingStrategyName {
  const raw = process.env.BOOKING_STRATEGY ?? 'atomic';
  if (raw === 'atomic' || raw === 'row_lock' || raw === 'serializable') return raw;
  throw new Error(`BOOKING_STRATEGY must be atomic, row_lock or serializable, got "${raw}"`);
}

const nodeEnv = process.env.NODE_ENV ?? 'development';

export const env = {
  nodeEnv,
  isProd: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port: int('PORT', 3000),
  jwtSecret: required('JWT_SECRET'),
  csrfSecret: process.env.CSRF_SECRET || required('JWT_SECRET'),
  refreshTtlDays: int('REFRESH_TTL_DAYS', 7),
  // Unset = in-memory rate limiting (one instance only). Set in production so limits are shared.
  redisUrl: process.env.REDIS_URL || undefined,
  rateLimitEnabled: nodeEnv !== 'test' && process.env.RATE_LIMIT_DISABLED !== 'true',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3001,http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  bookingStrategy: bookingStrategy(),
  vnpay: {
    tmnCode: process.env.VNP_TMN_CODE ?? '',
    hashSecret: process.env.VNP_HASH_SECRET ?? '',
    url: process.env.VNP_URL || 'https://sandbox.vnpayment.vn',
    returnUrl: process.env.VNP_RETURN_URL ?? '',
    // VNPay keeps retrying the IPN for a while; only orders older than this are reconciled.
    reconcileGraceMinutes: int('VNP_RECONCILE_GRACE_MINUTES', 15),
    // The payment URL expires after this many minutes (vnp_ExpireDate).
    paymentExpiryMinutes: int('VNP_PAYMENT_EXPIRY_MINUTES', 60 * 24),
  },
  worker: {
    pollIntervalMs: int('WORKER_POLL_INTERVAL_MS', 2000),
    reconcileIntervalMs: int('WORKER_RECONCILE_INTERVAL_MS', 60_000),
    outboxMaxAttempts: int('OUTBOX_MAX_ATTEMPTS', 8),
  },
};
