import crypto from 'crypto';
import { VNPay, ignoreLogger, ProductCode, VnpLocale, type QueryDr, type ReturnQueryFromVNPay } from 'vnpay';
import { env } from '../../config/env';
import { formatVnpDate } from '../../lib/vnpDate';

// Everything the app needs from VNPay, behind an interface so tests can use a fake gateway.
export interface PaymentGateway {
  buildPaymentUrl(input: { txnRef: string; amount: number; ipAddr: string; createDate: string; expireDate: string }): string;
  verifyCallback(query: Record<string, unknown>): { verified: boolean; success: boolean; amount: number; responseCode: string; transactionNo?: string };
  queryTransaction(input: { txnRef: string; transactionDate: string }): Promise<GatewayQueryResult>;
}

export interface GatewayQueryResult {
  verified: boolean; // response signature matched
  responseCode: string; // API result: '00' = the query itself succeeded, '91' = transaction not found
  transactionStatus?: string; // payment state: '00' = paid, '01' = not finished yet, others = failed
  amount?: number; // VND (VNPay's x100 already removed)
  transactionNo?: string;
  message?: string;
}

const ORDER_INFO = 'Thanh toan goi tap';

// The subscription id (a UUID) without dashes is the VNPay transaction reference.
export function toTxnRef(subscriptionId: string) {
  return subscriptionId.replace(/-/g, '');
}

export function fromTxnRef(txnRef: string) {
  return txnRef.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
}

export class VnpayGateway implements PaymentGateway {
  private readonly client = new VNPay({
    tmnCode: env.vnpay.tmnCode,
    secureSecret: env.vnpay.hashSecret,
    vnpayHost: env.vnpay.url,
    testMode: !env.isProd,
    hashAlgorithm: 'SHA512' as never,
    loggerFn: ignoreLogger,
  });

  buildPaymentUrl(input: { txnRef: string; amount: number; ipAddr: string; createDate: string; expireDate: string }) {
    return this.client.buildPaymentUrl({
      vnp_Amount: input.amount, // the library multiplies by 100
      vnp_IpAddr: input.ipAddr,
      vnp_TxnRef: input.txnRef,
      vnp_OrderInfo: ORDER_INFO,
      vnp_OrderType: ProductCode.Other,
      vnp_ReturnUrl: env.vnpay.returnUrl,
      vnp_Locale: VnpLocale.VN,
      vnp_CreateDate: Number(input.createDate),
      vnp_ExpireDate: Number(input.expireDate),
    });
  }

  verifyCallback(query: Record<string, unknown>) {
    const result = this.client.verifyIpnCall(query as unknown as ReturnQueryFromVNPay);
    return {
      verified: result.isVerified,
      success: result.isSuccess,
      amount: Number(result.vnp_Amount), // already divided by 100
      responseCode: String(result.vnp_ResponseCode ?? ''),
      transactionNo: result.vnp_TransactionNo !== undefined ? String(result.vnp_TransactionNo) : undefined,
    };
  }

  async queryTransaction({ txnRef, transactionDate }: { txnRef: string; transactionDate: string }) {
    const query = {
      vnp_RequestId: crypto.randomBytes(8).toString('hex'),
      vnp_IpAddr: '127.0.0.1',
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: `Truy van giao dich ${txnRef}`,
      vnp_TransactionDate: Number(transactionDate),
      vnp_CreateDate: Number(formatVnpDate(new Date())),
    } as unknown as QueryDr; // vnp_TransactionNo is typed as required but is not part of the request hash
    const res = await this.client.queryDr(query);
    return {
      // vnpay 2.4.4 only marks a response unverified when a hash is present and wrong, so a
      // response with no hash at all would count as verified. Require the hash.
      verified: res.isVerified && typeof res.vnp_SecureHash === 'string' && res.vnp_SecureHash.length > 0,
      responseCode: String(res.vnp_ResponseCode ?? ''),
      transactionStatus: res.vnp_TransactionStatus !== undefined ? String(res.vnp_TransactionStatus) : undefined,
      amount: res.vnp_Amount !== undefined ? Number(res.vnp_Amount) / 100 : undefined,
      transactionNo: res.vnp_TransactionNo !== undefined ? String(res.vnp_TransactionNo) : undefined,
      message: res.message,
    };
  }
}

let gateway: PaymentGateway | undefined;

export function getGateway(): PaymentGateway {
  gateway ??= new VnpayGateway();
  return gateway;
}

// Tests swap in a fake.
export function setGateway(next: PaymentGateway | undefined) {
  gateway = next;
}
