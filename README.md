# Gym Management System

A full-stack platform for running a gym: an **admin console** for staff and a **member portal** where members book classes, buy memberships through **VNPay**, and chat with an AI advisor.

[![Backend CI](https://github.com/Phongasfd/gym-management/actions/workflows/ci.yml/badge.svg)](https://github.com/Phongasfd/gym-management/actions/workflows/ci.yml)
![Node.js 20](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)
![Express 5](https://img.shields.io/badge/Express-5-000000?logo=express)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)
![PostgreSQL 16](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-black?logo=next.js)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)

---

## Highlights

| Problem | How it is solved |
| --- | --- |
| **Two members race for the last seat in a class** | Count and insert run in one `SERIALIZABLE` transaction. PostgreSQL aborts one of the two conflicting transactions (Prisma `P2034`), the server retries it up to 3 times, and the retry sees the class is full. Unit tests simulate the conflict. |
| **A payment must activate exactly one membership** | Memberships are activated only by VNPay's server-to-server **IPN**, never by the browser redirect. The IPN checks the HMAC-SHA512 signature, the order, its state and the amount. The update is `WHERE status = 'pending'`, so repeated IPN calls are idempotent. |
| **Sessions that survive XSS and token theft** | JWTs live in `httpOnly` cookies: a 15-minute access token, plus a 7-day refresh token stored only as a SHA-256 hash. Every refresh **rotates** the token. Reusing a revoked token revokes all of that user's sessions (theft detection). |
| **Cookie auth means CSRF risk** | Signed double-submit CSRF token (`csrf-csrf`, `__Host-` cookie in production) on every state-changing request. Tests prove that missing, tampered, cookie-less and foreign tokens are rejected. |
| **Abuse and leaks** | Redis-backed rate limiting (global plus a stricter login limit). Helmet headers and a CORS allow-list. Password fields are redacted from every error log. Members can only see and cancel their own bookings. |
| **Shipping safely** | GitHub Actions runs lint, unit tests, then integration tests on a real PostgreSQL. Only a green build on `main` builds three images, pushes them to Docker Hub and deploys to AWS EC2 behind Nginx (TLS). |

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
    browser["Browser<br/>(staff and members)"] -->|HTTPS| nginx["Nginx on AWS EC2<br/>TLS · gzip · path routing"]
    nginx -->|/admin/| admin["frontend-admin<br/>React + Vite"]
    nginx -->|/| user["frontend-user<br/>Next.js"]
    nginx -->|/api/| api["backend<br/>Express 5 · Prisma 6"]
    api --> pg[("PostgreSQL 16")]
    api --> redis[("Redis 7<br/>rate-limit counters")]
    api <-->|"signed payment URL · IPN callback"| vnpay["VNPay"]
    api --> openai["OpenAI API<br/>gpt-4o-mini"]
```

Only Nginx (ports 80 and 443) is reachable from the internet. The app containers bind to `127.0.0.1`, so nobody can bypass the proxy or spoof `X-Forwarded-For`.

## Features

**Staff (admin console)**
- Dashboard: members, today's classes, booked seats (cancelled bookings excluded).
- Manage members, membership packages, classes (capacity, coach, schedule) and each class's attendee list.
- Record check-ins; update own profile and password.

**Members (portal)**
- Sign up with email and password, Google or Facebook (Passport); complete profile; reset password with an e-mailed code.
- Browse and book classes, cancel bookings, and re-book a cancelled class.
- Buy a membership through VNPay; it activates automatically when the IPN arrives and expires after `duration_days`.
- AI advisor chat that recommends packages.

## Key flows

### Booking the last seat

```mermaid
sequenceDiagram
    autonumber
    participant M as Member
    participant API as backend
    participant DB as PostgreSQL
    M->>API: POST /api/bookings {class_id} + X-CSRF-Token
    API->>DB: BEGIN ISOLATION LEVEL SERIALIZABLE
    API->>DB: existing booking? class capacity? count non-cancelled bookings
    alt class full
        API-->>M: 400 Class is at full capacity
    else seat free
        API->>DB: INSERT booking (or re-activate a cancelled one)
        API->>DB: COMMIT
        alt serialization failure (P2034)
            API->>API: retry (max 3), the next attempt sees the committed state
        end
        API-->>M: 201 Created
    end
```

### Paying for a membership

```mermaid
sequenceDiagram
    autonumber
    participant M as Member browser
    participant API as backend
    participant V as VNPay
    M->>API: POST /api/vnpay/create-qr {packageId}
    API->>API: subscription = pending, sign URL (HMAC-SHA512)
    API-->>M: payment URL
    M->>V: pay
    V->>API: IPN (server-to-server, signed)
    API->>API: verify signature, order, state and amount
    API->>API: UPDATE ... SET active WHERE status = 'pending'
    API-->>V: RspCode 00 (repeats return 02, already confirmed)
    V-->>M: redirect to return URL (display only)
```

## Tech stack

| Layer | Technology |
| --- | --- |
| Backend | Node.js 20, Express 5, Prisma 6 (7 migrations), Passport (Google, Facebook), Nodemailer, Winston, Swagger (`/api-docs`) |
| Security | `httpOnly` JWT cookies, refresh-token rotation, `csrf-csrf`, Helmet, `express-rate-limit` + `rate-limit-redis`, bcrypt |
| Data | PostgreSQL 16 ([ERD](backend/erd/gym-management.png)), Redis 7 |
| Frontends | React + Vite (admin), Next.js App Router (member portal), Axios interceptors (CSRF token, silent refresh) |
| Integrations | VNPay (sandbox), OpenAI API |
| Testing | Jest, Supertest, real PostgreSQL in CI |
| Delivery | Docker, Docker Compose, Nginx, GitHub Actions, Docker Hub, AWS EC2 |

## Design decisions and trade-offs

| Decision | Why | Trade-off / alternative |
| --- | --- | --- |
| `SERIALIZABLE` + retry for bookings | Correct under concurrency with simple code; contention per class is low | Under heavy contention: an atomic `UPDATE classes SET booked = booked + 1 WHERE booked < capacity`, or a Redis counter |
| Soft-cancel bookings | Keeps history; the unique `(member_id, class_id)` index stays a hard guard | Every count must filter `status`; re-booking re-activates the row |
| IPN as the source of truth | The browser redirect can be lost or forged | Needs a reconciliation job for IPNs that never arrive (roadmap) |
| Tokens in `httpOnly` cookies | XSS cannot read them | Requires CSRF protection, which is in place |
| Rate-limit state in Redis | Shared across instances, survives restarts | One more service to run |

## Testing

```bash
cd backend
npm run lint
npm run test:unit   # 33 tests, Prisma mocked
npm run test:ci     # resets a test DB, then runs integration tests on PostgreSQL
```

The unit tests cover:
- Booking: capacity, re-booking, `P2034` retry, member vs staff permissions.
- VNPay IPN: Decimal price, wrong amount, bad signature.
- CSRF: valid token; missing, tampered, cookie-less and foreign tokens.
- Login and refresh-token rotation, including reuse detection.
- Staff password change.

CI runs all of the above on every push and pull request.

## Getting started

**Prerequisites:** Node.js 20, Docker.

1. Start PostgreSQL and Redis. Put `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` and `REDIS_PASSWORD` in a root `.env`, then run:
   ```bash
   docker compose -f docker-compose.dev.yml up -d
   ```
2. Create `backend/.env`:

   | Variable | Example / purpose |
   | --- | --- |
   | `DATABASE_URL` | `postgresql://user:pass@localhost:5432/gym` |
   | `REDIS_URL` | `redis://:password@localhost:6379` |
   | `JWT_SECRET` | long random string (`openssl rand -base64 32`) |
   | `CSRF_SECRET` | optional, falls back to `JWT_SECRET` |
   | `FRONTEND_URL` | `http://localhost:3001` |
   | `VNP_TMN_CODE`, `VNP_HASH_SECRET`, `VNP_URL`, `VNP_RETURN_URL` | VNPay sandbox credentials |
   | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` | Google OAuth (optional) |
   | `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` | Facebook OAuth (optional) |
   | `EMAIL_SERVICE`, `EMAIL_USER`, `EMAIL_PASSWORD` | password-reset e-mails |
   | `OPENAI_API_KEY` | AI advisor |
3. Run the backend on `http://localhost:3000`, with API docs at `/api-docs`:
   ```bash
   cd backend && npm ci && npx prisma migrate deploy && npm run dev
   ```
4. Run the admin console on `http://localhost:5173`:
   ```bash
   cd frontend-admin && npm ci && VITE_API_BASE_URL=http://localhost:3000/api npm run dev
   ```
5. Run the member portal on `http://localhost:3001`:
   ```bash
   cd frontend-user-next && npm ci && NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api npx next dev -p 3001
   ```

## Project structure

```
backend/
  controllers/      request handlers (auth, bookings, classes, members, vnpay, ...)
  routes/           Express routers + Swagger annotations
  middleware/       auth, CSRF, rate limit, error handler, request logger
  services/         subscriptions, e-mail, AI
  prisma/           schema + migrations
  tests/            unit (Prisma mocked) and integration (real PostgreSQL)
frontend-admin/     React + Vite staff console
frontend-user-next/ Next.js member portal
nginx.conf          TLS termination and routing
.github/workflows/  ci.yml (lint + tests), deploy.yml (build, push, deploy after green CI)
```

## Roadmap

- An integration test that fires 50 parallel bookings at a class with one free seat and asserts exactly one succeeds.
- A reconciliation job that queries VNPay for `pending` payments whose IPN never arrived.
- TypeScript and schema validation (zod) on every route.
- Metrics and tracing (Prometheus, OpenTelemetry).
