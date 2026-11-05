import { request, type APIRequestContext } from '@playwright/test';
import crypto from 'crypto';
import { E2E } from './env';

// Talks to the API directly to arrange test data (what staff or other members would do), so each
// browser test only clicks through the part it is about.

async function session(): Promise<{ api: APIRequestContext; csrf: string }> {
  const api = await request.newContext({ baseURL: E2E.apiUrl });
  const res = await api.get('/api/auth/csrf-token');
  const { csrfToken } = (await res.json()) as { csrfToken: string };
  return { api, csrf: csrfToken };
}

async function expectOk(res: Awaited<ReturnType<APIRequestContext['get']>>, what: string) {
  if (!res.ok()) throw new Error(`${what} failed: ${res.status()} ${await res.text()}`);
  return res.json();
}

export async function asStaff() {
  const { api, csrf } = await session();
  await expectOk(await api.post('/api/auth/staff-login', { data: E2E.staff, headers: { 'X-CSRF-Token': csrf } }), 'staff login');
  return {
    createClass: (data: { name: string; capacity: number; startsInMinutes?: number }) =>
      api
        .post('/api/classes', {
          headers: { 'X-CSRF-Token': csrf },
          data: {
            name: data.name,
            capacity: data.capacity,
            coach_name: 'E2E Coach',
            schedule_time: new Date(Date.now() + (data.startsInMinutes ?? 120) * 60_000).toISOString(),
          },
        })
        .then((r) => expectOk(r, 'create class')) as Promise<{ id: string; name: string }>,
    dispose: () => api.dispose(),
  };
}

let seq = 0;

// Registers a member with a password, so the browser can log in as them.
export async function newMember(label: string) {
  const email = `${label}-${Date.now()}-${seq++}@e2e.local`;
  const password = 'e2e-member-password';
  const { api, csrf } = await session();
  await expectOk(
    await api.post('/api/auth/member-register', {
      headers: { 'X-CSRF-Token': csrf },
      data: { full_name: `E2E ${label}`, email, password, phone: '0900000001', gender: 'other', date_of_birth: '1995-05-05' },
    }),
    'register',
  );
  await expectOk(await api.post('/api/auth/member-login', { headers: { 'X-CSRF-Token': csrf }, data: { email, password } }), 'member login');
  return {
    email,
    password,
    book: (classId: string) =>
      api.post('/api/bookings', { headers: { 'X-CSRF-Token': csrf }, data: { class_id: classId } }).then((r) => expectOk(r, 'book')) as Promise<{ id: string }>,
    cancel: (bookingId: string) =>
      api.post(`/api/bookings/${bookingId}/cancel`, { headers: { 'X-CSRF-Token': csrf } }).then((r) => expectOk(r, 'cancel')),
    dispose: () => api.dispose(),
  };
}

// What VNPay's server does after a successful payment: a signed GET to the IPN URL.
// Signature = HMAC-SHA512 over the sorted query string, as in the VNPay spec.
export async function sendVnpayIpn(paymentUrl: string) {
  const url = new URL(paymentUrl);
  const fields: Record<string, string> = {
    vnp_Amount: url.searchParams.get('vnp_Amount') as string,
    vnp_BankCode: 'NCB',
    vnp_OrderInfo: url.searchParams.get('vnp_OrderInfo') as string,
    vnp_PayDate: url.searchParams.get('vnp_CreateDate') as string,
    vnp_ResponseCode: '00',
    vnp_TmnCode: E2E.vnpTmnCode,
    vnp_TransactionNo: '14999999',
    vnp_TransactionStatus: '00',
    vnp_TxnRef: url.searchParams.get('vnp_TxnRef') as string,
  };
  const params = new URLSearchParams();
  for (const key of Object.keys(fields).sort()) params.append(key, fields[key]);
  params.append('vnp_SecureHash', crypto.createHmac('sha512', E2E.vnpHashSecret).update(Buffer.from(params.toString(), 'utf-8')).digest('hex'));

  const api = await request.newContext({ baseURL: E2E.apiUrl });
  const res = await api.get(`/api/vnpay/vnpay-ipn?${params.toString()}`);
  const body = await res.json();
  await api.dispose();
  return body as { RspCode: string };
}
