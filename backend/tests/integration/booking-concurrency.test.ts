import { createApp } from '../../src/app';
import type { BookingStrategyName } from '../../src/config/env';
import { bookClass, cancelBooking, getStrategy } from '../../src/services/booking/bookingService';
import { classState, createClass, createMember, createMembers, prisma, resetDb } from '../helpers/db';
import { asMember, client } from '../helpers/http';

// These tests fire real concurrent requests at a real PostgreSQL. With a broken implementation
// (count-then-insert under READ COMMITTED) they overbook on almost every run.

const app = createApp();
const STRATEGY_NAMES: BookingStrategyName[] = ['atomic', 'row_lock', 'serializable'];

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

function countBy(values: number[]) {
  return values.reduce<Record<string, number>>((acc, v) => ({ ...acc, [String(v)]: (acc[String(v)] ?? 0) + 1 }), {});
}

describe('POST /api/bookings under concurrency (HTTP, default strategy)', () => {
  test('50 members race for the last seat: exactly one gets it', async () => {
    const cls = await createClass({ capacity: 1 });
    const members = await createMembers(50);
    const clients = await Promise.all(members.map((m) => client(app, asMember(m.id))));

    const responses = await Promise.all(clients.map((c) => c.post('/api/bookings', { class_id: cls.id })));
    const statuses = countBy(responses.map((r) => r.status));

    expect(statuses).toEqual({ 201: 1, 409: 49 });
    expect(responses.filter((r) => r.status === 409).every((r) => r.body.code === 'CLASS_FULL')).toBe(true);
    expect(await classState(cls.id)).toEqual({ bookedCount: 1, capacity: 1, active: 1, waitlisted: 0 });
  });

  test('one member double-clicks "Book" 5 times: one booking, one seat', async () => {
    const cls = await createClass({ capacity: 5 });
    const member = await createMember();
    const c = await client(app, asMember(member.id));

    const responses = await Promise.all(Array.from({ length: 5 }, () => c.post('/api/bookings', { class_id: cls.id })));

    expect(responses.filter((r) => r.status === 201)).toHaveLength(1);
    expect(responses.filter((r) => r.status === 409)).toHaveLength(4);
    expect(await classState(cls.id)).toMatchObject({ bookedCount: 1, active: 1 });
  });
});

describe.each(STRATEGY_NAMES)('strategy "%s"', (name) => {
  const strategy = getStrategy(name);

  test('50 concurrent bookings for 10 seats: exactly 10 succeed, the counter matches the rows', async () => {
    const cls = await createClass({ capacity: 10 });
    const members = await createMembers(50);

    const results = await Promise.allSettled(members.map((m) => bookClass({ memberId: m.id, classId: cls.id, strategy })));

    const booked = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    const state = await classState(cls.id);

    // Never an 11th seat, and the counter always matches the rows.
    expect(state.bookedCount).toBe(booked.length);
    expect(state.active).toBe(booked.length);
    expect(booked.length).toBeLessThanOrEqual(10);

    if (name === 'serializable') {
      // Optimistic concurrency can give up after its retries (409 BOOKING_CONFLICT) while seats
      // are still free: correct, but it can leave seats unsold under contention. This is why it is
      // not the default (see docs/booking-concurrency.md).
      expect(rejected.every((r) => ['CLASS_FULL', 'BOOKING_CONFLICT'].includes(r.reason.code))).toBe(true);
    } else {
      // Lock-based strategies queue on the row instead of failing: every seat is sold.
      expect(booked).toHaveLength(10);
      expect(rejected.every((r) => r.reason.code === 'CLASS_FULL')).toBe(true);
    }
  });

  test('50 concurrent bookings with waitlist for 5 seats: 5 booked, 45 queued with unique positions', async () => {
    const cls = await createClass({ capacity: 5 });
    const members = await createMembers(50);

    const results = await Promise.allSettled(
      members.map((m) => bookClass({ memberId: m.id, classId: cls.id, joinWaitlist: true, strategy })),
    );
    const ok = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
    const waitlisted = ok.filter((r) => r.outcome === 'waitlisted');

    const state = await classState(cls.id);
    expect(state.active).toBe(state.bookedCount);
    expect(state.bookedCount).toBe(ok.length - waitlisted.length);
    expect(state.waitlisted).toBe(waitlisted.length);
    // Invariant: nobody waits while a seat is free.
    if (state.bookedCount < 5) expect(state.waitlisted).toBe(0);
    if (name !== 'serializable') expect(state).toEqual({ bookedCount: 5, capacity: 5, active: 5, waitlisted: 45 });

    // Positions are unique and contiguous: 1..n
    const positions = waitlisted.map((r) => r.waitlistPosition).sort((a, b) => (a ?? 0) - (b ?? 0));
    expect(positions).toEqual(Array.from({ length: waitlisted.length }, (_, i) => i + 1));
  });

  test('re-booking a cancelled booking twice at once (double click) takes one seat, never two', async () => {
    for (const capacity of [3, 2]) {
      // capacity 2: the second click arrives when the class has just become full
      await resetDb();
      const cls = await createClass({ capacity });
      const [m, other] = await createMembers(2);
      if (capacity === 2) await bookClass({ memberId: other.id, classId: cls.id, strategy });
      const first = await bookClass({ memberId: m.id, classId: cls.id, strategy });
      await cancelBooking({ bookingId: first.booking.id, actor: { userType: 'member', userId: m.id } });

      const results = await Promise.allSettled(
        Array.from({ length: 4 }, () => bookClass({ memberId: m.id, classId: cls.id, joinWaitlist: true, strategy })),
      );

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      const state = await classState(cls.id);
      expect(state.bookedCount).toBe(state.active);
      const mine = await prisma.booking.findUniqueOrThrow({ where: { id: first.booking.id } });
      expect(mine.status).toBe('active');
    }
  });

  test('no lost wake-up: a seat freed while someone joins the waitlist is never left empty', async () => {
    // Repeats the race: member A cancels the only seat while member B books with waitlist=true.
    // Whatever the interleaving, B must end up holding the seat.
    for (let i = 0; i < 15; i++) {
      await resetDb();
      const cls = await createClass({ capacity: 1 });
      const [a, b] = await createMembers(2);
      const { booking } = await bookClass({ memberId: a.id, classId: cls.id, strategy });

      await Promise.all([
        cancelBooking({ bookingId: booking.id, actor: { userType: 'member', userId: a.id } }),
        bookClass({ memberId: b.id, classId: cls.id, joinWaitlist: true, strategy }).catch((err) => {
          // A SERIALIZABLE retry budget can run out; then B simply has no booking.
          if (err.code !== 'BOOKING_CONFLICT') throw err;
        }),
      ]);

      const bBooking = await prisma.booking.findUnique({ where: { member_id_class_id: { member_id: b.id, class_id: cls.id } } });
      const state = await classState(cls.id);
      if (bBooking) {
        expect(bBooking.status).toBe('active');
        expect(state).toEqual({ bookedCount: 1, capacity: 1, active: 1, waitlisted: 0 });
      } else {
        expect(state).toEqual({ bookedCount: 0, capacity: 1, active: 0, waitlisted: 0 });
      }
    }
  });
});

test('the database itself refuses to overbook (CHECK constraint)', async () => {
  const cls = await createClass({ capacity: 1 });
  await expect(prisma.$executeRaw`UPDATE "Class" SET "booked_count" = 2 WHERE "id" = ${cls.id}`).rejects.toThrow(
    /Class_booked_count_within_capacity/,
  );
});
