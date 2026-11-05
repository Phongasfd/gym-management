import { AppError } from '../lib/AppError';
import { endpoint } from '../lib/endpoint';
import { pageArgs, pageQuery, toPage } from '../lib/pagination';
import { prisma } from '../lib/prisma';
import { z } from '../lib/zod';
import { dateInput, email, gender, idParams, name, optional, phone } from '../schemas/common';

// Never send password hashes or reset codes to a client.
const publicMember = {
  id: true,
  full_name: true,
  email: true,
  phone: true,
  gender: true,
  date_of_birth: true,
  isProfileComplete: true,
  created_at: true,
  updated_at: true,
} as const;

const memberFields = z.object({
  full_name: name,
  email,
  phone: optional(phone),
  gender: optional(gender),
  date_of_birth: optional(dateInput),
});

export const createMember = endpoint(
  { summary: 'Create a member (staff)', auth: 'staff', body: memberFields, responses: { 201: 'Created', 409: 'E-mail already registered' } },
  async ({ body, res }) => {
    const member = await prisma.member.create({ data: body, select: publicMember });
    res.status(201).json(member);
  },
);

export const listMembers = endpoint(
  { summary: 'List members (staff)', auth: 'staff', query: pageQuery.extend({ search: optional(z.string().trim().max(100)) }) },
  async ({ query, res }) => {
    const rows = await prisma.member.findMany({
      where: query.search
        ? { OR: [{ full_name: { contains: query.search, mode: 'insensitive' } }, { email: { contains: query.search, mode: 'insensitive' } }] }
        : undefined,
      select: publicMember,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      ...pageArgs(query),
    });
    res.json(toPage(rows, query.limit));
  },
);

export const activeMemberCount = endpoint({ summary: 'Members with a membership valid today (staff)', auth: 'staff' }, async ({ res }) => {
  const now = new Date();
  const activeCount = await prisma.member.count({
    where: { subscriptions: { some: { status: 'active', start_date: { lte: now }, end_date: { gte: now } } } },
  });
  res.json({ activeCount });
});

export const membersOverview = endpoint(
  {
    summary: 'Members with their current package and last check-in (staff)',
    auth: 'staff',
    query: z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(10),
    }),
  },
  async ({ query, res }) => {
    const { page, limit } = query;
    const [members, total] = await prisma.$transaction([
      prisma.member.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ full_name: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          full_name: true,
          phone: true,
          subscriptions: {
            where: { status: 'active' },
            take: 1,
            orderBy: { end_date: 'desc' },
            select: { status: true, end_date: true, package: { select: { name: true } } },
          },
          checkins: { take: 1, orderBy: { checkin_time: 'desc' }, select: { checkin_time: true, source: true } },
        },
      }),
      prisma.member.count(),
    ]);

    res.json({
      data: members.map((member) => {
        const sub = member.subscriptions[0];
        const checkin = member.checkins[0];
        return {
          id: member.id,
          name: member.full_name,
          phone: member.phone,
          packageName: sub?.package.name ?? '—',
          status: sub?.status ?? 'none',
          expiryDate: sub?.end_date ?? null,
          lastCheckin: checkin ? { time: checkin.checkin_time, source: checkin.source } : null,
        };
      }),
      pagination: { page, limit, totalItems: total, totalPages: Math.ceil(total / limit) },
    });
  },
);

export const getMember = endpoint({ summary: 'Get a member (staff)', auth: 'staff', params: idParams }, async ({ params, res }) => {
  const member = await prisma.member.findUnique({ where: { id: params.id }, select: publicMember });
  if (!member) throw new AppError('Member not found', 404);
  res.json(member);
});

export const updateMember = endpoint(
  { summary: 'Edit a member (staff)', auth: 'staff', params: idParams, body: memberFields.partial() },
  async ({ params, body, res }) => {
    const member = await prisma.member.update({ where: { id: params.id }, data: body, select: publicMember });
    res.json(member);
  },
);
