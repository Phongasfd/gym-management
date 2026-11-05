import type { Prisma } from '@prisma/client';
import { AppError } from '../lib/AppError';
import { endpoint } from '../lib/endpoint';
import { pageArgs, pageQuery, toPage } from '../lib/pagination';
import { prisma } from '../lib/prisma';
import { z } from '../lib/zod';
import { dateInput, idParams, name, optional } from '../schemas/common';
import * as bookings from '../services/booking/bookingService';

const waitlistCount = { _count: { select: { bookings: { where: { status: 'waitlisted' as const } } } } };

type ClassWithWaitlist = Prisma.ClassGetPayload<{ include: typeof waitlistCount }>;

function present({ _count, ...cls }: ClassWithWaitlist) {
  return { ...cls, bookedSlots: cls.booked_count, waitlistCount: _count.bookings };
}

export const listClasses = endpoint(
  {
    summary: 'List classes, soonest first',
    auth: 'public',
    query: pageQuery.extend({ from: optional(dateInput), to: optional(dateInput) }),
  },
  async ({ query, res }) => {
    const rows = await prisma.class.findMany({
      where: { schedule_time: { gte: query.from, lte: query.to } },
      include: waitlistCount,
      orderBy: [{ schedule_time: 'asc' }, { id: 'asc' }],
      ...pageArgs(query),
    });
    const page = toPage(rows, query.limit);
    res.json({ ...page, data: page.data.map(present) });
  },
);

// "Today" in the gym's time zone, not the server's (servers usually run on UTC).
function todayBoundsInVietnam(now = new Date()) {
  const offsetMs = 7 * 60 * 60 * 1000;
  const local = new Date(now.getTime() + offsetMs);
  const startLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  return { start: new Date(startLocal - offsetMs), end: new Date(startLocal - offsetMs + 24 * 60 * 60 * 1000 - 1) };
}

export const todayClasses = endpoint({ summary: "Today's classes and booked seats", auth: 'user' }, async ({ res }) => {
  const { start, end } = todayBoundsInVietnam();
  const classes = await prisma.class.findMany({
    where: { schedule_time: { gte: start, lte: end } },
    include: waitlistCount,
    orderBy: [{ schedule_time: 'asc' }, { id: 'asc' }],
  });
  res.json({
    count: classes.length,
    totalBookingsToday: classes.reduce((sum, cls) => sum + cls.booked_count, 0),
    classes: classes.map(present),
  });
});

export const classMembers = endpoint(
  { summary: 'Members booked into a class, then the waitlist in order (staff)', auth: 'staff', params: idParams },
  async ({ params, res }) => {
    const rows = await prisma.booking.findMany({
      where: { class_id: params.id, status: { in: ['active', 'waitlisted'] } },
      include: { member: { select: { id: true, full_name: true, phone: true, email: true } } },
      orderBy: [{ status: 'asc' }, { waitlist_seq: 'asc' }, { created_at: 'asc' }, { id: 'asc' }],
    });
    // enum order is active < waitlisted, so booked members come first
    let position = 0;
    res.json(
      rows.map((b) => ({
        ...b.member,
        bookingId: b.id,
        bookingStatus: b.status,
        waitlistPosition: b.status === 'waitlisted' ? ++position : null,
      })),
    );
  },
);

export const getClass = endpoint({ summary: 'Get a class', auth: 'user', params: idParams }, async ({ params, res }) => {
  const cls = await prisma.class.findUnique({ where: { id: params.id }, include: waitlistCount });
  if (!cls) throw new AppError('Class not found', 404);
  res.json(present(cls));
});

const classFields = z.object({
  name,
  coach_name: optional(z.string().trim().max(120)),
  schedule_time: dateInput,
  end_time: optional(dateInput),
  capacity: z.coerce.number().int().min(1).max(1000),
});

function checkTimes(data: { schedule_time?: Date; end_time?: Date }, ctx: z.RefinementCtx) {
  if (data.schedule_time && data.end_time && data.end_time <= data.schedule_time) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['end_time'], message: 'end_time must be after schedule_time' });
  }
}

export const createClass = endpoint(
  { summary: 'Schedule a class (staff)', auth: 'staff', body: classFields.superRefine(checkTimes), responses: { 201: 'Created' } },
  async ({ body, res }) => {
    const cls = await prisma.class.create({ data: body });
    res.status(201).json(cls);
  },
);

export const updateClass = endpoint(
  {
    summary: 'Edit a class (staff)',
    description: 'Raising the capacity promotes waitlisted members into the new seats. Lowering it below the seats already booked returns 409.',
    auth: 'staff',
    params: idParams,
    body: classFields.partial().superRefine(checkTimes),
  },
  async ({ params, body, res }) => {
    const result = await bookings.updateClass(params.id, body);
    res.json({ ...result.class, promotedBookingIds: result.promotedBookingIds });
  },
);

export const deleteClass = endpoint({ summary: 'Delete a class and its bookings (staff)', auth: 'staff', params: idParams }, async ({ params, res }) => {
  await prisma.class.delete({ where: { id: params.id } });
  res.json({ message: 'Class deleted successfully' });
});
