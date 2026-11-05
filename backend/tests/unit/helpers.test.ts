import { Prisma } from '@prisma/client';
import express from 'express';
import request from 'supertest';
import { AppError } from '../../src/lib/AppError';
import { ApiRouter, endpoint } from '../../src/lib/endpoint';
import { pageArgs, toPage } from '../../src/lib/pagination';
import { formatVnpDate } from '../../src/lib/vnpDate';
import { z } from '../../src/lib/zod';
import { errorHandler } from '../../src/middleware/errorHandler';
import { isRetryable } from '../../src/services/booking/bookingService';
import { retryDelayMs } from '../../src/services/outbox/outbox';
import { reconcileBackoffMs } from '../../src/services/payment/reconciler';
import { fromTxnRef, toTxnRef, VnpayGateway } from '../../src/services/payment/vnpayGateway';
import { asMember, asStaff } from '../helpers/http';

describe('formatVnpDate', () => {
  test('formats in GMT+7 whatever the server time zone', () => {
    expect(formatVnpDate(new Date('2026-11-05T17:30:05Z'))).toBe('20261106003005');
    expect(formatVnpDate(new Date('2026-12-31T16:59:59Z'))).toBe('20261231235959');
  });
});

describe('VNPay transaction reference', () => {
  test('round-trips a UUID', () => {
    const id = '0f8fad5b-d9cb-469f-a165-70867728950e';
    expect(toTxnRef(id)).toBe('0f8fad5bd9cb469fa16570867728950e');
    expect(fromTxnRef(toTxnRef(id))).toBe(id);
  });
});

describe('VnpayGateway.queryTransaction', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });
  test('an answer without a signature is not treated as verified', async () => {
    global.fetch = jest.fn(async () =>
      new Response(JSON.stringify({ vnp_ResponseCode: '00', vnp_TransactionStatus: '00', vnp_Amount: '50000000', vnp_TxnRef: 'x' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ) as typeof fetch;
    const res = await new VnpayGateway().queryTransaction({ txnRef: 'x', transactionDate: '20261105120000' });
    expect(res.verified).toBe(false);
    expect(res.amount).toBe(500000);
  });
});

describe('backoff schedules', () => {
  test('outbox: doubles from 2s and caps at 10 minutes', () => {
    expect([1, 2, 3].map(retryDelayMs)).toEqual([2000, 4000, 8000]);
    expect(retryDelayMs(30)).toBe(10 * 60 * 1000);
  });
  test('reconciler: 1, 2, 4 minutes ... capped at an hour', () => {
    expect([1, 2, 3].map(reconcileBackoffMs)).toEqual([60_000, 120_000, 240_000]);
    expect(reconcileBackoffMs(20)).toBe(60 * 60_000);
  });
});

describe('pagination', () => {
  test('asks for one extra row and turns it into nextCursor', () => {
    expect(pageArgs({ limit: 2 })).toEqual({ take: 3 });
    expect(pageArgs({ limit: 2, cursor: 'c' })).toEqual({ take: 3, cursor: { id: 'c' }, skip: 1 });
    const rows = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(toPage(rows, 2)).toEqual({ data: [{ id: 'a' }, { id: 'b' }], nextCursor: 'b' });
    expect(toPage(rows.slice(0, 2), 2)).toEqual({ data: [{ id: 'a' }, { id: 'b' }], nextCursor: null });
  });
});

describe('isRetryable', () => {
  const known = (code: string, meta?: Record<string, unknown>) =>
    new Prisma.PrismaClientKnownRequestError('x', { code, clientVersion: 'test', meta });
  test('serialization failures and deadlocks, from Prisma or from raw SQL', () => {
    expect(isRetryable(known('P2034'))).toBe(true);
    expect(isRetryable(known('P2010', { code: '40001' }))).toBe(true);
    expect(isRetryable(known('P2010', { code: '40P01' }))).toBe(true);
  });
  test('anything else is not retried', () => {
    expect(isRetryable(known('P2010', { code: '23505' }))).toBe(false);
    expect(isRetryable(known('P2002'))).toBe(false);
    expect(isRetryable(new Error('boom'))).toBe(false);
  });
});

describe('endpoint() and errorHandler', () => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    // minimal cookie parsing for the auth middleware
    req.cookies = Object.fromEntries((req.headers.cookie ?? '').split('; ').filter(Boolean).map((c) => c.split('=')));
    next();
  });
  const r = new ApiRouter('/t', 'Test')
    .post(
      '/echo/:id',
      endpoint(
        { summary: 'echo', auth: 'member', params: z.object({ id: z.string().uuid() }), body: z.object({ n: z.coerce.number().int() }), query: z.object({ q: z.string().default('x') }) },
        async ({ body, params, query, auth, res }) => {
          res.json({ n: body.n, id: params.id, q: query.q, user: auth.userId });
        },
      ),
    )
    .get('/boom', endpoint({ summary: 'boom', auth: 'public' }, async () => Promise.reject(new Error('secret internals'))))
    .get('/teapot', endpoint({ summary: 'teapot', auth: 'public' }, async () => Promise.reject(new AppError('short and stout', 418, { code: 'TEAPOT' }))))
    .get(
      '/p2002',
      endpoint({ summary: 'dup', auth: 'public' }, async () =>
        Promise.reject(new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: 'test' })),
      ),
    )
    .get(
      '/check',
      endpoint({ summary: 'check', auth: 'public' }, async () =>
        Promise.reject(new Prisma.PrismaClientKnownRequestError('raw', { code: 'P2010', clientVersion: 'test', meta: { code: '23514' } })),
      ),
    )
    .get(
      '/p2024',
      endpoint({ summary: 'pool', auth: 'public' }, async () =>
        Promise.reject(new Prisma.PrismaClientKnownRequestError('pool', { code: 'P2024', clientVersion: 'test' })),
      ),
    );
  app.use('/t', r.router);
  app.use(errorHandler);

  const id = '0f8fad5b-d9cb-469f-a165-70867728950e';

  test('parses and coerces body, params and query and passes the typed auth', async () => {
    const res = await request(app).post(`/t/echo/${id}`).set('Cookie', asMember('m-1')).send({ n: '42' });
    expect(res.body).toEqual({ n: 42, id, q: 'x', user: 'm-1' });
  });

  test('checks the auth level before validating', async () => {
    expect((await request(app).post(`/t/echo/${id}`).send({ n: 1 })).status).toBe(401);
    expect((await request(app).post(`/t/echo/${id}`).set('Cookie', asStaff()).send({ n: 1 })).status).toBe(403);
  });

  test('reports every invalid field', async () => {
    const res = await request(app).post('/t/echo/nope').set('Cookie', asMember('m-1')).send({ n: 'abc' });
    expect(res.status).toBe(400);
    expect(res.body.details.map((d: { path: string }) => d.path).sort()).toEqual(['body.n', 'params.id']);
  });

  test('unexpected errors are a generic 500 that leaks nothing in production', async () => {
    const res = await request(app).get('/t/boom');
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Internal server error');
  });

  test('AppError keeps its status and code; Prisma errors are mapped', async () => {
    expect((await request(app).get('/t/teapot')).body).toEqual({ message: 'short and stout', code: 'TEAPOT' });
    expect((await request(app).get('/t/p2002')).status).toBe(409);
    expect((await request(app).get('/t/p2024')).status).toBe(503);
    expect((await request(app).get('/t/check')).body).toMatchObject({ code: 'CONSTRAINT_VIOLATION' });
  });
});
