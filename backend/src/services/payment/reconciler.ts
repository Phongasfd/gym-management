import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import { prisma } from '../../lib/prisma';
import { utc } from '../../lib/sql';
import { formatVnpDate } from '../../lib/vnpDate';
import { applyPaymentResult, isExpiredUnpaid } from './paymentService';
import { getGateway, toTxnRef, type PaymentGateway } from './vnpayGateway';

// Payment reconciliation.
//
// The membership is activated by VNPay's IPN. If that call never reaches us (our server was
// down, a network error, VNPay gave up retrying), the member has paid and their order stays
// `pending` forever. This job asks VNPay (querydr) about every pending order older than the
// grace period and applies the answer through the same code path as the IPN.

// While one worker is asking VNPay about an order, other workers leave it alone for this long.
const LEASE_MS = 2 * 60 * 1000;

// 1, 2, 4, 8 ... minutes, capped at one hour.
export function reconcileBackoffMs(attempts: number) {
  return Math.min(60_000 * 2 ** Math.max(attempts - 1, 0), 60 * 60_000);
}

export interface ReconcileStats {
  checked: number;
  activated: number;
  failed: number;
  stillPending: number;
  needsReview: number;
  errors: number;
}

// Claims due orders and pushes their next check into the future in one statement, then commits,
// so no transaction stays open while we wait on VNPay over HTTP.
async function claimDueOrders(limit: number, now: Date) {
  const graceCutoff = new Date(now.getTime() - env.vnpay.reconcileGraceMinutes * 60_000);
  const leaseUntil = new Date(now.getTime() + LEASE_MS);
  return prisma.$queryRaw<{ id: string; created_at: Date; vnp_create_date: string | null; reconcile_attempts: number }[]>`
    UPDATE "Subscription"
    SET "next_reconcile_at" = ${utc(leaseUntil)}, "reconcile_attempts" = "reconcile_attempts" + 1
    WHERE "id" IN (
      SELECT "id" FROM "Subscription"
      WHERE "status" = 'pending'
        AND "created_at" <= ${utc(graceCutoff)}
        AND ("next_reconcile_at" IS NULL OR "next_reconcile_at" <= ${utc(now)})
      ORDER BY "next_reconcile_at" NULLS FIRST, "id"
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING "id", "created_at", "vnp_create_date", "reconcile_attempts"`;
}

// ~1.5 days of checks with the hourly cap; past that, a person should look at the order.
export const MAX_RECONCILE_ATTEMPTS = 40;
// "Never again": the claim query only picks orders whose next check is due.
const NEVER = new Date('9999-01-01T00:00:00Z');

// Stops automatic checks without deciding the outcome: the order stays `pending` (a late IPN
// can still activate it) and an error is logged for a human. Used when acting automatically could
// be wrong in either direction.
async function needsReview(id: string, reason: string) {
  await prisma.subscription.updateMany({
    where: { id, status: 'pending' },
    data: { next_reconcile_at: NEVER, failure_reason: reason },
  });
  logger.error('Reconcile: order needs manual review', { type: 'RECONCILE_REVIEW', orderId: id, reason });
}

async function scheduleRetry(id: string, attempts: number, now: Date) {
  if (attempts >= MAX_RECONCILE_ATTEMPTS) {
    await needsReview(id, 'reconcile_gave_up');
    return;
  }
  await prisma.subscription.updateMany({
    where: { id, status: 'pending' },
    data: { next_reconcile_at: new Date(now.getTime() + reconcileBackoffMs(attempts)) },
  });
}

export async function reconcileOnce(
  { gateway = getGateway(), limit = 20, now = new Date() }: { gateway?: PaymentGateway; limit?: number; now?: Date } = {},
): Promise<ReconcileStats> {
  const orders = await claimDueOrders(limit, now);
  const stats: ReconcileStats = { checked: orders.length, activated: 0, failed: 0, stillPending: 0, needsReview: 0, errors: 0 };

  for (const order of orders) {
    try {
      const res = await gateway.queryTransaction({
        txnRef: toTxnRef(order.id),
        // Orders created before this job existed did not store the date; created_at is the best guess.
        transactionDate: order.vnp_create_date ?? formatVnpDate(order.created_at),
      });

      if (!res.verified) {
        // Never act on an answer we cannot authenticate.
        logger.warn('Reconcile: unverified VNPay response', { type: 'RECONCILE', orderId: order.id });
        stats.errors++;
        await scheduleRetry(order.id, order.reconcile_attempts, now);
        continue;
      }

      const paid = res.responseCode === '00' && res.transactionStatus === '00';
      const unfinished = res.responseCode === '91' || (res.responseCode === '00' && res.transactionStatus === '01');

      if (paid) {
        const { outcome } = await applyPaymentResult(
          order.id,
          { success: true, amount: res.amount ?? Number.NaN, transactionNo: res.transactionNo, source: 'reconciler' },
          now,
        );
        if (outcome === 'activated') stats.activated++;
        if (outcome === 'amount_mismatch') {
          // Paid, but not the amount we expected: neither activating nor failing is safe.
          stats.needsReview++;
          await needsReview(order.id, 'amount_mismatch');
        }
      } else if (unfinished) {
        // Not paid (yet). Once the payment link has expired it never will be.
        if (isExpiredUnpaid(order, now) && order.vnp_create_date === null && res.responseCode === '91') {
          // Pre-migration order: its VNPay create date was guessed, so "not found" may just mean
          // we asked with the wrong date. Do not fail a possibly paid order on a guess.
          stats.needsReview++;
          await needsReview(order.id, 'legacy_not_found');
        } else if (isExpiredUnpaid(order, now)) {
          await applyPaymentResult(order.id, { success: false, reason: 'expired_unpaid', source: 'reconciler' }, now);
          stats.failed++;
        } else {
          stats.stillPending++;
          await scheduleRetry(order.id, order.reconcile_attempts, now);
        }
      } else if (res.responseCode === '00') {
        // The transaction exists and VNPay reports a final non-success status.
        await applyPaymentResult(
          order.id,
          { success: false, reason: `vnpay_status_${res.transactionStatus ?? 'unknown'}`, source: 'reconciler' },
          now,
        );
        stats.failed++;
      } else {
        // The query itself failed (bad request, rate limit, VNPay error): ask again later.
        logger.warn('Reconcile: VNPay query failed', { type: 'RECONCILE', orderId: order.id, responseCode: res.responseCode, message: res.message });
        stats.errors++;
        await scheduleRetry(order.id, order.reconcile_attempts, now);
      }
    } catch (err) {
      stats.errors++;
      logger.error('Reconcile: error', { type: 'RECONCILE', orderId: order.id, error: err instanceof Error ? err.message : String(err) });
      await scheduleRetry(order.id, order.reconcile_attempts, now);
    }
  }

  if (orders.length > 0) logger.info('Reconcile run', { type: 'RECONCILE', ...stats });
  return stats;
}
