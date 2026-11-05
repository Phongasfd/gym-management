# Waitlist notifications and payment reconciliation: what happens when things fail

Two features cross the boundary between the database and the outside world:

- a waitlisted member is promoted and must be **e-mailed**;
- a member pays on VNPay and the membership must be **activated**, even if VNPay's callback never
  reaches us.

Both are built so that a crash, a timeout or a duplicate message at any point leaves the data
correct. This page lists the failure modes and what handles each.

## Transactional outbox

[`src/services/outbox/outbox.ts`](../backend/src/services/outbox/outbox.ts)

Sending an e-mail inside the booking transaction is wrong both ways: if the commit then fails,
the member was told about a seat they do not have; if the e-mail is sent after the commit and
the process dies in between, it is never sent.

Instead the state change and an `OutboxEvent` row are written **in the same transaction**. A
separate worker process ([`src/worker.ts`](../backend/src/worker.ts)) delivers the events:

```sql
UPDATE "OutboxEvent" SET status = 'processing', locked_at = now, attempts = attempts + 1
WHERE id IN (
  SELECT id FROM "OutboxEvent"
  WHERE (status = 'pending' AND available_at <= now)
     OR (status = 'processing' AND locked_at < now - 5 minutes)   -- a worker died mid-batch
  ORDER BY created_at, id
  LIMIT 20
  FOR UPDATE SKIP LOCKED                                          -- workers never block or collide
)
RETURNING *;
```

| Failure | What happens |
| --- | --- |
| Booking transaction rolls back | The event rolls back with it; nothing is sent |
| SMTP down / timeout | Event goes back to `pending` with exponential backoff (2 s, 4 s, 8 s … 10 min) |
| Fails 8 times | Status `failed` (dead letter), logged as an error for a human to look at |
| Worker crashes while processing | After 5 minutes another worker claims the event again |
| A slow batch (SMTP timeouts) | The lock is renewed for each event just before it is handled, and every final write is conditional on still holding that lock, so a slow worker neither looks dead nor overwrites a worker that took over |
| Several workers running | `SKIP LOCKED`: each event is claimed by one of them (tested with 3 workers and 60 events) |
| Event delivered twice (crash after sending, before marking done) | At-least-once delivery: the member may get the e-mail twice. Accepted for notifications |
| Member cancelled again before the e-mail goes out | Handlers re-read the current state; a stale promotion is acknowledged without e-mail |

Why not a message broker (RabbitMQ, BullMQ on Redis)? The events are produced by database
transactions, and the outbox is what makes "commit + publish" atomic. A broker would still
need an outbox in front of it. At this volume Postgres is the queue; a broker becomes
worthwhile when many independent consumers need the same events.

## Waitlist promotion

[`src/services/booking/bookingService.ts`](../backend/src/services/booking/bookingService.ts)

Invariant: **a free seat implies an empty waitlist.** Every operation that frees a seat
(cancel, staff delete, staff raising the capacity) promotes the oldest waitlisted booking in the
same transaction. Promotions stop once the class has started. Details of the race conditions are
in [booking-concurrency.md](booking-concurrency.md#the-waitlist-adds-one-more-race).

## Payments: IPN plus reconciliation

[`src/services/payment/`](../backend/src/services/payment)

The membership is activated **only** by VNPay's signed server-to-server IPN, never by the browser
redirect (anyone can open that URL). Both the IPN and the reconciler go through one function,
`applyPaymentResult`, which locks the order row, does nothing if the order is no longer
`pending`, checks the amount against the **price snapshot taken at checkout** (so a later price
change cannot break a genuine payment), then activates and queues the receipt e-mail, all in one
transaction.

If the IPN never arrives (our server was down, network error, VNPay gave up retrying), the member
has paid but the order would stay `pending` forever. The reconciler fixes that:

1. Every minute it claims pending orders older than the grace period (15 min, VNPay is still
   retrying before that) with `FOR UPDATE SKIP LOCKED`, and in the same statement moves their
   next check 2 minutes into the future (a lease), then commits. No transaction stays open while
   it waits on VNPay over HTTP.
2. It asks VNPay about each order (`querydr`) and acts on the answer:

| VNPay says | Action |
| --- | --- |
| Paid (`00`/`00`) | `applyPaymentResult(success)` → active + receipt |
| Not finished (`01`) or not found (`91`), link not expired | Ask again later: 1, 2, 4, 8 … 60 min |
| Not finished / not found, link expired | Order `failed` (`expired_unpaid`) + notice |
| Final failure status | Order `failed` + notice |
| Signature does not verify, **or is missing** | Never acted on; retried later (the vnpay library alone accepts an unsigned answer) |
| VNPay down / query error | Retried later; never treated as "unpaid" |
| Paid, but not the expected amount | **Needs review**: stays `pending`, no more automatic checks, error logged |
| Still erroring after 40 checks (~1.5 days) | **Needs review** |
| Pre-migration order "not found" | **Needs review**: its VNPay date had to be guessed, so "not found" may be our mistake |

"Needs review" means the job stops deciding on its own because either automatic answer could be
wrong (activating an underpaid order, or failing a paid one). The order keeps `status = pending`,
so a late IPN can still settle it, and `failure_reason` says why it was parked.

A genuine, signed success that arrives **after** the reconciler gave up on an order
(`expired_unpaid`, or `legacy_abandoned` from the migration) activates it: the member has paid.
A success for an order VNPay itself reported as failed is not activated; it is logged as an error
for a person to check.

| Race | Result (tested) |
| --- | --- |
| IPN and reconciler process the same order at the same moment | Row lock in `applyPaymentResult`: activated once, one receipt (10 repetitions) |
| VNPay retries the IPN | Second call returns `RspCode 02` and changes nothing |
| Two reconciler workers | Each order is queried once |

## Membership expiry

The worker also marks active memberships past their end date as `expired`. This used to happen
inside `GET /subscriptions`, which made reads write to the database and raced with itself.
