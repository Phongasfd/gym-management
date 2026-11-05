import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { sendPaymentFailedEmail, sendPaymentReceiptEmail, sendSeatAvailableEmail } from '../emailService';
import type { OutboxHandlers } from './outbox';

// Delivery is at least once: a handler can run twice for one event (worker crash after sending,
// before marking it done). Here the worst case is a duplicate e-mail, which is acceptable.
// Handlers re-read current state instead of trusting the payload, so a stale event is harmless.
export const outboxHandlers: OutboxHandlers = {
  async 'booking.promoted'({ bookingId }) {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { member: true, class: true } });
    if (!booking || booking.status !== 'active') {
      logger.info('Promotion no longer valid, not notifying', { type: 'OUTBOX_SKIP', bookingId });
      return;
    }
    if (!booking.member.email) return;
    await sendSeatAvailableEmail({
      to: booking.member.email,
      memberName: booking.member.full_name,
      className: booking.class.name,
      startsAt: booking.class.schedule_time,
    });
  },

  async 'payment.succeeded'({ subscriptionId }) {
    const sub = await prisma.subscription.findUnique({ where: { id: subscriptionId }, include: { member: true, package: true } });
    if (!sub?.member.email) return;
    await sendPaymentReceiptEmail({
      to: sub.member.email,
      memberName: sub.member.full_name,
      packageName: sub.package.name,
      amount: Number(sub.amount ?? sub.package.price).toLocaleString('vi-VN'),
      endDate: sub.end_date,
    });
  },

  async 'payment.failed'({ subscriptionId }) {
    const sub = await prisma.subscription.findUnique({ where: { id: subscriptionId }, include: { member: true, package: true } });
    if (!sub?.member.email) return;
    await sendPaymentFailedEmail({ to: sub.member.email, memberName: sub.member.full_name, packageName: sub.package.name });
  },
};
