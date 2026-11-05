const sent: { to: string; subject: string }[] = [];
let failNext = false;
jest.mock('nodemailer', () => ({
  createTransport: () => ({
    sendMail: jest.fn(async (mail: { to: string; subject: string }) => {
      if (failNext) {
        failNext = false;
        throw new Error('SMTP 421');
      }
      sent.push({ to: mail.to, subject: mail.subject });
    }),
  }),
}));

import { bookClass, cancelBooking } from '../../src/services/booking/bookingService';
import { outboxHandlers } from '../../src/services/outbox/handlers';
import { dispatchOnce } from '../../src/services/outbox/outbox';
import { applyPaymentResult } from '../../src/services/payment/paymentService';
import { createClass, createMember, createPackage, prisma, resetDb } from '../helpers/db';

beforeAll(() => {
  process.env.EMAIL_USER = 'gym@example.com';
  process.env.EMAIL_PASSWORD = 'x';
});
beforeEach(async () => {
  await resetDb();
  sent.length = 0;
});
afterAll(async () => {
  delete process.env.EMAIL_USER;
  delete process.env.EMAIL_PASSWORD;
  await prisma.$disconnect();
});

async function promotion() {
  const cls = await createClass({ capacity: 1, name: 'Boxing' });
  const holder = await createMember();
  const waiter = await createMember({ email: 'waiter@example.com' });
  const { booking } = await bookClass({ memberId: holder.id, classId: cls.id });
  await bookClass({ memberId: waiter.id, classId: cls.id, joinWaitlist: true });
  await cancelBooking({ bookingId: booking.id, actor: { userType: 'member', userId: holder.id } });
  return { cls, waiter };
}

test('a promotion e-mails the promoted member', async () => {
  await promotion();
  expect(await dispatchOnce(outboxHandlers)).toMatchObject({ done: 1 });
  expect(sent).toEqual([{ to: 'waiter@example.com', subject: 'You got a seat in Boxing' }]);
});

test('a stale promotion (member cancelled meanwhile) is acknowledged without e-mail', async () => {
  const { cls, waiter } = await promotion();
  const b = await prisma.booking.findUniqueOrThrow({ where: { member_id_class_id: { member_id: waiter.id, class_id: cls.id } } });
  await cancelBooking({ bookingId: b.id, actor: { userType: 'member', userId: waiter.id } });

  expect(await dispatchOnce(outboxHandlers)).toMatchObject({ done: 1 });
  expect(sent).toHaveLength(0);
});

test('an SMTP failure leaves the event for a retry', async () => {
  await promotion();
  failNext = true;
  expect(await dispatchOnce(outboxHandlers)).toMatchObject({ retried: 1 });
  expect(await dispatchOnce(outboxHandlers, { now: new Date(Date.now() + 60_000) })).toMatchObject({ done: 1 });
  expect(sent).toHaveLength(1);
});

test('payment receipt and failure notices', async () => {
  const pkg = await createPackage({ name: 'Premium 3 Months', price: 1300000 });
  const m = await createMember({ email: 'payer@example.com' });
  const ok = await prisma.subscription.create({ data: { member_id: m.id, package_id: pkg.id, status: 'pending', amount: 1300000 } });
  const ko = await prisma.subscription.create({ data: { member_id: m.id, package_id: pkg.id, status: 'pending', amount: 1300000 } });

  await applyPaymentResult(ok.id, { success: true, amount: 1300000, source: 'ipn' });
  await applyPaymentResult(ko.id, { success: false, reason: 'vnpay_response_24', source: 'ipn' });
  await dispatchOnce(outboxHandlers);

  expect(sent.map((s) => s.subject).sort()).toEqual(['Your ELEVATE Gym membership is active', 'Your ELEVATE Gym payment did not go through']);
});
