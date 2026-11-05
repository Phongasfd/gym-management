import { prisma } from '../lib/prisma';

// Marks active memberships whose end date has passed. Run by the worker; it used to run inside
// GET requests, which made reads write and raced with each other.
export async function expireSubscriptions(now = new Date()): Promise<number> {
  const result = await prisma.subscription.updateMany({
    where: { status: 'active', end_date: { lte: now } },
    data: { status: 'expired' },
  });
  return result.count;
}
