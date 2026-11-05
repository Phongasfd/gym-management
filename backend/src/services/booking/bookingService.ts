import { Prisma } from '@prisma/client';
import { env, type BookingStrategyName } from '../../config/env';
import { AppError } from '../../lib/AppError';
import { prisma, type Tx } from '../../lib/prisma';
import type { AuthUser } from '../../types/auth';
import { enqueue } from '../outbox/outbox';
import { STRATEGIES, type SeatStrategy } from './strategies';

// Invariants, all enforced inside one transaction per operation:
//   1. Class.booked_count == number of `active` bookings, and 0 <= booked_count <= capacity
//      (the CHECK constraint enforces the bounds even if this code is wrong).
//   2. A free seat implies an empty waitlist: every operation that frees a seat (cancel, delete,
//      capacity increase) promotes the oldest waitlisted booking in the same transaction.
//   3. Joining the waitlist and freeing a seat both lock the class row, so a cancellation can never
//      miss a member who is joining the waitlist at the same moment (no lost wake-up).

const MAX_ATTEMPTS = 5;

const bookingInclude = {
  class: { select: { id: true, name: true, coach_name: true, schedule_time: true, end_time: true, capacity: true } },
} satisfies Prisma.BookingInclude;

export type BookingWithClass = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;

export function getStrategy(name: BookingStrategyName = env.bookingStrategy): SeatStrategy {
  return STRATEGIES[name];
}

// Serialization failure (40001) or deadlock (40P01): the whole transaction can be retried.
// Prisma reports them as P2034 from its own queries but as P2010 (with the SQLSTATE in meta)
// from raw queries.
const RETRYABLE_SQLSTATES = new Set(['40001', '40P01']);

export function isRetryable(err: unknown): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (err.code === 'P2034') return true;
  return err.code === 'P2010' && RETRYABLE_SQLSTATES.has(String((err.meta as { code?: unknown } | undefined)?.code));
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface TxStats {
  attempts: number;
}

async function runInTransaction<T>(
  isolationLevel: Prisma.TransactionIsolationLevel,
  fn: (tx: Tx) => Promise<T>,
  stats?: TxStats,
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    if (stats) stats.attempts = attempt;
    try {
      return await prisma.$transaction(fn, { isolationLevel, timeout: 10_000, maxWait: 5_000 });
    } catch (err) {
      if (!isRetryable(err)) throw err;
      if (attempt >= MAX_ATTEMPTS) {
        throw new AppError('Too many people are booking this class right now. Please try again.', 409, {
          code: 'BOOKING_CONFLICT',
        });
      }
      // Jittered backoff so the retries of two conflicting requests do not collide again.
      await sleep(Math.random() * 10 * attempt);
    }
  }
}

async function lockClass(tx: Tx, classId: string) {
  const [row] = await tx.$queryRaw<{ booked_count: number; capacity: number; schedule_time: Date | null }[]>`
    SELECT "booked_count", "capacity", "schedule_time" FROM "Class" WHERE "id" = ${classId} FOR UPDATE`;
  return row;
}

function hasStarted(scheduleTime: Date | null, now: Date) {
  return scheduleTime !== null && scheduleTime.getTime() <= now.getTime();
}

// Gives free seats to the oldest waitlisted bookings. Caller must be inside a transaction.
async function promoteWaitlist(tx: Tx, classId: string, now: Date): Promise<string[]> {
  const promoted: string[] = [];
  for (;;) {
    const cls = await lockClass(tx, classId);
    if (!cls || cls.booked_count >= cls.capacity || hasStarted(cls.schedule_time, now)) break;

    // SKIP LOCKED: a waitlisted member who is cancelling right now holds their row; skip them.
    const [next] = await tx.$queryRaw<{ id: string; member_id: string }[]>`
      SELECT "id", "member_id" FROM "Booking"
      WHERE "class_id" = ${classId} AND "status" = 'waitlisted'
      ORDER BY "waitlist_seq"
      LIMIT 1
      FOR UPDATE SKIP LOCKED`;
    if (!next) break;

    await tx.booking.update({ where: { id: next.id }, data: { status: 'active', waitlisted_at: null, waitlist_seq: null } });
    await tx.$executeRaw`UPDATE "Class" SET "booked_count" = "booked_count" + 1 WHERE "id" = ${classId}`;
    await enqueue(tx, 'booking.promoted', { bookingId: next.id, memberId: next.member_id, classId });
    promoted.push(next.id);
  }
  return promoted;
}

