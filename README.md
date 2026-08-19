# ReachInbox Email Scheduler (Full-Stack Engine)

A production-grade cold email scheduling and automation engine built with **TypeScript, Express, BullMQ, Redis, MySQL (Prisma), Nodemailer (Ethereal SMTP), Next.js 14+ (App Router), Tailwind CSS, and NextAuth.js (Google OAuth)**.

---

## 🌟 Key Features

1. **BullMQ Delayed Email Queue**:
   - Delayed job scheduling with configurable worker concurrency (`WORKER_CONCURRENCY=5`).
   - Staggered send delays (`MIN_DELAY_MS_BETWEEN_SENDS=2000ms`).

2. **Atomic Redis Rate Limiting**:
   - Hourly sliding/fixed window rate limit per sender identity (`MAX_EMAILS_PER_HOUR_PER_SENDER=200`) and globally (`MAX_EMAILS_PER_HOUR=1000`).
   - When limits are reached, jobs are automatically re-queued for dispatch into the next hour window.

3. **Deterministic Idempotency (SHA-256)**:
   - Derives idempotency key `sha256(senderId + ":" + recipientEmail + ":" + subject + ":" + scheduledAt)`.
   - Guaranteed deduplication across DB and BullMQ worker queues.

4. **Crash Resilience & Server Recovery Audit**:
   - On backend startup, audits `PENDING` records in MySQL against active/delayed jobs in BullMQ.
   - Automatically recovers missing delayed jobs without losing or duplicating emails.

5. **Multi-Sender Distribution**:
   - **Round-Robin**: Distributes batch recipient lists evenly across active sender identities.
   - **Single Sender**: Option to select a single dedicated sender identity per batch.

6. **Live Telemetry & Ethereal SMTP Links**:
   - Automatic creation of test Ethereal SMTP accounts on boot.
   - Clickable preview URLs returned for every sent email in the dashboard.

7. **NextAuth Google OAuth & DEV_MODE Fallback**:
   - Google OAuth 2.0 integration for enterprise auth.
   - Local demo credentials auth strictly gated behind `DEV_MODE=true`.

---

## 🚀 Quick Start

### 1. Start Infrastructure via Docker Compose
```bash
docker-compose up -d
```
Starts MySQL 8.0 on port `3306` and Redis 7 on port `6379`.

### 2. Install Dependencies & Generate Prisma Client
```bash
npm install
npm run prisma:generate --workspace=apps/backend
npm run prisma:push --workspace=apps/backend
```

### 3. Start Development Servers
```bash
# Start both backend and frontend concurrently
npm run dev

# Or start individually:
npm run dev:backend   # Express API at http://localhost:5000
npm run dev:frontend  # Next.js App at http://localhost:3000
```

---

## 🧪 Verification & Restart Safety Testing

Run the automated restart safety test:
```bash
npm run verify:restart-safety
```

---

## 📁 Repository Architecture

```
Outbox_Labs/
├── apps/
│   ├── backend/
│   │   ├── prisma/
│   │   │   └── schema.prisma         # Sender, Lead, ScheduledEmail, SendLog models
│   │   └── src/
│   │       ├── config/env.ts         # Strictly-typed environment variables
│   │       ├── controllers/          # Express API route handlers
│   │       ├── queue/
│   │       │   ├── email.queue.ts    # BullMQ producer & SHA-256 idempotency key
│   │       │   └── email.worker.ts   # BullMQ worker (5 concurrency, 2000ms delay)
│   │       └── services/
│   │           ├── ethereal.service.ts      # Ethereal SMTP provider & preview URLs
│   │           ├── rate-limiter.service.ts  # Redis atomic hourly rate limiter
│   │           └── recovery.service.ts      # Startup audit & crash recovery
│   └── frontend/
│       └── src/
│           ├── app/                  # Next.js App Router (Dashboard & Auth)
│           └── components/           # Glassmorphism UI components (ComposeModal, Tables)
├── scripts/
│   └── verify-restart-safety.ts      # Automated restart safety audit script
├── docker-compose.yml                # MySQL 8.0 & Redis 7 containers
└── package.json                      # Monorepo workspace configuration
```
