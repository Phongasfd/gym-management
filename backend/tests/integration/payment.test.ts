import request from 'supertest';
import { createApp } from '../../src/app';
import { env } from '../../src/config/env';
import { applyPaymentResult } from '../../src/services/payment/paymentService';
import { reconcileOnce } from '../../src/services/payment/reconciler';
import { setGateway, toTxnRef } from '../../src/services/payment/vnpayGateway';
import { createMember, createPackage, prisma, resetDb } from '../helpers/db';
import { asMember, client } from '../helpers/http';
import { FakeGateway, signedIpnQuery } from '../helpers/vnpay';

const app = createApp();
let gateway: FakeGateway;

beforeEach(async () => {
  await resetDb();
  gateway = new FakeGateway();
  setGateway(gateway);
});
afterAll(async () => {
  setGateway(undefined);
  await prisma.$disconnect();
});

const MINUTE = 60_000;

async function startPayment(price = 500000) {
  const pkg = await createPackage({ price });
  const member = await createMember();
  const res = await (await client(app, asMember(member.id))).post('/api/vnpay/create-qr', { packageId: pkg.id });
  expect(res.status).toBe(201);
  const sub = await prisma.subscription.findFirstOrThrow({ where: { member_id: member.id } });
  return { pkg, member, sub, paymentUrl: res.body as string };
}

const ipn = (query: string) => request(app).get(`/api/vnpay/vnpay-ipn?${query}`);

describe('creating a payment', () => {
  test('stores a pending order with the price snapshot and the VNPay create date', async () => {
    const { sub, paymentUrl } = await startPayment();
    expect(sub).toMatchObject({ status: 'pending', reconcile_attempts: 0 });
    expect(Number(sub.amount)).toBe(500000);
    expect(sub.vnp_create_date).toMatch(/^\d{14}$/);
    const url = new URL(paymentUrl);
    expect(url.searchParams.get('vnp_TxnRef')).toBe(toTxnRef(sub.id));
    expect(url.searchParams.get('vnp_Amount')).toBe('50000000');
    expect(url.searchParams.get('vnp_CreateDate')).toBe(sub.vnp_create_date);
  });

  test('an unknown or inactive package is a 404', async () => {
    const pkg = await createPackage({ is_active: false });
    const member = await createMember();
    const res = await (await client(app, asMember(member.id))).post('/api/vnpay/create-qr', { packageId: pkg.id });
    expect(res.status).toBe(404);
  });
});

describe('IPN', () => {
  test('a valid IPN activates the membership once and queues a receipt', async () => {
    const { sub } = await startPayment();
    const query = signedIpnQuery({ txnRef: toTxnRef(sub.id), amount: 500000 });

    expect((await ipn(query)).body).toEqual({ RspCode: '00', Message: 'Confirm Success' });
    // VNPay retries IPNs; the replay must not activate twice
    expect((await ipn(query)).body).toMatchObject({ RspCode: '02' });

    const after = await prisma.subscription.findUniqueOrThrow({ where: { id: sub.id } });
    expect(after.status).toBe('active');
    expect(after.vnp_transaction_no).toBe('14000000');
    expect(after.end_date!.getTime() - after.start_date!.getTime()).toBe(30 * 24 * 60 * MINUTE);
    expect(await prisma.outboxEvent.findMany({ select: { type: true } })).toEqual([{ type: 'payment.succeeded' }]);
  });

  test('a tampered signature is rejected (97) and changes nothing', async () => {
    const { sub } = await startPayment();
    const query = signedIpnQuery({ txnRef: toTxnRef(sub.id), amount: 500000 }).replace('vnp_Amount=50000000', 'vnp_Amount=100');
    expect((await ipn(query)).body).toMatchObject({ RspCode: '97' });
    expect((await prisma.subscription.findUniqueOrThrow({ where: { id: sub.id } })).status).toBe('pending');
  });

  test('a wrong amount is rejected (04)', async () => {
    const { sub } = await startPayment();
    expect((await ipn(signedIpnQuery({ txnRef: toTxnRef(sub.id), amount: 1000 }))).body).toMatchObject({ RspCode: '04' });
    expect((await prisma.subscription.findUniqueOrThrow({ where: { id: sub.id } })).status).toBe('pending');
  });

  test('an unknown order is 01', async () => {
    const query = signedIpnQuery({ txnRef: 'ffffffffffffffffffffffffffffffff', amount: 500000 });
    expect((await ipn(query)).body).toMatchObject({ RspCode: '01' });
  });

  test('a failed payment marks the order failed and queues a notice', async () => {
    const { sub } = await startPayment();
    expect((await ipn(signedIpnQuery({ txnRef: toTxnRef(sub.id), amount: 500000, responseCode: '24' }))).body).toMatchObject({ RspCode: '00' });
    expect(await prisma.subscription.findUniqueOrThrow({ where: { id: sub.id } })).toMatchObject({
      status: 'failed',
      failure_reason: 'vnpay_response_24',
    });
    expect(await prisma.outboxEvent.findMany({ select: { type: true } })).toEqual([{ type: 'payment.failed' }]);
  });

  test('a price change after checkout does not break the amount check (price snapshot)', async () => {
    const { pkg, sub } = await startPayment(500000);
    await prisma.package.update({ where: { id: pkg.id }, data: { price: 650000 } });
    expect((await ipn(signedIpnQuery({ txnRef: toTxnRef(sub.id), amount: 500000 }))).body).toMatchObject({ RspCode: '00' });
  });

  test('the browser return URL only redirects; it never activates anything', async () => {
    const { sub } = await startPayment();
    const res = await request(app).get(`/api/vnpay/check-payment-vnpay?${signedIpnQuery({ txnRef: toTxnRef(sub.id), amount: 500000 })}`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`${env.frontendUrl}/payment-success`);
    expect((await prisma.subscription.findUniqueOrThrow({ where: { id: sub.id } })).status).toBe('pending');
  });
});

