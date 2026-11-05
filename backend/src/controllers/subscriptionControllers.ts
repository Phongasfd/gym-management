import { AppError } from '../lib/AppError';
import { endpoint } from '../lib/endpoint';
import { pageArgs, pageQuery, toPage } from '../lib/pagination';
import { prisma } from '../lib/prisma';
import { z } from '../lib/zod';
import { dateInput, idParams, optional } from '../schemas/common';

const subscriptionStatus = z.enum(['pending', 'active', 'failed', 'expired']);

// Staff record a membership paid at the desk; online payments go through /api/vnpay.
const subscriptionFields = z.object({
  member_id: z.string().uuid(),
  package_id: z.string().uuid(),
  start_date: optional(dateInput),
  end_date: optional(dateInput),
  status: subscriptionStatus.default('active'),
});

export const listSubscriptions = endpoint(
  {
    summary: 'List subscriptions (staff)',
    auth: 'staff',
    query: pageQuery.extend({ member_id: z.string().uuid().optional(), status: subscriptionStatus.optional() }),
  },
  async ({ query, res }) => {
    const rows = await prisma.subscription.findMany({
      where: { member_id: query.member_id, status: query.status },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      ...pageArgs(query),
    });
    res.json(toPage(rows, query.limit));
  },
);

export const mySubscriptions = endpoint({ summary: "The current member's subscriptions", auth: 'member' }, async ({ auth, res }) => {
  const rows = await prisma.subscription.findMany({
    where: { member_id: auth.userId },
    include: { package: { select: { id: true, name: true, duration_days: true } } },
    orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    take: 100,
  });
  res.json(rows);
});

export const getSubscription = endpoint({ summary: 'Get a subscription (staff)', auth: 'staff', params: idParams }, async ({ params, res }) => {
  const sub = await prisma.subscription.findUnique({ where: { id: params.id } });
  if (!sub) throw new AppError('Subscription not found', 404);
  res.json(sub);
});

export const createSubscription = endpoint(
  { summary: 'Record a membership sold at the desk (staff)', auth: 'staff', body: subscriptionFields, responses: { 201: 'Created' } },
  async ({ body, res }) => {
    const pkg = await prisma.package.findUnique({ where: { id: body.package_id } });
    if (!pkg) throw new AppError('Package not found', 404);
    const start = body.start_date ?? new Date();
    const sub = await prisma.subscription.create({
      data: {
        ...body,
        start_date: start,
        end_date: body.end_date ?? new Date(start.getTime() + pkg.duration_days * 24 * 60 * 60 * 1000),
        amount: pkg.price,
      },
    });
    res.status(201).json(sub);
  },
);

export const updateSubscription = endpoint(
  { summary: 'Edit a subscription (staff)', auth: 'staff', params: idParams, body: subscriptionFields.partial() },
  async ({ params, body, res }) => {
    res.json(await prisma.subscription.update({ where: { id: params.id }, data: body }));
  },
);
