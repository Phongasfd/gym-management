import { Prisma } from '@prisma/client';
import type { BookingStrategyName } from '../../config/env';
import type { Tx } from '../../lib/prisma';

// Three ways to take "one seat if there is one" correctly under concurrency.
// All of them keep Class.booked_count in step, and the CHECK constraint
// (booked_count <= capacity) rejects an overbooking whatever the strategy.
// docs/booking-concurrency.md compares them under load.

export interface SeatStrategy {
  name: BookingStrategyName;
  // Isolation level for the whole booking transaction.
  isolationLevel: Prisma.TransactionIsolationLevel;
  // Takes one seat in the class. Returns false when the class is full.
  // Runs inside the booking transaction, after the class is known to exist.
  reserveSeat(tx: Tx, classId: string): Promise<boolean>;
}

// One conditional UPDATE. Postgres row-locks the class while it re-checks the WHERE clause,
// so concurrent requests queue on the row for microseconds and never see a stale count.
const atomic: SeatStrategy = {
  name: 'atomic',
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
  async reserveSeat(tx, classId) {
    const updated = await tx.$executeRaw`
      UPDATE "Class" SET "booked_count" = "booked_count" + 1
      WHERE "id" = ${classId} AND "booked_count" < "capacity"`;
    return updated === 1;
  },
};

// Pessimistic: lock the class row, read, decide, write. Same guarantee as `atomic`, one more
// round trip, and the lock is held while the application decides.
const rowLock: SeatStrategy = {
  name: 'row_lock',
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
  async reserveSeat(tx, classId) {
    const [row] = await tx.$queryRaw<{ booked_count: number; capacity: number }[]>`
      SELECT "booked_count", "capacity" FROM "Class" WHERE "id" = ${classId} FOR UPDATE`;
    if (!row || row.booked_count >= row.capacity) return false;
    await tx.$executeRaw`UPDATE "Class" SET "booked_count" = "booked_count" + 1 WHERE "id" = ${classId}`;
    return true;
  },
};

// Optimistic: count the active bookings under SERIALIZABLE. Postgres aborts one of two
// conflicting transactions (P2034) and the caller retries. The original implementation.
const serializable: SeatStrategy = {
  name: 'serializable',
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  async reserveSeat(tx, classId) {
    const cls = await tx.class.findUniqueOrThrow({ where: { id: classId }, select: { capacity: true } });
    const active = await tx.booking.count({ where: { class_id: classId, status: 'active' } });
    if (active >= cls.capacity) return false;
    await tx.class.update({ where: { id: classId }, data: { booked_count: { increment: 1 } } });
    return true;
  },
};

export const STRATEGIES: Record<BookingStrategyName, SeatStrategy> = {
  atomic,
  row_lock: rowLock,
  serializable,
};
