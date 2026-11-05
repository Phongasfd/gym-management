/*
 * End-to-end HTTP load test of POST /api/bookings against a running server (Express + auth +
 * CSRF + validation + Postgres). Members and the class are created directly in the database,
 * which must be a bench/test database, and access tokens are signed with the server's JWT_SECRET.
 *
 *   # terminal 1 (same DATABASE_URL and JWT_SECRET; RATE_LIMIT_DISABLED so one IP can send it all)
 *   RATE_LIMIT_DISABLED=true BOOKING_STRATEGY=atomic npm start
 *   # terminal 2
 *   LOAD_BASE_URL=http://localhost:3000 LOAD_MEMBERS=500 LOAD_CONCURRENCY=50 npx tsx scripts/load-http.ts
 *
 * loadtest/booking.k6.js does the same with k6.
 */
import jwt from 'jsonwebtoken';
import { prisma } from '../src/lib/prisma';

const BASE = process.env.LOAD_BASE_URL ?? 'http://localhost:3000';
const MEMBERS = Number(process.env.LOAD_MEMBERS ?? 500);
const CONCURRENCY = Number(process.env.LOAD_CONCURRENCY ?? 50);
const CAPACITY = Number(process.env.LOAD_CAPACITY ?? 50);

function assertSafeDatabase() {
  const db = (process.env.DATABASE_URL ?? '').split('/').pop()?.split('?')[0] ?? '';
  if (!/bench|test/i.test(db)) throw new Error(`Refusing to write to "${db}": use a bench/test database.`);
}

async function main() {
  assertSafeDatabase();
  await prisma.$executeRawUnsafe('TRUNCATE "OutboxEvent", "Booking", "Class", "Member" CASCADE');
  const cls = await prisma.class.create({ data: { name: 'Load', capacity: CAPACITY, schedule_time: new Date(Date.now() + 86_400_000) } });
  const members = await prisma.member.createManyAndReturn({
    data: Array.from({ length: MEMBERS }, (_, i) => ({ full_name: `L${i}`, email: `load-${i}@example.com` })),
    select: { id: true },
  });

  // csrf-csrf tokens are not bound to a session here, so one token + cookie serves every request.
  const csrfRes = await fetch(`${BASE}/api/auth/csrf-token`);
  const csrfCookie = (csrfRes.headers.get('set-cookie') ?? '').split(';')[0];
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

  const latencies: number[] = [];
  const statuses: Record<number, number> = {};
  let next = 0;

  const started = performance.now();
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < members.length) {
        const m = members[next++];
        const token = jwt.sign({ userType: 'member', userId: m.id }, process.env.JWT_SECRET as string, { expiresIn: '15m' });
        const t0 = performance.now();
        const res = await fetch(`${BASE}/api/bookings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken, Cookie: `${csrfCookie}; access_token=${token}` },
          body: JSON.stringify({ class_id: cls.id }),
        });
        await res.arrayBuffer();
        latencies.push(performance.now() - t0);
        statuses[res.status] = (statuses[res.status] ?? 0) + 1;
      }
    }),
  );
  const elapsed = performance.now() - started;

  latencies.sort((a, b) => a - b);
  const p = (q: number) => latencies[Math.min(latencies.length - 1, Math.floor(q * latencies.length))].toFixed(0);
  const state = await prisma.class.findUniqueOrThrow({ where: { id: cls.id } });
  const active = await prisma.booking.count({ where: { class_id: cls.id, status: 'active' } });

  console.log(
    JSON.stringify({
      members: MEMBERS,
      concurrency: CONCURRENCY,
      capacity: CAPACITY,
      reqPerSec: Math.round((MEMBERS / elapsed) * 1000),
      p50: p(0.5),
      p95: p(0.95),
      p99: p(0.99),
      statuses,
      bookedCount: state.booked_count,
      activeRows: active,
    }),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
