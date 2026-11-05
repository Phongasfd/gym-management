import { buildPaymentUrlSearchParams, calculateSecureHash } from 'vnpay';
import type { GatewayQueryResult, PaymentGateway } from '../../src/services/payment/vnpayGateway';
import { VnpayGateway } from '../../src/services/payment/vnpayGateway';

// Builds the query string VNPay sends to the IPN URL, signed with the test secret the same way
// VNPay signs it (sorted params, HMAC-SHA512). Only the signature is fake-able by us because we
// hold the secret, which is the point.
export function signedIpnQuery(params: { txnRef: string; amount: number; responseCode?: string; transactionNo?: string }) {
  const data: Record<string, string> = {
    vnp_Amount: String(params.amount * 100),
    vnp_BankCode: 'NCB',
    vnp_OrderInfo: 'Thanh toan goi tap',
    vnp_PayDate: '20261105120000',
    vnp_ResponseCode: params.responseCode ?? '00',
    vnp_TmnCode: process.env.VNP_TMN_CODE as string,
    vnp_TransactionNo: params.transactionNo ?? '14000000',
    vnp_TransactionStatus: params.responseCode ?? '00',
    vnp_TxnRef: params.txnRef,
  };
  const search = buildPaymentUrlSearchParams(data);
  const hash = calculateSecureHash({
    secureSecret: process.env.VNP_HASH_SECRET as string,
    data: search.toString(),
    hashAlgorithm: 'SHA512' as never,
    bufferEncode: 'utf-8',
  });
  search.append('vnp_SecureHash', hash);
  return search.toString();
}

// Real signing/verification, scripted querydr answers (no network).
export class FakeGateway implements PaymentGateway {
  private readonly real = new VnpayGateway();
  readonly queries: string[] = [];
  answer: (txnRef: string) => GatewayQueryResult | Promise<GatewayQueryResult> = () => ({ verified: true, responseCode: '91' });

  buildPaymentUrl(input: Parameters<PaymentGateway['buildPaymentUrl']>[0]) {
    return this.real.buildPaymentUrl(input);
  }
  verifyCallback(query: Record<string, unknown>) {
    return this.real.verifyCallback(query);
  }
  async queryTransaction({ txnRef }: { txnRef: string; transactionDate: string }) {
    this.queries.push(txnRef);
    return this.answer(txnRef);
  }
}