describe('reconciliation (IPN never arrived)', () => {
  const later = (minutes: number) => new Date(Date.now() + minutes * MINUTE);

  test('orders inside the grace period are left alone', async () => {
    await startPayment();
    expect((await reconcileOnce({ gateway })).checked).toBe(0);
    expect(gateway.queries).toHaveLength(0);
  });

  test('VNPay says paid: the membership is activated through the same path as the IPN', async () => {
    const { sub } = await startPayment();
    gateway.answer = () => ({ verified: true, responseCode: '00', transactionStatus: '00', amount: 500000, transactionNo: '777' });

    const stats = await reconcileOnce({ gateway, now: later(env.vnpay.reconcileGraceMinutes + 1) });

    expect(stats).toMatchObject({ checked: 1, activated: 1 });
    expect(gateway.queries).toEqual([toTxnRef(sub.id)]);
    expect(await prisma.subscription.findUniqueOrThrow({ where: { id: sub.id } })).toMatchObject({
      status: 'active',
      vnp_transaction_no: '777',
    });
    expect(await prisma.outboxEvent.findMany({ select: { type: true, payload: true } })).toEqual([
      { type: 'payment.succeeded', payload: expect.objectContaining({ source: 'reconciler' }) },
    ]);
  });

  test('not paid yet: the order stays pending and is asked about again later, with backoff', async () => {
    const { sub } = await startPayment();
    gateway.answer = () => ({ verified: true, responseCode: '00', transactionStatus: '01' });
    const now = later(env.vnpay.reconcileGraceMinutes + 1);

    expect(await reconcileOnce({ gateway, now })).toMatchObject({ stillPending: 1 });
    const after = await prisma.subscription.findUniqueOrThrow({ where: { id: sub.id } });
    expect(after).toMatchObject({ status: 'pending', reconcile_attempts: 1 });
    expect(after.next_reconcile_at!.getTime()).toBeGreaterThan(now.getTime());

    // Asked again immediately: not due, so VNPay is not called a second time.
    expect((await reconcileOnce({ gateway, now })).checked).toBe(0);
  });

  test('never paid and the payment link has expired: the order is marked failed', async () => {
    const { sub } = await startPayment();
    gateway.answer = () => ({ verified: true, responseCode: '91' }); // transaction not found
    const afterExpiry = later(env.vnpay.paymentExpiryMinutes + env.vnpay.reconcileGraceMinutes + 1);

    expect(await reconcileOnce({ gateway, now: afterExpiry })).toMatchObject({ failed: 1 });
    expect(await prisma.subscription.findUniqueOrThrow({ where: { id: sub.id } })).toMatchObject({
      status: 'failed',
      failure_reason: 'expired_unpaid',
    });
  });

  test('an unverifiable VNPay answer is never acted on', async () => {
    const { sub } = await startPayment();
    gateway.answer = () => ({ verified: false, responseCode: '00', transactionStatus: '00', amount: 500000 });
    expect(await reconcileOnce({ gateway, now: later(30) })).toMatchObject({ errors: 1, activated: 0 });
    expect((await prisma.subscription.findUniqueOrThrow({ where: { id: sub.id } })).status).toBe('pending');
  });

  test('a VNPay outage is retried later, not treated as "unpaid"', async () => {
    const { sub } = await startPayment();
    gateway.answer = () => {
      throw new Error('ECONNRESET');
    };
    expect(await reconcileOnce({ gateway, now: later(30) })).toMatchObject({ errors: 1 });
    expect((await prisma.subscription.findUniqueOrThrow({ where: { id: sub.id } })).status).toBe('pending');
  });

  test('two workers reconciling at once ask VNPay about each order only once', async () => {
    for (let i = 0; i < 6; i++) await startPayment();
    gateway.answer = async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return { verified: true, responseCode: '00', transactionStatus: '01' };
    };
    const now = later(30);
    await Promise.all([reconcileOnce({ gateway, now, limit: 3 }), reconcileOnce({ gateway, now, limit: 3 })]);
    expect(gateway.queries).toHaveLength(6);
    expect(new Set(gateway.queries).size).toBe(6);
  });

  test('paid but with an unexpected amount: no automatic decision, flagged for review, not re-queried', async () => {
    const { sub } = await startPayment();
    gateway.answer = () => ({ verified: true, responseCode: '00', transactionStatus: '00', amount: 1000 });
    expect(await reconcileOnce({ gateway, now: later(30) })).toMatchObject({ needsReview: 1, activated: 0 });
    expect(await prisma.subscription.findUniqueOrThrow({ where: { id: sub.id } })).toMatchObject({
      status: 'pending',
      failure_reason: 'amount_mismatch',
    });
    expect((await reconcileOnce({ gateway, now: later(60 * 24 * 365) })).checked).toBe(0);
  });

  test('VNPay keeps erroring: after the attempt cap the order is flagged for review, not failed', async () => {
    const { sub } = await startPayment();
    await prisma.subscription.update({ where: { id: sub.id }, data: { reconcile_attempts: 39 } });
    gateway.answer = () => ({ verified: true, responseCode: '99' });
    await reconcileOnce({ gateway, now: later(30) });
    expect(await prisma.subscription.findUniqueOrThrow({ where: { id: sub.id } })).toMatchObject({
      status: 'pending',
      failure_reason: 'reconcile_gave_up',
    });
  });

  test('a genuine payment arriving after we gave up on the order still activates it', async () => {
    const { sub } = await startPayment();
    gateway.answer = () => ({ verified: true, responseCode: '91' });
    await reconcileOnce({ gateway, now: later(env.vnpay.paymentExpiryMinutes + env.vnpay.reconcileGraceMinutes + 1) });
    expect((await prisma.subscription.findUniqueOrThrow({ where: { id: sub.id } })).status).toBe('failed');

    expect((await ipn(signedIpnQuery({ txnRef: toTxnRef(sub.id), amount: 500000 }))).body).toMatchObject({ RspCode: '00' });
    expect(await prisma.subscription.findUniqueOrThrow({ where: { id: sub.id } })).toMatchObject({ status: 'active', failure_reason: null });
  });

  test('a success IPN for an order VNPay itself reported failed is not activated', async () => {
    const { sub } = await startPayment();
    await ipn(signedIpnQuery({ txnRef: toTxnRef(sub.id), amount: 500000, responseCode: '24' }));
    expect((await ipn(signedIpnQuery({ txnRef: toTxnRef(sub.id), amount: 500000 }))).body).toMatchObject({ RspCode: '02' });
    expect((await prisma.subscription.findUniqueOrThrow({ where: { id: sub.id } })).status).toBe('failed');
  });

  test('IPN and reconciler racing on the same order: activated exactly once, one receipt', async () => {
    for (let round = 0; round < 10; round++) {
      await resetDb();
      const { sub } = await startPayment();
      await Promise.all([
        ipn(signedIpnQuery({ txnRef: toTxnRef(sub.id), amount: 500000 })),
        applyPaymentResult(sub.id, { success: true, amount: 500000, source: 'reconciler' }),
      ]);
      expect((await prisma.subscription.findUniqueOrThrow({ where: { id: sub.id } })).status).toBe('active');
      expect(await prisma.outboxEvent.count({ where: { type: 'payment.succeeded' } })).toBe(1);
    }
  });
});
