import { Prisma } from '@prisma/client';
import { env } from '../../config/env';
import { AppError } from '../../lib/AppError';
import { logger } from '../../lib/logger';
import { prisma } from '../../lib/prisma';
import { formatVnpDate } from '../../lib/vnpDate';
import { enqueue } from '../outbox/outbox';
import { fromTxnRef, getGateway, toTxnRef } from './vnpayGateway';

const DAY_MS = 24 * 60 * 60 * 1000;

export async function createPaymentOrder(input: { memberId: string; packageId: string; ipAddr: string; now?: Date }) {
  const now = input.now ?? new Date();
  const pkg = await prisma.package.findUnique({ where: { id: input.packageId } });
  if (!pkg || !pkg.is_active) throw new AppError('Package not found', 404);

  const createDate = formatVnpDate(now);
  const expireDate = formatVnpDate(new Date(now.getTime() + env.vnpay.paymentExpiryMinutes * 60_000));

  const subscription = await prisma.subscription.create({
    data: {
      member_id: input.memberId,
      package_id: pkg.id,
      status: 'pending',
      amount: pkg.price,
      vnp_create_date: createDate,
      // If the IPN has not arrived by then, the reconciler asks VNPay.
      next_reconcile_at: new Date(now.getTime() + env.vnpay.reconcileGraceMinutes * 60_000),
    },
  });

  const paymentUrl = getGateway().buildPaymentUrl({
    txnRef: toTxnRef(subscription.id),
    amount: Number(pkg.price),
    ipAddr: input.ipAddr,
    createDate,
    expireDate,
  });

  logger.info('Payment created', { type: 'PAYMENT_CREATE', orderId: subscription.id, amount: Number(pkg.price) });
  return { subscriptionId: subscription.id, paymentUrl };
}

// failure_reason values we set ourselves when no payment was seen, as opposed to VNPay saying "failed".
const TIMEOUT_REASONS = new Set(['expired_unpaid', 'legacy_abandoned']);

export type PaymentOutcome ='activated' | 'failed' | 'already_processed' | 'amount_mismatch' | 'not_found';

export type PaymentResult =
  | { success: true; amount: number; transactionNo?: string; source: 'ipn' | 'reconciler' }
  | { success: false; reason: string; source: 'ipn' | 'reconciler' };

// The single place a pending order changes state, used by both the IPN and the reconciler.
// The row lock makes the two race-free: whichever runs second sees a non-pending order and
// does nothing, so a membership is activated (and its e-mail queued) exactly once.
export async function applyPaymentResult(subscriptionId: string, result: PaymentResult, now = new Date()) {
  return prisma.$transaction(async (tx) => {
    const [locked] = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "Subscription" WHERE "id" = ${subscriptionId} FOR UPDATE`;
    if (!locked) return { outcome: 'not_found' as PaymentOutcome };

    const sub = await tx.subscription.findUniqueOrThrow({ where: { id: subscriptionId }, include: { package: true } });

    // We marked these failed only because no payment had shown up in time. If VNPay then reports
    // a genuine success, the member has paid and must get the membership.
    const failedByTimeout = sub.status === 'failed' && TIMEOUT_REASONS.has(sub.failure_reason ?? '');
    if (failedByTimeout && result.success) {
      logger.warn('Payment arrived after the order was given up; activating it', {
        type: 'PAYMENT_LATE', orderId: sub.id, previousReason: sub.failure_reason, source: result.source,
      });
    } else if (sub.status !== 'pending') {
      if (result.success && sub.status === 'failed') {
        // VNPay says paid, but this order already failed for another reason: needs a human.
        logger.error('Successful payment for a failed order', {
          type: 'PAYMENT_AFTER_FAILURE', orderId: sub.id, failureReason: sub.failure_reason, source: result.source,
        });
      }
      return { outcome: 'already_processed' as PaymentOutcome, status: sub.status };
    }

    if (result.success) {
      const expected = new Prisma.Decimal(sub.amount ?? sub.package.price);
      if (!expected.equals(result.amount)) {
        logger.error('Payment amount mismatch', {
          type: 'PAYMENT_FAIL', orderId: sub.id, expected: expected.toString(), received: result.amount, source: result.source,
        });
        return { outcome: 'amount_mismatch' as PaymentOutcome };
      }
      await tx.subscription.update({
        where: { id: sub.id },
        data: {
          status: 'active',
          start_date: now,
          end_date: new Date(now.getTime() + sub.package.duration_days * DAY_MS),
          paid_at: now,
          vnp_transaction_no: result.transactionNo,
          next_reconcile_at: null,
          failure_reason: null,
        },
      });
      await enqueue(tx, 'payment.succeeded', { subscriptionId: sub.id, memberId: sub.member_id, source: result.source });
      logger.info('Payment succeeded', { type: 'PAYMENT_SUCCESS', orderId: sub.id, amount: result.amount, source: result.source });
      return { outcome: 'activated' as PaymentOutcome };
    }

    await tx.subscription.update({
      where: { id: sub.id },
      data: { status: 'failed', failure_reason: result.reason.slice(0, 200), next_reconcile_at: null },
    });
    await enqueue(tx, 'payment.failed', { subscriptionId: sub.id, memberId: sub.member_id, reason: result.reason, source: result.source });
    logger.warn('Payment failed', { type: 'PAYMENT_FAIL', orderId: sub.id, reason: result.reason, source: result.source });
    return { outcome: 'failed' as PaymentOutcome };
  });
}

// VNPay's server-to-server notification. Returns the body VNPay expects.
export async function handleIpn(query: Record<string, unknown>) {
  let verified;
  try {
    verified = getGateway().verifyCallback(query);
  } catch {
    // The library throws on a malformed amount; treat it like a bad signature.
    return { RspCode: '97', Message: 'Invalid signature' };
  }
  if (!verified.verified) {
    logger.warn('IPN invalid signature', { type: 'PAYMENT_FAIL', status: 'invalid_signature' });
    return { RspCode: '97', Message: 'Invalid signature' };
  }

  const txnRef = typeof query.vnp_TxnRef === 'string' ? query.vnp_TxnRef : '';
  const subscriptionId = fromTxnRef(txnRef);

  const result: PaymentResult =
    verified.responseCode === '00'
      ? { success: true, amount: verified.amount, transactionNo: verified.transactionNo, source: 'ipn' }
      : { success: false, reason: `vnpay_response_${verified.responseCode}`, source: 'ipn' };

  const { outcome } = await applyPaymentResult(subscriptionId, result);
  switch (outcome) {
    case 'not_found':
      return { RspCode: '01', Message: 'Order not found' };
    case 'already_processed':
      return { RspCode: '02', Message: 'Order already confirmed' };
    case 'amount_mismatch':
      return { RspCode: '04', Message: 'Invalid amount' };
    default:
      return { RspCode: '00', Message: 'Confirm Success' };
  }
}

export function isExpiredUnpaid(sub: { created_at: Date }, now: Date) {
  const deadline = sub.created_at.getTime() + env.vnpay.paymentExpiryMinutes * 60_000 + env.vnpay.reconcileGraceMinutes * 60_000;
  return now.getTime() > deadline;
}

export { DAY_MS };
