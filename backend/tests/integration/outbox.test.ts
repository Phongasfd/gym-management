import type { OutboxEvent } from '@prisma/client';
import { env } from '../../src/config/env';
import { claimBatch, dispatchOnce, enqueue, type OutboxHandlers } from '../../src/services/outbox/outbox';
import { prisma, resetDb } from '../helpers/db';

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

function handlers(fn: (event: OutboxEvent) => Promise<void>): OutboxHandlers {
  return {
    'booking.promoted': (_p, e) => fn(e),
    'payment.succeeded': (_p, e) => fn(e),
    'payment.failed': (_p, e) => fn(e),
  };
}

async function enqueueMany(n: number) {
  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < n; i++) {
      await enqueue(tx, 'booking.promoted', { bookingId: `b${i}`, memberId: `m${i}`, classId: 'c' });
    }
  });
}

test('an event written in a rolled-back transaction is never delivered', async () => {
  await expect(
    prisma.$transaction(async (tx) => {
      await enqueue(tx, 'booking.promoted', { bookingId: 'b', memberId: 'm', classId: 'c' });
      throw new Error('booking failed');
    }),
  ).rejects.toThrow('booking failed');
  expect(await prisma.outboxEvent.count()).toBe(0);
});

test('a delivered event is marked done', async () => {
  await enqueueMany(1);
  const seen: string[] = [];
  const stats = await dispatchOnce(handlers(async (e) => void seen.push(e.id)));
  expect(stats).toEqual({ claimed: 1, done: 1, retried: 0, dead: 0 });
  expect(await prisma.outboxEvent.findFirstOrThrow()).toMatchObject({ status: 'done', attempts: 1, last_error: null });
});

test('a failing handler is retried later with backoff, then succeeds', async () => {
  await enqueueMany(1);
  let calls = 0;
  const flaky = handlers(async () => {
    if (++calls === 1) throw new Error('SMTP timeout');
  });

  await dispatchOnce(flaky);
  const afterFailure = await prisma.outboxEvent.findFirstOrThrow();
  expect(afterFailure).toMatchObject({ status: 'pending', attempts: 1, last_error: 'SMTP timeout' });
  expect(afterFailure.available_at.getTime()).toBeGreaterThan(Date.now());

  // Not due yet: nothing is claimed.
  expect((await dispatchOnce(flaky)).claimed).toBe(0);

  // Once due, it is delivered.
  await dispatchOnce(flaky, { now: new Date(Date.now() + 60_000) });
  expect(await prisma.outboxEvent.findFirstOrThrow()).toMatchObject({ status: 'done', attempts: 2 });
});

test('after the maximum number of attempts the event goes to the dead letter state', async () => {
  await enqueueMany(1);
  await prisma.outboxEvent.updateMany({ data: { attempts: env.worker.outboxMaxAttempts - 1 } });
  await dispatchOnce(handlers(async () => Promise.reject(new Error('mailbox does not exist'))));
  expect(await prisma.outboxEvent.findFirstOrThrow()).toMatchObject({ status: 'failed', attempts: env.worker.outboxMaxAttempts });
});

test('an event of unknown type is retried, not lost', async () => {
  await prisma.outboxEvent.create({ data: { type: 'something.new', payload: {} } });
  const stats = await dispatchOnce(handlers(async () => {}));
  expect(stats.retried).toBe(1);
});

test('an event left "processing" by a crashed worker is claimed again after the lock expires', async () => {
  await enqueueMany(1);
  await claimBatch(10); // the "crashed" worker
  expect(await claimBatch(10)).toHaveLength(0); // still locked
  const later = new Date(Date.now() + 6 * 60 * 1000);
  expect(await claimBatch(10, later)).toHaveLength(1);
});

test('three workers polling at once deliver each of 60 events exactly once', async () => {
  await enqueueMany(60);
  const deliveries: string[] = [];
  const slowHandler = handlers(async (e) => {
    deliveries.push(e.id);
    await new Promise((resolve) => setTimeout(resolve, 2));
  });

  const worker = async () => {
    while ((await dispatchOnce(slowHandler, { limit: 7 })).claimed > 0) {
      // keep polling until the table is drained
    }
  };
  await Promise.all([worker(), worker(), worker()]);

  expect(deliveries).toHaveLength(60);
  expect(new Set(deliveries).size).toBe(60);
  expect(await prisma.outboxEvent.count({ where: { status: 'done' } })).toBe(60);
});
