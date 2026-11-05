/*
 * Booking strategy benchmark. Runs against a real PostgreSQL and WIPES it, so the database name
 * must contain "bench" or "test":
 *
 *   DATABASE_URL="postgresql://user:pass@localhost:5432/gym_bench?connection_limit=20" npm run bench
 *
 * For each scenario and strategy it fires every booking at once (the Prisma pool caps real
 * concurrency at connection_limit), then checks the invariants and reports latency percentiles.
 * "naive" is the textbook bug (count, then insert, under READ COMMITTED) kept here as a baseline.
 */
import { Prisma } from '@prisma/client';
import os from 'os';
import { prisma } from '../src/lib/prisma';
import { bookClass, getStrategy, type TxStats } from '../src/services/booking/bookingService';
import type { BookingStrategyName } from '../src/config/env';

type Name = BookingStrategyName | 'naive';

interface Scenario {
  key: string;
  title: string;
  classes: number;
  capacity: number;
  members: number;
}

const SCENARIOS: Scenario[] = [
  { key: 'hot', title: 'Hot class: 500 members, 1 class, 50 seats', classes: 1, capacity: 50, members: 500 },
  { key: 'spread', title: 'Spread: 500 members, 25 classes of 20 seats', classes: 25, capacity: 20, members: 500 },
];
const STRATEGIES: Name[] = ['naive', 'serializable', 'row_lock', 'atomic'];
const RUNS = Number(process.env.BENCH_RUNS ?? 3);

function assertSafeDatabase() {
  const db = (process.env.DATABASE_URL ?? '').split('/').pop()?.split('?')[0] ?? '';
  if (!/bench|test/i.test(db)) throw new Error(`Refusing to wipe "${db}": use a database whose name contains "bench" or "test".`);
}

async function reset() {
  await prisma.$executeRawUnsafe('TRUNCATE "OutboxEvent", "Booking", "Class", "Member" CASCADE');
}

// The bug every booking system starts with: two requests both read "49 booked", both insert.
async function naiveBook(memberId: string, classId: string) {
  return prisma.$transaction(
    async (tx) => {
      const cls = await tx.class.findUniqueOrThrow({ where: { id: classId } });
      const active = await tx.booking.count({ where: { class_id: classId, status: 'active' } });
      if (active >= cls.capacity) throw Object.assign(new Error('full'), { code: 'CLASS_FULL' });
      return tx.booking.create({ data: { member_id: memberId, class_id: classId, status: 'active' } });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, maxWait: 30_000, timeout: 30_000 },
  );
}

const pct = (sorted: number[], p: number) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];

async function runOnce(scenario: Scenario, name: Name) {
  await reset();
  const classes = await Promise.all(
    Array.from({ length: scenario.classes }, (_, i) =>
      prisma.class.create({ data: { name: `C${i}`, capacity: scenario.capacity, schedule_time: new Date(Date.now() + 86_400_000) } }),
    ),
  );
  const members = await prisma.member.createManyAndReturn({
    data: Array.from({ length: scenario.members }, (_, i) => ({ full_name: `M${i}`, email: `bench-${i}@example.com` })),
    select: { id: true },
  });

  const latencies: number[] = [];
  const outcome = { booked: 0, full: 0, conflict: 0, error: 0, attempts: 0 };
  const strategy = name === 'naive' ? undefined : getStrategy(name);

  const started = performance.now();
  await Promise.all(
    members.map(async (m, i) => {
      const classId = classes[i % classes.length].id;
      const stats: TxStats = { attempts: 0 };
      const t0 = performance.now();
      try {
        if (strategy) await bookClass({ memberId: m.id, classId, strategy, stats });
        else await naiveBook(m.id, classId);
        outcome.booked++;
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (code === 'CLASS_FULL') outcome.full++;
        else if (code === 'BOOKING_CONFLICT') outcome.conflict++;
        else outcome.error++;
      } finally {
        latencies.push(performance.now() - t0);
        outcome.attempts += stats.attempts || 1;
      }
    }),
  );
  const elapsedMs = performance.now() - started;

  // Invariants per class: seats sold beyond capacity, seats left empty, and (for the real
  // strategies, which maintain it) how far booked_count is from the actual rows.
  const perClass = await prisma.$queryRaw<{ n: bigint; capacity: number; booked_count: number }[]>`
    SELECT COUNT(b.id) FILTER (WHERE b.status = 'active') AS n, c.capacity, c.booked_count
    FROM "Class" c LEFT JOIN "Booking" b ON b.class_id = c.id GROUP BY c.id`;
  const overbooked = perClass.reduce((s, c) => s + Math.max(Number(c.n) - c.capacity, 0), 0);
  const unsold = perClass.reduce((s, c) => s + Math.max(c.capacity - Number(c.n), 0), 0);
  const counterDrift = name === 'naive' ? 0 : perClass.reduce((s, c) => s + Math.abs(Number(c.n) - c.booked_count), 0);

  latencies.sort((a, b) => a - b);
  return {
    throughput: (scenario.members / elapsedMs) * 1000,
    p50: pct(latencies, 50),
    p95: pct(latencies, 95),
    p99: pct(latencies, 99),
    ...outcome,
    avgAttempts: outcome.attempts / scenario.members,
    overbooked,
    unsold,
    counterDrift,
  };
}

type Result = Awaited<ReturnType<typeof runOnce>>;

function median(results: Result[]): Result {
  const pick = (k: keyof Result) => [...results].sort((a, b) => (a[k] as number) - (b[k] as number))[Math.floor(results.length / 2)][k];
  return Object.fromEntries(Object.keys(results[0]).map((k) => [k, pick(k as keyof Result)])) as unknown as Result;
}

async function main() {
  assertSafeDatabase();
  const url = new URL((process.env.DATABASE_URL as string).replace(/^postgresql:/, 'http:'));
  const pool = url.searchParams.get('connection_limit') ?? 'Prisma default';
  const [{ version }] = await prisma.$queryRaw<{ version: string }[]>`SELECT version()`;

  console.log(`# Booking strategy benchmark\n`);
  console.log(`- ${new Date().toISOString()}, ${os.cpus().length} CPUs (${os.cpus()[0]?.model.trim()}), Node ${process.version}`);
  console.log(`- ${version.split(',')[0]}, Prisma pool: ${pool} connections, median of ${RUNS} runs\n`);

  for (const scenario of SCENARIOS) {
    console.log(`## ${scenario.title}\n`);
    console.log('| strategy | req/s | p50 ms | p95 ms | p99 ms | booked | full (409) | gave up (409) | errors | avg attempts | **overbooked** | unsold seats | counter drift |');
    console.log('|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
    for (const name of STRATEGIES) {
      const runs: Result[] = [];
      for (let i = 0; i < RUNS; i++) runs.push(await runOnce(scenario, name));
      const r = median(runs);
      const maxOver = Math.max(...runs.map((x) => x.overbooked));
      console.log(
        `| ${name} | ${r.throughput.toFixed(0)} | ${r.p50.toFixed(0)} | ${r.p95.toFixed(0)} | ${r.p99.toFixed(0)} | ${r.booked} | ${r.full} | ${r.conflict} | ${r.error} | ${r.avgAttempts.toFixed(2)} | **${r.overbooked}** (max ${maxOver}) | ${r.unsold} | ${r.counterDrift} |`,
      );
    }
    console.log('');
  }
  await reset();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
