import express from 'express';
import request from 'supertest';
import { createLimiter, type RateLimitRedis } from '../../src/middleware/rateLimit';

// A Redis that refuses, is offline or never answers must not take the API down: the limiter
// lets requests through without rate limiting instead of crashing or hanging.

function appWith(redis: RateLimitRedis) {
  const app = express();
  app.use(createLimiter({ prefix: 'test', windowMs: 60_000, limit: 1, message: 'slow down', redis }));
  app.get('/', (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

describe('rate limiter when Redis misbehaves', () => {
  const unhandled: unknown[] = [];
  const onUnhandled = (reason: unknown) => unhandled.push(reason);
  let consoleError: jest.SpyInstance;

  beforeAll(() => {
    process.on('unhandledRejection', onUnhandled);
    // express-rate-limit reports each store error on the console; keep the test output clean
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterAll(() => {
    process.off('unhandledRejection', onUnhandled);
    consoleError.mockRestore();
  });

  test('Redis refusing every command (REDIS_URL without the password): no crash, requests pass', async () => {
    const redis = {
      isReady: true,
      sendCommand: jest.fn().mockRejectedValue(new Error('NOAUTH Authentication required.')),
    } as unknown as RateLimitRedis;

    const app = appWith(redis);
    await settle(); // the store's script loads have been rejected by now

    await request(app).get('/').expect(200);
    await request(app).get('/').expect(200); // over the limit of 1, but nothing can count it
    await settle();
    expect(unhandled).toHaveLength(0);
  });

  test('Redis offline: requests do not wait for it', async () => {
    const redis = { isReady: false, sendCommand: jest.fn() } as unknown as RateLimitRedis;
    const app = appWith(redis);

    const startedAt = Date.now();
    await request(app).get('/').expect(200);
    expect(Date.now() - startedAt).toBeLessThan(500);
    expect(redis.sendCommand).not.toHaveBeenCalled();
  });

  test('Redis that never answers: a request waits about one command timeout, not forever', async () => {
    const redis = {
      isReady: true,
      sendCommand: jest.fn(() => new Promise(() => undefined)),
    } as unknown as RateLimitRedis;
    const app = appWith(redis);

    const startedAt = Date.now();
    await request(app).get('/').expect(200);
    expect(Date.now() - startedAt).toBeLessThan(3_000);
  });

  test('a working Redis still rate limits', async () => {
    let hits = 0;
    const redis = {
      isReady: true,
      sendCommand: jest.fn(async (args: string[]) => {
        if (args[0] === 'SCRIPT') return 'sha';
        if (args[0] === 'EVALSHA') return [++hits, 60_000];
        return null;
      }),
    } as unknown as RateLimitRedis;
    const app = appWith(redis);

    await request(app).get('/').expect(200);
    await request(app).get('/').expect(429);
  });
});
