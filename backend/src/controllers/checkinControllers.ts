import { endpoint } from '../lib/endpoint';
import { pageArgs, pageQuery, toPage } from '../lib/pagination';
import { prisma } from '../lib/prisma';
import { z } from '../lib/zod';
import { dateInput, optional } from '../schemas/common';

export const listCheckins = endpoint(
  {
    summary: 'List check-ins, newest first (staff)',
    auth: 'staff',
    query: pageQuery.extend({ member_id: z.string().uuid().optional() }),
  },
  async ({ query, res }) => {
    const rows = await prisma.checkin.findMany({
      where: { member_id: query.member_id },
      orderBy: [{ checkin_time: 'desc' }, { id: 'desc' }],
      ...pageArgs(query),
    });
    res.json(toPage(rows, query.limit));
  },
);

export const createCheckin = endpoint(
  {
    summary: 'Record a check-in (staff)',
    auth: 'staff',
    body: z.object({
      member_id: z.string().uuid(),
      checkin_time: optional(dateInput),
      source: optional(z.string().trim().max(50)),
    }),
    responses: { 201: 'Created' },
  },
  async ({ body, res }) => {
    const checkin = await prisma.checkin.create({
      data: { member_id: body.member_id, checkin_time: body.checkin_time ?? new Date(), source: body.source },
    });
    res.status(201).json(checkin);
  },
);
