# Saludario API

Backend API for Saludario, a web-based food diary focused on health tracking.

## Documentation Rule

- `README.md` must be updated whenever important decisions are made (scope, architecture, stack, security, infrastructure, or roadmap changes).

## Product Scope (MVP)

- User registration
- User login/logout
- Personal meal history
- Create, read, update, delete food entries
- Meal categories: Breakfast, Lunch, Dinner, Snack

## Approved Technical Decisions

- Architecture: Modular monolith
- Backend framework: Fastify (Node.js + TypeScript)
- Database: PostgreSQL
- ORM/migrations: Prisma
- Auth strategy: Cookie-based server sessions
- Login scope: Email/password only for v1
- Email verification: Deferred to post-MVP
- Edit history: Deferred (MVP uses last-write-wins updates)
- API error format: RFC 7807 Problem Details (`application/problem+json`) with `code` and `request_id` extensions
- Pagination strategy (food-entry listing): Cursor-based using `(consumed_at, id)` descending order
- Testing baseline: Vitest (unit), Supertest (API integration), Playwright (critical e2e paths)
- Infrastructure: Local-only for now
- Future cloud direction: Single-region EU
- Future symptom support: Include schema + internal API in MVP boundary
- Specialist support: Security specialist included for MVP

## Reference Documents

- Technical proposal: [docs/TECHNICAL_PROPOSAL.md](./docs/TECHNICAL_PROPOSAL.md)
- API contract baseline: [docs/API_CONTRACT.md](./docs/API_CONTRACT.md)
- Architecture & folder conventions: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- Schema & migration plan: [docs/SCHEMA_PLAN.md](./docs/SCHEMA_PLAN.md)
- Security checklist: [docs/SECURITY_CHECKLIST.md](./docs/SECURITY_CHECKLIST.md)
- End-to-end test plan: [docs/E2E_TEST_PLAN.md](./docs/E2E_TEST_PLAN.md)
- Release readiness checklist: [docs/RELEASE_READINESS.md](./docs/RELEASE_READINESS.md)
- Delivery milestones: [docs/MILESTONES.md](./docs/MILESTONES.md)
- Agent/operating rules: [AGENTS.md](./AGENTS.md)

## Local Development

### Prerequisites

- Node.js 22
- npm
- Docker and Docker Compose

### Environment Setup

1. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

2. Replace `SESSION_SECRET` in `.env` with a real 64-character random string.

### Start the Servers

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start PostgreSQL:

   ```bash
   docker compose up -d db
   ```

3. Apply database migrations:

   ```bash
   npm run db:migrate
   ```

4. Seed the database (optional, but useful for local testing):

   ```bash
   npm run db:seed
   ```

5. Start the API in development mode:

   ```bash
   npm run dev
   ```

The API listens on `http://localhost:3000` by default.

### Security Notes

- State-changing requests (`POST`, `PATCH`, `DELETE`) must include:

  ```bash
  X-Requested-With: XMLHttpRequest
  ```

- Responses include request tracing via `x-request-id`.
- API hardening details live in [docs/SECURITY_CHECKLIST.md](./docs/SECURITY_CHECKLIST.md).
- In any deployed environment behind TLS termination, keep `NODE_ENV=production` so `Secure` cookies and HSTS remain enabled.

### Useful Commands

- Run the local validation gate:

  ```bash
  npm run check
  ```

- Health check:

  ```bash
  curl http://localhost:3000/api/v1/health
  ```

- Open Prisma Studio:

  ```bash
  npm run db:studio
  ```

- Stop PostgreSQL:

  ```bash
  docker compose stop db
  ```

- Remove expired and revoked sessions:

  ```bash
  npm run db:cleanup-sessions
  ```

- Create a local PostgreSQL backup:

  ```bash
  npm run db:backup-local
  ```

### Logging and Backups

- Request logs include a request id and are emitted to stdout through Pino.
- Do not log passwords or session tokens.
- Local backups are created with `pg_dump` in `./backups` by default.
- Run a local restore drill before any release-like milestone.

### Git Hooks

- This repo uses a local pre-commit hook to run `npm run check` before each commit.
- Enable it for your clone with:

  ```bash
  git config core.hooksPath .githooks
  ```

## MVP Definition of Done

- Secure auth with email/password and cookie sessions
- Strict per-user data ownership enforcement
- Full food-entry CRUD with category/date filtering
- Symptom data represented in schema and internal API
- Core automated tests covering critical flows
- Local backup and log workflow documented

## Out of Scope for MVP

- Social login (Google/Apple)
- Email verification
- Food edit-history/audit UI
- Symptom correlation engine/analytics
- Cloud production deployment
