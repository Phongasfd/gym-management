import { env } from '../config/env';
import { endpoint } from '../lib/endpoint';
import { logger } from '../lib/logger';
import { z } from '../lib/zod';
import { createPaymentOrder, handleIpn } from '../services/payment/paymentService';
import { getGateway } from '../services/payment/vnpayGateway';

export const createPayment = endpoint(
  {
    summary: 'Start a VNPay payment for a package',
    description: 'Creates a pending subscription and returns the signed VNPay URL. The membership is activated by the IPN (or the reconciler), never by the browser.',
    auth: 'member',
    body: z.object({ packageId: z.string().uuid() }),
    responses: { 201: 'Payment URL (JSON string)', 404: 'Package not found' },
  },
  async ({ body, auth, req, res }) => {
    const ip = req.ip === '::1' || !req.ip ? '127.0.0.1' : req.ip.replace(/^::ffff:/, '');
    const { paymentUrl } = await createPaymentOrder({ memberId: auth.userId, packageId: body.packageId, ipAddr: ip });
    res.status(201).json(paymentUrl);
  },
);

// Where VNPay sends the member's browser. Display only: anyone can open this URL.
export const paymentReturn = endpoint({ summary: 'VNPay browser redirect (display only)', auth: 'public' }, async ({ req, res }) => {
  let ok = false;
  try {
    const result = getGateway().verifyCallback(req.query as Record<string, unknown>);
    ok = result.verified && result.responseCode === '00';
  } catch {
    ok = false;
  }
  if (!ok) logger.warn('Payment return not successful', { type: 'PAYMENT_RETURN', orderId: req.query.vnp_TxnRef });
  res.redirect(`${env.frontendUrl}/${ok ? 'payment-success' : 'payment-failed'}`);
});

export const paymentIpn = endpoint(
  {
    summary: 'VNPay IPN (server to server)',
    description: 'Signed by VNPay. Idempotent: repeated calls for a processed order return RspCode 02.',
    auth: 'public',
  },
  async ({ req, res }) => {
    res.json(await handleIpn(req.query as Record<string, unknown>));
  },
);
