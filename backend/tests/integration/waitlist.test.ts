import { createApp } from '../../src/app';
import { bookClass, cancelBooking } from '../../src/services/booking/bookingService';
import { classState, createClass, createMember, createMembers, prisma, resetDb } from '../helpers/db';
import { asMember, asStaff, client } from '../helpers/http';

const app = createApp();

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const member = (userId: string) => ({ userType: 'member' as const, userId });

async function fullClassWithWaitlist(capacity: number, waiting: number) {
  const cls = await createClass({ capacity });
  const holders = await createMembers(capacity);
  const waiters = await createMembers(waiting);
  const holderBookings = [];
  for (const m of holders) holderBookings.push((await bookClass({ memberId: m.id, classId: cls.id })).booking);
  // Sequential on purpose: queue order must be join order.
  for (const m of waiters) await bookClass({ memberId: m.id, classId: cls.id, joinWaitlist: true });
  return { cls, holders, waiters, holderBookings };
}

describe('joining', () => {
  test('a full class without waitlist=true returns 409 CLASS_FULL and says a waitlist exists', async () => {
    const { cls } = await fullClassWithWaitlist(1, 0);
    const m = await createMember();
    const res = await (await client(app, asMember(m.id))).post('/api/bookings', { class_id: cls.id });
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ code: 'CLASS_FULL', details: { waitlistAvailable: true } });
  });

  test('waitlist=true queues the member and returns their position', async () => {
    const { cls } = await fullClassWithWaitlist(1, 2);
    const m = await createMember();
    const res = await (await client(app, asMember(m.id))).post('/api/bookings', { class_id: cls.id, waitlist: true });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ status: 'waitlisted', outcome: 'waitlisted', waitlistPosition: 3 });
  });

  test('waitlist=true on a class with free seats simply books', async () => {
    const cls = await createClass({ capacity: 2 });
    const m = await createMember();
    const res = await (await client(app, asMember(m.id))).post('/api/bookings', { class_id: cls.id, waitlist: true });
    expect(res.body).toMatchObject({ status: 'active', outcome: 'booked', waitlistPosition: null });
  });

  test('cannot join twice', async () => {
    const { cls, waiters } = await fullClassWithWaitlist(1, 1);
    await expect(bookClass({ memberId: waiters[0].id, classId: cls.id, joinWaitlist: true })).rejects.toMatchObject({
      code: 'ALREADY_WAITLISTED',
    });
  });

  test('cannot book a class that has started', async () => {
    const cls = await createClass({ schedule_time: new Date(Date.now() - 60_000) });
    const m = await createMember();
    await expect(bookClass({ memberId: m.id, classId: cls.id })).rejects.toMatchObject({ code: 'CLASS_STARTED' });
  });
});

