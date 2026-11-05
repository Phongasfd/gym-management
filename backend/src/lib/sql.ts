import { Prisma } from '@prisma/client';

// Prisma stores DateTime in `timestamp(3)` (no time zone) as UTC. Comparing such a column with
// Postgres' now() or with a timestamptz parameter converts through the session TimeZone, which
// is wrong whenever the server is not on UTC. Pass the instant explicitly as a UTC wall-clock
// timestamp instead: Postgres ignores the trailing "Z" when casting to `timestamp`.
export function utc(date: Date): Prisma.Sql {
  return Prisma.sql`${date.toISOString()}::timestamp`;
}