async function waitlistPosition(tx: Tx, booking: { class_id: string; waitlist_seq: bigint | null }) {
  if (booking.waitlist_seq === null) return undefined;
  const ahead = await tx.booking.count({
    where: { class_id: booking.class_id, status: 'waitlisted', waitlist_seq: { lt: booking.waitlist_seq } },
  });
  return ahead + 1;
}

async function nextWaitlistSeq(tx: Tx): Promise<bigint> {
  const [row] = await tx.$queryRaw<{ seq: bigint }[]>`SELECT nextval('"Booking_waitlist_seq"') AS "seq"`;
  return row.seq;
}

export interface BookResult {
  booking: BookingWithClass;
  outcome: 'booked' | 'waitlisted';
  waitlistPosition?: number;
}

export async function bookClass(input: {
  memberId: string;
  classId: string;
  joinWaitlist?: boolean;
  strategy?: SeatStrategy;
  now?: Date;
  stats?: TxStats;
}): Promise<BookResult> {
  const { memberId, classId, joinWaitlist = false, strategy = getStrategy(), stats } = input;
  const now = input.now ?? new Date();

  return runInTransaction(
    strategy.isolationLevel,
    async (tx) => {
      // Lock the member's existing (cancelled) row, if any: two clicks re-booking it at once must
      // queue here, otherwise both take a seat and both overwrite the same row. Same lock order as
      // cancel (Booking, then Class), so this adds no deadlock.
      const [lockedExisting] = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "Booking" WHERE "member_id" = ${memberId} AND "class_id" = ${classId} FOR UPDATE`;
      const existing = lockedExisting ? await tx.booking.findUniqueOrThrow({ where: { id: lockedExisting.id } }) : null;
      if (existing?.status === 'active') {
        throw new AppError('You have already booked this class', 409, { code: 'ALREADY_BOOKED' });
      }
      if (existing?.status === 'waitlisted') {
        throw new AppError('You are already on the waitlist for this class', 409, { code: 'ALREADY_WAITLISTED' });
      }

      const cls = await tx.class.findUnique({ where: { id: classId }, select: { schedule_time: true } });
      if (!cls) throw new AppError('Class not found', 404);
      if (hasStarted(cls.schedule_time, now)) {
        throw new AppError('This class has already started', 400, { code: 'CLASS_STARTED' });
      }

      let gotSeat = await strategy.reserveSeat(tx, classId);
      if (!gotSeat) {
        if (!joinWaitlist) {
          throw new AppError('Class is at full capacity', 409, { code: 'CLASS_FULL', details: { waitlistAvailable: true } });
        }
        // Re-check under the class row lock: a seat freed by a cancellation that committed after
        // reserveSeat() looked must be taken now, not left empty while we queue.
        const locked = await lockClass(tx, classId);
        if (locked && locked.booked_count < locked.capacity) {
          await tx.$executeRaw`UPDATE "Class" SET "booked_count" = "booked_count" + 1 WHERE "id" = ${classId}`;
          gotSeat = true;
        }
      }

      // Still holding the class row lock here when waitlisting, so the sequence value follows
      // the order in which members really joined.
      const data = gotSeat
        ? { status: 'active' as const, waitlisted_at: null, waitlist_seq: null }
        : { status: 'waitlisted' as const, waitlisted_at: new Date(), waitlist_seq: await nextWaitlistSeq(tx) };
      const booking = existing
        ? await tx.booking.update({ where: { id: existing.id }, data, include: bookingInclude })
        : await tx.booking.create({ data: { member_id: memberId, class_id: classId, ...data }, include: bookingInclude });

      return {
        booking,
        outcome: gotSeat ? ('booked' as const) : ('waitlisted' as const),
        waitlistPosition: gotSeat ? undefined : await waitlistPosition(tx, booking),
      };
    },
    stats,
  );
}

export async function cancelBooking(input: { bookingId: string; actor: AuthUser; now?: Date }) {
  const { bookingId, actor } = input;
  const now = input.now ?? new Date();

  // Check existence and ownership before taking any lock: a rejected request must not hold a
  // waitlisted row locked, because promotion skips locked rows (SKIP LOCKED).
  const owner = await prisma.booking.findUnique({ where: { id: bookingId }, select: { member_id: true } });
  if (!owner) throw new AppError('Booking not found', 404);
  if (actor.userType === 'member' && owner.member_id !== actor.userId) {
    throw new AppError('You can only cancel your own bookings', 403);
  }

  return runInTransaction(Prisma.TransactionIsolationLevel.ReadCommitted, async (tx) => {
    // Row lock: two concurrent cancels of the same booking must not both free a seat.
    const [row] = await tx.$queryRaw<{ id: string; member_id: string; class_id: string; status: string }[]>`
      SELECT "id", "member_id", "class_id", "status"::text AS "status" FROM "Booking" WHERE "id" = ${bookingId} FOR UPDATE`;
    if (!row) throw new AppError('Booking not found', 404);
    if (row.status === 'cancelled') {
      throw new AppError('Booking is already cancelled', 409, { code: 'ALREADY_CANCELLED' });
    }

    const booking = await tx.booking.update({
      where: { id: row.id },
      data: { status: 'cancelled', waitlisted_at: null, waitlist_seq: null },
      include: bookingInclude,
    });

    let promotedBookingIds: string[] = [];
    if (row.status === 'active') {
      await tx.$executeRaw`UPDATE "Class" SET "booked_count" = "booked_count" - 1 WHERE "id" = ${row.class_id}`;
      promotedBookingIds = await promoteWaitlist(tx, row.class_id, now);
    }
    return { booking, promotedBookingIds };
  });
}

// Staff only: removes the row entirely (no history kept).
export async function deleteBooking(bookingId: string, now = new Date()) {
  return runInTransaction(Prisma.TransactionIsolationLevel.ReadCommitted, async (tx) => {
    const [row] = await tx.$queryRaw<{ id: string; class_id: string; status: string }[]>`
      SELECT "id", "class_id", "status"::text AS "status" FROM "Booking" WHERE "id" = ${bookingId} FOR UPDATE`;
    if (!row) throw new AppError('Booking not found', 404);

    const booking = await tx.booking.delete({ where: { id: row.id }, include: bookingInclude });
    let promotedBookingIds: string[] = [];
    if (row.status === 'active') {
      await tx.$executeRaw`UPDATE "Class" SET "booked_count" = "booked_count" - 1 WHERE "id" = ${row.class_id}`;
      promotedBookingIds = await promoteWaitlist(tx, row.class_id, now);
    }
    return { booking, promotedBookingIds };
  });
}

// Staff edits a class. Raising the capacity hands the new seats to the waitlist.
export async function updateClass(
  classId: string,
  data: Omit<Prisma.ClassUpdateInput, 'booked_count' | 'bookings'>,
  now = new Date(),
) {
  return runInTransaction(Prisma.TransactionIsolationLevel.ReadCommitted, async (tx) => {
    const locked = await lockClass(tx, classId);
    if (!locked) throw new AppError('Class not found', 404);
    if (typeof data.capacity === 'number' && data.capacity < locked.booked_count) {
      throw new AppError(`Capacity cannot be lower than the ${locked.booked_count} seats already booked`, 409, {
        code: 'CAPACITY_BELOW_BOOKED',
      });
    }
    await tx.class.update({ where: { id: classId }, data });
    const promotedBookingIds = await promoteWaitlist(tx, classId, now);
    const updated = await tx.class.findUniqueOrThrow({ where: { id: classId } });
    return { class: updated, promotedBookingIds };
  });
}

export async function listMemberBookings(memberId: string) {
  const bookings = await prisma.booking.findMany({
    where: { member_id: memberId },
    include: bookingInclude,
    orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    take: 200,
  });

  const waitlistedClassIds = bookings.filter((b) => b.status === 'waitlisted').map((b) => b.class_id);
  const positions = new Map<string, number>();
  if (waitlistedClassIds.length > 0) {
    const rows = await prisma.$queryRaw<{ id: string; position: bigint }[]>`
      SELECT "id", "position" FROM (
        SELECT "id", "member_id",
               ROW_NUMBER() OVER (PARTITION BY "class_id" ORDER BY "waitlist_seq") AS "position"
        FROM "Booking"
        WHERE "status" = 'waitlisted' AND "class_id" IN (${Prisma.join(waitlistedClassIds)})
      ) ranked
      WHERE "member_id" = ${memberId}`;
    for (const row of rows) positions.set(row.id, Number(row.position));
  }

  return bookings.map((b) => ({ ...b, waitlistPosition: positions.get(b.id) ?? null }));
}