describe('promotion', () => {
  test('cancelling a seat promotes the first in line, queues an e-mail, and keeps the counter right', async () => {
    const { cls, holders, waiters, holderBookings } = await fullClassWithWaitlist(1, 3);

    const { promotedBookingIds } = await cancelBooking({ bookingId: holderBookings[0].id, actor: member(holders[0].id) });

    const first = await prisma.booking.findUniqueOrThrow({
      where: { member_id_class_id: { member_id: waiters[0].id, class_id: cls.id } },
    });
    expect(promotedBookingIds).toEqual([first.id]);
    expect(first).toMatchObject({ status: 'active', waitlisted_at: null, waitlist_seq: null });
    expect(await classState(cls.id)).toEqual({ bookedCount: 1, capacity: 1, active: 1, waitlisted: 2 });

    const events = await prisma.outboxEvent.findMany();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: 'booking.promoted', status: 'pending', payload: { bookingId: first.id, memberId: waiters[0].id } });
  });

  test('positions move up as the queue drains (GET /api/bookings/me)', async () => {
    const { holders, waiters, holderBookings } = await fullClassWithWaitlist(1, 3);
    const last = await client(app, asMember(waiters[2].id));

    expect((await last.get('/api/bookings/me')).body[0]).toMatchObject({ status: 'waitlisted', waitlistPosition: 3 });
    await cancelBooking({ bookingId: holderBookings[0].id, actor: member(holders[0].id) });
    expect((await last.get('/api/bookings/me')).body[0]).toMatchObject({ status: 'waitlisted', waitlistPosition: 2 });
  });

  test('leaving the waitlist frees no seat and promotes nobody', async () => {
    const { cls, waiters } = await fullClassWithWaitlist(1, 2);
    const w = await prisma.booking.findUniqueOrThrow({ where: { member_id_class_id: { member_id: waiters[0].id, class_id: cls.id } } });

    const { promotedBookingIds } = await cancelBooking({ bookingId: w.id, actor: member(waiters[0].id) });

    expect(promotedBookingIds).toEqual([]);
    expect(await classState(cls.id)).toEqual({ bookedCount: 1, capacity: 1, active: 1, waitlisted: 1 });
  });

  test('5 holders cancel at the same moment: 5 waiters are promoted, in queue order, no seat lost', async () => {
    const { cls, holders, waiters, holderBookings } = await fullClassWithWaitlist(5, 8);

    await Promise.all(holderBookings.map((b, i) => cancelBooking({ bookingId: b.id, actor: member(holders[i].id) })));

    expect(await classState(cls.id)).toEqual({ bookedCount: 5, capacity: 5, active: 5, waitlisted: 3 });
    const active = await prisma.booking.findMany({ where: { class_id: cls.id, status: 'active' } });
    expect(active.map((b) => b.member_id).sort()).toEqual(waiters.slice(0, 5).map((m) => m.id).sort());
  });

  test('the same booking cancelled twice at once frees one seat only', async () => {
    const { cls, holders, holderBookings } = await fullClassWithWaitlist(1, 2);
    const results = await Promise.allSettled([
      cancelBooking({ bookingId: holderBookings[0].id, actor: member(holders[0].id) }),
      cancelBooking({ bookingId: holderBookings[0].id, actor: member(holders[0].id) }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await classState(cls.id)).toEqual({ bookedCount: 1, capacity: 1, active: 1, waitlisted: 1 });
  });

  test('a cancellation after the class started frees the seat but promotes nobody', async () => {
    const { cls, holders, holderBookings } = await fullClassWithWaitlist(1, 1);
    await cancelBooking({ bookingId: holderBookings[0].id, actor: member(holders[0].id), now: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) });
    expect(await classState(cls.id)).toEqual({ bookedCount: 0, capacity: 1, active: 0, waitlisted: 1 });
  });

  test('staff raising the capacity promotes into the new seats', async () => {
    const { cls } = await fullClassWithWaitlist(2, 3);
    const staff = await client(app, asStaff());

    const res = await staff.patch(`/api/classes/${cls.id}`, { capacity: 4 });

    expect(res.status).toBe(200);
    expect(res.body.promotedBookingIds).toHaveLength(2);
    expect(await classState(cls.id)).toEqual({ bookedCount: 4, capacity: 4, active: 4, waitlisted: 1 });
  });

  test('staff cannot lower the capacity below the seats already booked', async () => {
    const { cls } = await fullClassWithWaitlist(3, 0);
    const res = await (await client(app, asStaff())).patch(`/api/classes/${cls.id}`, { capacity: 2 });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CAPACITY_BELOW_BOOKED');
  });

  test('staff deleting an active booking promotes the next member', async () => {
    const { cls, holderBookings } = await fullClassWithWaitlist(1, 1);
    const res = await (await client(app, asStaff())).delete(`/api/bookings/${holderBookings[0].id}`);
    expect(res.status).toBe(200);
    expect(res.body.promotedBookingIds).toHaveLength(1);
    expect(await classState(cls.id)).toEqual({ bookedCount: 1, capacity: 1, active: 1, waitlisted: 0 });
  });

  test('a member cannot cancel someone else’s booking; staff can', async () => {
    const { holderBookings } = await fullClassWithWaitlist(1, 0);
    const stranger = await createMember();
    const asStranger = await client(app, asMember(stranger.id));
    expect((await asStranger.post(`/api/bookings/${holderBookings[0].id}/cancel`)).status).toBe(403);
    expect((await (await client(app, asStaff())).post(`/api/bookings/${holderBookings[0].id}/cancel`)).status).toBe(200);
  });

  test('re-booking after cancelling reuses the row (unique member+class) and goes to the back of the queue', async () => {
    const { cls, waiters } = await fullClassWithWaitlist(1, 2);
    const first = await prisma.booking.findUniqueOrThrow({ where: { member_id_class_id: { member_id: waiters[0].id, class_id: cls.id } } });
    await cancelBooking({ bookingId: first.id, actor: member(waiters[0].id) });

    const again = await bookClass({ memberId: waiters[0].id, classId: cls.id, joinWaitlist: true });

    expect(again.booking.id).toBe(first.id);
    expect(again.waitlistPosition).toBe(2);
  });
});

test('GET /api/classes/:id/members lists booked members, then the waitlist in order (staff)', async () => {
  const { cls, waiters } = await fullClassWithWaitlist(1, 2);
  const res = await (await client(app, asStaff())).get(`/api/classes/${cls.id}/members`);
  expect(res.status).toBe(200);
  expect(res.body.map((m: { bookingStatus: string; waitlistPosition: number | null }) => [m.bookingStatus, m.waitlistPosition])).toEqual([
    ['active', null],
    ['waitlisted', 1],
    ['waitlisted', 2],
  ]);
  expect(res.body[1].id).toBe(waiters[0].id);
});
