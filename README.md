# Gym Management System

A full-stack platform for running a gym: an **admin console** for staff and a **member portal** where members book classes (with a **waitlist**), buy memberships through **VNPay**, and chat with an AI advisor.

[![CI](https://github.com/Phongasfd/gym-management/actions/workflows/ci.yml/badge.svg)](https://github.com/Phongasfd/gym-management/actions/workflows/ci.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Node.js 20](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)
![Express 5](https://img.shields.io/badge/Express-5-000000?logo=express)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)
![PostgreSQL 16](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Playwright](https://img.shields.io/badge/E2E-Playwright-2EAD33?logo=playwright&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)

> **Live demo: offline.** The project ran on an AWS EC2 free-tier instance, which has expired.
> The screenshots below are from that deployment, and everything runs locally in a few commands
> (see [Getting started](#getting-started)). The deploy workflow is kept but only runs on demand.

---

## Highlights

| Problem | How it is solved | Proof |
| --- | --- | --- |
| **500 members press "Book" for 50 seats at once** | One conditional `UPDATE … WHERE booked_count < capacity` per booking, plus a `CHECK (booked_count <= capacity)` constraint so the database itself refuses to overbook. Three strategies implemented and benchmarked. | [Benchmark](docs/booking-concurrency.md): the naive version oversold 5 to 10 seats; `SERIALIZABLE` (the previous implementation) was 4 to 7× slower and left **290 of 500 seats unsold** in one scenario; `atomic` is correct and the fastest of the correct options. Concurrency tests fire 50 parallel requests at a real PostgreSQL. An independent review found one more race (double-click re-booking); it was reproduced by a test, then fixed. |
| **Full class → waitlist, seat freed → next member gets it** | Cancel, delete and capacity increase promote the oldest waitlisted booking **in the same transaction**. Joining the waitlist and freeing a seat both lock the class row, so no "lost wake-up". FIFO order from a sequence read under that lock. | 17 waitlist tests incl. 5 simultaneous cancellations and a cancel-vs-join race repeated per strategy. |
| **"You got a seat" e-mail must not be lost or sent for a seat you do not have** | Transactional outbox: the event is written in the booking transaction; a worker delivers it with `FOR UPDATE SKIP LOCKED`, exponential backoff and a dead-letter state. | 3 workers × 60 events: each delivered exactly once; crashed-worker recovery tested. [Failure modes](docs/reliability.md). |
| **Member paid, but VNPay's IPN never arrived** | A reconciler queries VNPay (`querydr`) for pending orders past a grace period, with leases and backoff, through the same idempotent function as the IPN. Price snapshot at checkout. | IPN vs reconciler racing on the same order: activated once, one receipt. Unverifiable / failed VNPay answers are never acted on. |
| **A payment must activate exactly one membership** | Only the signed server-to-server IPN activates (never the browser redirect). HMAC-SHA512 signature, amount and state are checked under a row lock; replays return `02`. | Tests sign real IPN payloads; tampered signature, wrong amount, replays covered. |
| **One schema for validation, types and docs** | Each endpoint is declared once with zod schemas and an auth level; that declaration validates the request, types the handler, and generates the OpenAPI document at `/api-docs`. | All 40+ routes in [`routes/index.ts`](backend/src/routes/index.ts). |
| **Sessions that survive XSS and token theft** | `httpOnly` cookies: a 15-minute JWT plus a rotating refresh token stored only as a SHA-256 hash; replaying a rotated token revokes every session. Signed double-submit CSRF token. | Tests for rotation, reuse detection, CSRF, reset-code expiry and single use. |

## Screenshots

| Admin dashboard | Members |
| --- | --- |
| ![Dashboard](docs/images/dashboard.png) | ![Members](docs/images/members.png) |
| **Classes** | **Check-ins** |
| ![Classes](docs/images/classes.png) | ![Check-ins](docs/images/checkins.png) |
| **Member portal** | **Class booking** |
| ![Member portal](docs/images/member_portal.png) | ![Class booking](docs/images/class_booking.png) |
| **VNPay checkout** | **AI advisor** |
| ![Payment](docs/images/payment.png) | ![AI chatbot](docs/images/ai_chatbot.png) |

More: [home page](docs/images/home.png) · [sign-in](docs/images/auth.png) · [packages (admin)](docs/images/packages.png) · [packages (member)](docs/images/packages_user.png)

## Architecture

```mermaid
flowchart TB
    browser["Browser<br/>(staff and members)"] -->|HTTPS| nginx["Nginx<br/>TLS · gzip · path routing"]
    nginx -->|/admin/| admin["frontend-admin<br/>React + Vite"]
    nginx -->|/| user["frontend-user<br/>Next.js"]
    nginx -->|/api/| api["API<br/>Express 5 · TypeScript · Prisma"]
    api --> pg[("PostgreSQL 16<br/>data + outbox")]
    api --> redis[("Redis 7<br/>rate-limit counters")]
    worker["worker<br/>same image, separate process"] -->|"claim with SKIP LOCKED"| pg
    worker -->|e-mails| smtp["SMTP"]
    worker -->|"querydr (reconcile)"| vnpay["VNPay"]
    vnpay -->|"signed IPN"| api
    api -->|"signed payment URL"| browser
    api --> openai["OpenAI API"]
```

The API and the worker are the same Docker image started with different commands. Only Nginx is
reachable from the internet; the app containers bind to `127.0.0.1`.

## Features

**Staff (admin console)**: dashboard; members, packages (deactivate instead of delete once sold),
classes (capacity, coach, schedule) with each class's booked members **and waitlist**; check-ins;
desk sales of memberships; change password (revokes other sessions).

**Members (portal)**: sign up with e-mail/password, Google or Facebook; complete profile; reset
password with an e-mailed 6-digit code (stored hashed, single use, 10 minutes); browse upcoming
classes, book, **join the waitlist when full and see your position**, cancel or leave the
waitlist; buy a membership through VNPay; AI advisor chat.

## Key flows

### Booking, waitlist and promotion

```mermaid
sequenceDiagram
    autonumber
    participant M as Member
    participant API as API
    participant DB as PostgreSQL
    participant W as worker
    M->>API: POST /api/bookings {class_id, waitlist: true}
    API->>DB: UPDATE Class SET booked_count+1 WHERE booked_count < capacity
    alt a seat was free
        API->>DB: INSERT booking (active)
        API-->>M: 201 outcome "booked"
    else full
        API->>DB: lock class row, re-check, INSERT booking (waitlisted, seq)
        API-->>M: 201 outcome "waitlisted", position #n
    end
    Note over M,DB: later, another member cancels
    API->>DB: one transaction: cancel, booked_count-1, promote oldest waitlisted, INSERT outbox event
    W->>DB: claim event (FOR UPDATE SKIP LOCKED)
    W-->>M: e-mail "You got a seat"
```

### Paying for a membership

```mermaid
sequenceDiagram
    autonumber
    participant M as Member browser
    participant API as API
    participant V as VNPay
    participant W as worker
    M->>API: POST /api/vnpay/create-qr {packageId}
    API->>API: order = pending, price snapshot, sign URL (HMAC-SHA512)
    API-->>M: payment URL
    M->>V: pay
    V->>API: IPN (server-to-server, signed)
    API->>API: lock order, verify signature, amount, state → active + receipt event
    API-->>V: RspCode 00 (replays: 02)
    Note over V,W: if the IPN never arrives
    W->>V: querydr for pending orders older than 15 min
    W->>API: same applyPaymentResult(): active, failed, or ask again later
```

## Tech stack

| Layer | Technology |
| --- | --- |
| Backend | Node.js 20, TypeScript (strict), Express 5, Prisma 6, zod (+ zod-to-openapi), Passport (Google, Facebook), Nodemailer, Winston (JSON logs with request ids) |
| Background work | Worker process: transactional outbox, VNPay reconciliation, membership expiry |
| Security | `httpOnly` JWT cookies, refresh-token rotation with reuse detection, `csrf-csrf`, Helmet, `express-rate-limit` (Redis store when configured), bcrypt |
| Data | PostgreSQL 16 with enums, CHECK constraints and a sequence ([ERD](backend/erd/gym-management.png)), Redis 7 |
| Frontends | React + Vite (admin), Next.js App Router (member portal) |
| Integrations | VNPay (sandbox), OpenAI API |
| Testing | Jest + Supertest on a real PostgreSQL, Playwright (browser E2E), benchmarks (`npm run bench`, k6 script) |
| Delivery | Docker (multi-stage), Docker Compose, Nginx, GitHub Actions |

## Design decisions and trade-offs

| Decision | Why | Trade-off / alternative |
| --- | --- | --- |
| Conditional `UPDATE` on a seat counter (`atomic`) | Measured fastest of the correct options; one round trip; the CHECK constraint backs it up | Every booking path must maintain the counter (all go through one service; tests assert counter = rows). Redis counter if one class ever needs thousands of bookings/s |
| Not `SERIALIZABLE` any more | Correct, but retries exhausted under contention and left seats unsold | Kept as a selectable strategy for comparison |
| Postgres outbox instead of a broker | Events come from DB transactions; the outbox is what makes commit + publish atomic | A broker (RabbitMQ, Kafka) when many independent consumers need the events |
| At-least-once delivery | Simple and safe for notifications | A crash between "sent" and "done" can send an e-mail twice |
| IPN as the source of truth, reconciler as backup | The browser redirect can be lost or forged | The reconciler depends on VNPay's `querydr` answers |
| One schema per endpoint (zod → types → OpenAPI) | Validation, types and docs cannot drift | Response schemas are not declared yet, so the docs describe requests in detail and responses briefly |
| Keyset (cursor) pagination | Stable under inserts, O(page) | No "jump to page 7"; the members overview keeps offset pages for the admin table |
| Rate limits fail open | Redis down, restarting or refusing the connection (wrong password) must not take the API with it: each Redis call waits at most 1 s, then the request is served without rate limiting | No rate limiting while Redis is unavailable. Before, an unhandled rejection from the Redis store crashed the API at startup, and an outage made every request hang |

More detail: [booking concurrency and benchmarks](docs/booking-concurrency.md) · [failure modes of the outbox, waitlist and payments](docs/reliability.md)

## Testing

| Suite | What | Count |
| --- | --- | ---: |
| Unit | Pure helpers, the endpoint/validation layer, error mapping, the rate limiter with a refusing, offline or silent Redis | 17 |
| Integration (real PostgreSQL) | Concurrency per strategy, waitlist, outbox, payments + reconciliation, auth, API rules, staff CRUD | 106 |
| E2E (Playwright, real browser) | Book a class; join the waitlist and get promoted; leave the waitlist; buy a membership through VNPay (IPN simulated with a valid signature) | 4 |

Coverage of the backend suite: about 92% of lines, 89% of functions, 73% of branches; CI fails
below 85/85/70. CI also fails if the migrations and `schema.prisma` drift apart.

```bash
cd backend
npm run typecheck && npm run lint
# needs a PostgreSQL whose database name contains "test" (the tests wipe it)
export DATABASE_URL=postgresql://user:pass@localhost:5432/gym_test
npx prisma migrate deploy
npm run test:coverage

# browser tests (starts the API and the portal itself)
cd ../e2e && npm ci && npx playwright install chromium
E2E_DATABASE_URL=postgresql://user:pass@localhost:5432/gym_e2e_test npx playwright test

# benchmark the booking strategies (wipes the database: name must contain "bench" or "test")
cd ../backend && DATABASE_URL="postgresql://user:pass@localhost:5432/gym_bench?connection_limit=20" npm run bench
```

## Getting started

**Prerequisites:** Node.js 20, Docker.

1. Start PostgreSQL and Redis. Put `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` and `REDIS_PASSWORD` in a root `.env`, then:
   ```bash
   docker compose -f docker-compose.dev.yml up -d
   ```
2. Create `backend/.env`:

   | Variable | Example / purpose |
   | --- | --- |
   | `DATABASE_URL` | `postgresql://user:pass@localhost:5432/gym` |
   | `JWT_SECRET` | long random string (`openssl rand -base64 32`) |
   | `CSRF_SECRET` | optional, falls back to `JWT_SECRET` |
   | `FRONTEND_URL` | `http://localhost:3001` (OAuth and payment redirects) |
   | `CORS_ORIGINS` | `http://localhost:3001,http://localhost:5173` |
   | `REDIS_URL` | optional: `redis://:password@localhost:6379` (shared rate limits); in-memory without it |
   | `BOOKING_STRATEGY` | optional: `atomic` (default), `row_lock` or `serializable` |
   | `VNP_TMN_CODE`, `VNP_HASH_SECRET`, `VNP_URL`, `VNP_RETURN_URL` | VNPay sandbox credentials |
   | `VNP_RECONCILE_GRACE_MINUTES`, `VNP_PAYMENT_EXPIRY_MINUTES` | optional: 15 and 1440 |
   | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` | Google OAuth (optional) |
   | `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `FACEBOOK_CALLBACK_URL` | Facebook OAuth (optional) |
   | `EMAIL_SERVICE`, `EMAIL_USER`, `EMAIL_PASSWORD` | e-mails (skipped and logged when unset) |
   | `OPENAI_API_KEY` | AI advisor |
3. Migrate, add demo data, and run the API on `http://localhost:3000` (docs at `/api-docs`) and the worker:
   ```bash
   cd backend && npm ci && npx prisma migrate deploy && npm run db:seed
   npm run dev          # API
   npm run dev:worker   # in a second terminal: e-mails, reconciliation, expiry
   ```
   The seed creates `staff@gym.local` / `member@gym.local` with the passwords in `SEED_STAFF_PASSWORD` / `SEED_MEMBER_PASSWORD` (local defaults in `scripts/seed.ts`).
4. Admin console on `http://localhost:5173/admin/` (the app is served under `/admin`, so the bare `:5173` URL renders a blank page):
   ```bash
   cd frontend-admin && npm ci && VITE_API_BASE_URL=http://localhost:3000/api npm run dev
   ```
5. Member portal on `http://localhost:3001`:
   ```bash
   cd frontend-user-next && npm ci && NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api npx next dev -p 3001
   ```

## Project structure

```
backend/
  src/
    routes/index.ts   every endpoint, its path and auth level
    controllers/      endpoint declarations: zod schemas + handlers
    services/
      booking/        strategies, booking/cancel/promotion transactions
      outbox/         transactional outbox and its handlers
      payment/        VNPay gateway, IPN handling, reconciler
    lib/endpoint.ts   validation + typing + OpenAPI from one declaration
    worker.ts         background process
  prisma/             schema + migrations (CHECK constraints live in SQL)
  tests/              unit, integration (real PostgreSQL)
  scripts/            seed, booking benchmark, HTTP load test
e2e/                  Playwright tests for the member portal
loadtest/             k6 script
frontend-admin/       React + Vite staff console
frontend-user-next/   Next.js member portal
docs/                 design notes and benchmark results
```

## API changes in 2.0

For anyone who used the 1.x API:

- List endpoints are paginated: `GET /api/{bookings,checkins,classes,members,packages,subscriptions}` return `{ data, nextCursor }` and accept `limit` (max 100) and `cursor`.
- `POST /api/bookings` returns `409 CLASS_FULL` for a full class (was 400); send `waitlist: true` to join the waitlist instead. The client can no longer send a `status`.
- `PATCH /api/bookings/:id` is gone: staff cancel with `POST /api/bookings/:id/cancel` or delete. Both keep the seat counter and the waitlist right.
- `GET /api/members?count=active` moved to `GET /api/members/active-count`.
- Invalid input returns `400 { code: "VALIDATION_ERROR", details: [{ path, message }] }`.

Upgrading a 1.x deployment:

- Migration `20261105100000` turns the status columns into enums, so a 1.x image can no longer write to the database once it has run (every login fails). Take a `pg_dump` before deploying 2.0: rolling back means restoring it. Images are only tagged `latest`.
- 2.0 adds the `worker` service (membership expiry, outbox e-mails, VNPay reconciliation); without it memberships never expire. The deploy workflow now copies `docker-compose.prod.yml` and `nginx.conf` to the server before `docker compose up`.

## Roadmap

- Response schemas in the OpenAPI document.
- Metrics and tracing (Prometheus, OpenTelemetry) for booking latency and outbox lag.
- Admin view of dead-letter outbox events with a "retry" button.
