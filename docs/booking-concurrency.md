# Selling the last seat: three correct strategies, one bug, measured

A class has `capacity` seats. Hundreds of members can press **Book** at the same moment (a new
class opens at 6 am, a popular coach posts on social media). The system must never sell seat
`capacity + 1`, and it should not refuse a member while a seat is still free.

This page explains how the booking path works, compares the ways to make it correct, and gives
the numbers that decided the default.

## The bug every booking system starts with

```ts
const booked = await count(bookings where class = X and status = 'active')
if (booked < capacity) await insert(booking)
```

Under `READ COMMITTED` (Postgres' default) two transactions both read `49`, both insert, and the
class now has 51 people for 50 seats. In the benchmark below this "naive" version sold
**5 extra seats on a 50-seat class (10 in the worst run)** out of only 500 requests.

## Three correct strategies

All three are in [`src/services/booking/strategies.ts`](../backend/src/services/booking/strategies.ts)
and selectable with `BOOKING_STRATEGY`. All three keep a seat counter `Class.booked_count` in the
same transaction as the booking row.

| Strategy | How | Concurrency control |
| --- | --- | --- |
| `atomic` (default) | `UPDATE "Class" SET booked_count = booked_count + 1 WHERE id = $1 AND booked_count < capacity` and check that one row changed | The row lock Postgres takes for the UPDATE; the `WHERE` is re-checked after waiting for it |
| `row_lock` | `SELECT … FOR UPDATE` on the class, compare in the application, then `UPDATE` | Pessimistic row lock held while the app decides |
| `serializable` | Count active bookings under `SERIALIZABLE`, insert if below capacity, retry on serialization failure (max 5, jittered) | Optimistic: Postgres SSI aborts one of two conflicting transactions |

`serializable` is what this project used before; it is kept as a comparison.

### Defence in depth: the database refuses to overbook

```sql
ALTER TABLE "Class" ADD CONSTRAINT "Class_booked_count_within_capacity"
  CHECK ("booked_count" >= 0 AND "booked_count" <= "capacity");
```

Even if application code is wrong, the write fails. This was tested by *mutation*: the
`serializable` strategy was deliberately broken (isolation lowered to `READ COMMITTED`, turning it
into the naive algorithm plus the counter). The concurrency test failed, and no class was
overbooked: the extra bookings were rejected by the constraint.

## Results

Command: `npm run bench` ([`scripts/bench-booking.ts`](../backend/scripts/bench-booking.ts)).
All bookings are started at once. The Prisma pool (20 connections) limits how many run in
parallel, so latency includes waiting for a connection. Median of 3 runs.

Machine: 28-core Xeon E5-2680 v4, Windows, PostgreSQL 17.5 on the same host, Node 24.
Absolute numbers will differ elsewhere; compare the rows with each other.

### Hot class: 500 members, 1 class, 50 seats

| strategy | req/s | p50 ms | p95 ms | p99 ms | booked | full (409) | gave up (409) | avg attempts | **overbooked** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| naive | 1990 | 148 | 245 | 249 | 55 | 445 | 0 | 1.00 | **5** (max 10) |
| serializable | 311 | 1465 | 1599 | 1606 | 50 | 450 | 0 | 2.89 | 0 |
| row_lock | 1215 | 282 | 401 | 409 | 50 | 450 | 0 | 1.00 | 0 |
| **atomic** | 1180 | 295 | 415 | 422 | 50 | 450 | 0 | 1.00 | 0 |

### Spread: 500 members, 25 classes of 20 seats (exactly one seat per member)

| strategy | req/s | p50 ms | p95 ms | p99 ms | booked | gave up (409) | avg attempts | overbooked | **unsold seats** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| naive | 2107 | 130 | 230 | 236 | 500 | 0 | 1.00 | 0 | 0 |
| serializable | 185 | 2403 | 2685 | 2703 | **210** | **290** | 4.26 | 0 | **290** |
| row_lock | 1196 | 228 | 403 | 415 | 500 | 0 | 1.00 | 0 | 0 |
| **atomic** | 1359 | 200 | 359 | 366 | 500 | 0 | 1.00 | 0 | 0 |

(An earlier run of the same benchmark, before an extra row lock was added to the re-booking path,
gave the same picture: `serializable` sold 169 of 500 seats.)

### Through the whole HTTP stack

Express + cookie auth + CSRF + validation + Postgres, 500 members, 50 requests in flight, 50 seats
([`scripts/load-http.ts`](../backend/scripts/load-http.ts); [`loadtest/booking.k6.js`](../loadtest/booking.k6.js) is the k6 version):

| strategy | req/s | p50 ms | p95 ms | p99 ms | 201 | 409 | booked_count |
|---|---:|---:|---:|---:|---:|---:|---:|
| **atomic** | 438 | 85 | 300 | 413 | 50 | 450 | 50 |
| row_lock | 443 | 84 | 291 | 414 | 50 | 450 | 50 |
| serializable | 184 | 97 | 634 | 718 | 50 | 450 | 50 |

At this level the HTTP stack, not the lock, dominates: `atomic` and `row_lock` are equal within
run-to-run noise, and `serializable` still has twice the tail latency.

## What the numbers say

1. **The naive version is the fastest and it is wrong.** Speed without the invariant is worthless.
2. **SERIALIZABLE is correct but 4 to 7 times slower here, and it can leave seats unsold.** In the
   spread scenario every member wanted a different class, yet more than half of them gave up
   after 5 retries and 290 seats stayed empty. The likely cause: Postgres' serializable snapshot
   isolation records reads as *predicate locks*, and a read done by a sequential scan (what the
   planner picks on a small table) locks the whole table, while index reads lock whole pages. So
   bookings for *different* classes still look like conflicts. (Not yet verified on this setup;
   `EXPLAIN` on the count query and `SIReadLock` rows in `pg_locks` during the run would confirm
   it.) More retries would sell more seats at an even higher latency.
3. **`atomic` and `row_lock` are equally correct and close in speed.** `atomic` does one round
   trip instead of two and holds the lock for less time, which shows (about 14% more throughput)
   when the load is spread over many classes; on a single hot class and through HTTP they are
   level. It is the default because it is simpler and never slower.

The integration tests pin these guarantees down
([`tests/integration/booking-concurrency.test.ts`](../backend/tests/integration/booking-concurrency.test.ts)):
50 concurrent HTTP requests for 1 seat give exactly one `201`; for the lock-based strategies,
50 requests for 10 seats sell exactly 10; for `serializable` the test only demands "never more
than capacity, counter equals rows", because that is all it guarantees under contention.

## The waitlist adds one more race

When a class is full a member can join the waitlist (`POST /api/bookings` with `waitlist: true`).
Cancelling an active booking promotes the first member in the queue **in the same transaction**,
so a seat is never free while someone waits.

The race: member A cancels the last seat while member B, who saw "full", is joining the waitlist.
If B's transaction decided "full" before A committed, and A's promotion looked for waiters before
B committed, B would wait forever next to an empty seat (a *lost wake-up*).

Fix: both paths lock the class row. Joining the waitlist re-checks the seat count *under the lock*
and books directly if a seat freed up in the meantime. The test repeats this race 15 times per
strategy and always finds B holding the seat.

Queue order uses a Postgres sequence value taken while the class row is locked. Timestamps from
concurrent requests do not follow commit order (an early test caught two members both told they
were "#1"), a sequence read under the lock does.

## A race the first version missed

A code review found one more interleaving: a member re-books a class they had cancelled and
**double-clicks**. Both requests read the same `cancelled` row without a lock, both take a seat,
and both overwrite that one row. With a free seat the counter went up by 2 for 1 booking; when the
second click arrived just as the class filled, it turned the member's fresh booking into a
waitlist entry while keeping the seat, so the seat was held by nobody and could never be
promoted.

A test reproduced it on the first run for `atomic` and `row_lock` (`serializable` was safe: SSI
aborted the second transaction). The fix is to lock the member's existing row first
(`SELECT … FOR UPDATE`), in the same Booking-then-Class order as cancellation so it cannot add a
deadlock. The second click then waits, sees `active`, and gets `409 ALREADY_BOOKED`.

## Trade-offs and what would change at scale

- One hot row per class is a bottleneck in theory; here it costs microseconds per booking. If a
  single class ever needed thousands of bookings per second, the next step would be a Redis
  counter (`DECR` with a Lua guard) in front of the database, with the database still enforcing
  the CHECK as the source of truth and a reconciliation job for drift.
- The counter must be maintained by every code path that changes a booking. All of them go
  through [`bookingService.ts`](../backend/src/services/booking/bookingService.ts); the CHECK
  constraint and the "counter equals rows" assertions in the tests catch a path that forgets.
