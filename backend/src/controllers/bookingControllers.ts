import { AppError } from '../lib/AppError';
import { endpoint } from '../lib/endpoint';
import { pageArgs, pageQuery, toPage } from '../lib/pagination';
import { prisma } from '../lib/prisma';
import { z } from '../lib/zod';
import { idParams } from '../schemas/common';
import * as bookings from '../services/booking/bookingService';

export const listBookings = endpoint(
  {
    summary: 'List bookings (staff)',
    auth: 'staff',
    query: pageQuery.extend({
      class_id: z.string().uuid().optional(),
      status: z.enum(['active', 'waitlisted', 'cancelled']).optional(),
    }),
  },
  async ({ query, res }) => {
    const rows = await prisma.booking.findMany({
      where: { class_id: query.class_id, status: query.status },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      ...pageArgs(query),
    });
    res.json(toPage(rows, query.limit));
  },
);

export const myBookings = endpoint(
  { summary: "The current member's bookings, with waitlist positions", auth: 'member' },
  async ({ auth, res }) => {
    res.json(await bookings.listMemberBookings(auth.userId));
  },
);

export const getBooking = endpoint({ summary: 'Get a booking (staff)', auth: 'staff', params: idParams }, async ({ params, res }) => {
  const booking = await prisma.booking.findUnique({ where: { id: params.id } });
  if (!booking) throw new AppError('Booking not found', 404);
  res.json(booking);
});

export const createBooking = endpoint(
  {
    summary: 'Book a class, or join its waitlist when it is full',
    description:
      'Without `waitlist: true` a full class returns 409 CLASS_FULL. With it, the member joins the waitlist ' +
      'and is promoted automatically (and e-mailed) when a seat frees up.',
    auth: 'member',
    body: z.object({ class_id: z.string().uuid(), waitlist: z.boolean().default(false) }),
    responses: {
      201: 'Booked (outcome "booked") or waitlisted (outcome "waitlisted", with waitlistPosition)',
      404: 'Class not found',
      409: 'CLASS_FULL, ALREADY_BOOKED, ALREADY_WAITLISTED or BOOKING_CONFLICT',
    },
  },
  async ({ body, auth, res }) => {
    const result = await bookings.bookClass({ memberId: auth.userId, classId: body.class_id, joinWaitlist: body.waitlist });
    res.status(201).json({ ...result.booking, outcome: result.outcome, waitlistPosition: result.waitlistPosition ?? null });
  },
);

export const cancelBooking = endpoint(
  {
    summary: 'Cancel a booking or leave the waitlist',
    description: 'Members cancel their own bookings, staff any booking. Freeing a seat promotes the next waitlisted member.',
    auth: 'user',
    params: idParams,
    responses: { 200: 'Cancelled', 403: 'Not your booking', 404: 'Booking not found', 409: 'Already cancelled' },
  },
  async ({ params, auth, res }) => {
    const { booking, promotedBookingIds } = await bookings.cancelBooking({ bookingId: params.id, actor: auth });
    res.json({ ...booking, promotedBookingIds });
  },
);

export const deleteBooking = endpoint(
  { summary: 'Delete a booking permanently (staff)', auth: 'staff', params: idParams },
  async ({ params, res }) => {
    const { booking, promotedBookingIds } = await bookings.deleteBooking(params.id);
    res.json({ message: 'Booking deleted successfully', booking, promotedBookingIds });
  },
);
