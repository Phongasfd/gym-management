import type { OutboxEvent } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import { prisma, type Tx } from '../../lib/prisma';
import { utc } from '../../lib/sql';

// Transactional outbox.
//
// Problem: "cancel a booking, promote the next member, e-mail them" touches the database and an
// SMTP server. If the e-mail is sent inside the transaction and the commit fails, the member is
// told about a seat they do not have; if it is sent after the commit and the process dies, it is
// never sent. Writing the event into the same transaction as the state change makes the two
// atomic; the worker then delivers it at least once.

export type OutboxEventMap = {
  'booking.promoted': { bookingId: string; memberId: string; classId: string };
  'payment.succeeded': { subscriptionId: string; memberId: string; source: 'ipn' | 'reconciler' };
  'payment.failed': { subscriptionId: string; memberId: string; reason: string; source: 'ipn' | 'reconciler' };
};
export type OutboxEventType = keyof OutboxEventMap;

export type OutboxHandlers = {
  [K in OutboxEventType]: (payload: OutboxEventMap[K], event: OutboxEvent) => Promise<void>;
};

// A row stuck in `processing` this long belongs to a worker that died; it is claimed again.
const STALE_LOCK_MS = 5 * 60 * 1000;

export async function enqueue<K extends OutboxEventType>(tx: Tx, type: K, payload: OutboxEventMap[K]) {
  await tx.outboxEvent.create({
    data: { type, payload: payload as Prisma.InputJsonObject, available_at: new Date() },
  });
}

// Claims up to `limit` due events. FOR UPDATE SKIP LOCKED lets several workers poll the same
// table without blocking each other or taking the same event twice.
export async function claimBatch(limit: number, now = new Date()): Promise<OutboxEvent[]> {
  const staleBefore = new Date(now.getTime() - STALE_LOCK_MS);
  return prisma.$queryRaw<OutboxEvent[]>`
    UPDATE "OutboxEvent"
    SET "status" = 'processing', "locked_at" = ${utc(now)}, "attempts" = "attempts" + 1
    WHERE "id" IN (
      SELECT "id" FROM "OutboxEvent"
      WHERE ("status" = 'pending' AND "available_at" <= ${utc(now)})
         OR ("status" = 'processing' AND "locked_at" < ${utc(staleBefore)})
      ORDER BY "created_at", "id"
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *`;
}

// 2s, 4s, 8s ... capped at 10 minutes.
export function retryDelayMs(attempts: number): number {
  return Math.min(1000 * 2 ** attempts, 10 * 60 * 1000);
}

export async function dispatchOnce(
  handlers: OutboxHandlers,
  { limit = 20, now = new Date() }: { limit?: number; now?: Date } = {},
): Promise<{ claimed: number; done: number; retried: number; dead: number }> {
  const events = await claimBatch(limit, now);
  const stats = { claimed: events.length, done: 0, retried: 0, dead: 0 };

  for (const event of events) {
    // The batch was locked at claim time, but events are handled one after another. Renew the
    // lock just before handling this one, so a slow batch does not make the last events look
    // abandoned to other workers. If another worker already reclaimed it, leave it to them.
    const lease = new Date();
    const renewed = await prisma.outboxEvent.updateMany({
      where: { id: event.id, status: 'processing', locked_at: event.locked_at },
      data: { locked_at: lease },
    });
    if (renewed.count === 0) continue;
    // Every later write is conditional on still holding this lease.
    const mine = { id: event.id, status: 'processing' as const, locked_at: lease };

    const handler = handlers[event.type as OutboxEventType] as
      | ((payload: unknown, event: OutboxEvent) => Promise<void>)
      | undefined;
    try {
      if (!handler) throw new Error(`No handler for outbox event type "${event.type}"`);
      await handler(event.payload, event);
      await prisma.outboxEvent.updateMany({
        where: mine,
        data: { status: 'done', processed_at: new Date(), locked_at: null, last_error: null },
      });
      stats.done++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const dead = event.attempts >= env.worker.outboxMaxAttempts;
      await prisma.outboxEvent.updateMany({
        where: mine,
        data: {
          status: dead ? 'failed' : 'pending',
          locked_at: null,
          last_error: message.slice(0, 2000),
          available_at: new Date(Date.now() + retryDelayMs(event.attempts)),
        },
      });
      if (dead) {
        stats.dead++;
        logger.error('Outbox event moved to dead letter', { type: 'OUTBOX_DEAD', id: event.id, event: event.type, attempts: event.attempts, error: message });
      } else {
        stats.retried++;
        logger.warn('Outbox event failed, will retry', { type: 'OUTBOX_RETRY', id: event.id, event: event.type, attempts: event.attempts, error: message });
      }
    }
  }
  return stats;
}
