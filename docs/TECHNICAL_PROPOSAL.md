# 1. Technical Executive Summary
**Facts from your brief**
- MVP needs registration/login, personal meal history, CRUD food entries, and meal categorization.
- Symptom tracking/correlation must be supported later, but not fully built now.

**Assumptions**
- Small team (2-6 engineers), web-first product, moderate traffic in year 1.
- Priority is fast delivery with maintainable code and low ops burden.

**Recommendation**
- Build a **modular monolith** with clear domain modules, not microservices.
- Use **TypeScript end-to-end**, **PostgreSQL**, **REST API**, and **cookie-based sessions**.
- Ship MVP in phases with strict scope control; design schema now for future symptom/event data.
- Approved by reviewer: Fastify, PostgreSQL, cookie sessions, and monolith architecture.

# 2. Recommended Stack
- Frontend: **Next.js (React + TypeScript)**.
- Backend: **Node.js + Fastify + TypeScript** (modular monolith).
- Database: **PostgreSQL 16+**.
- ORM/migrations: **Prisma**.
- Authentication: **Email/password with Argon2id**, server-managed sessions in DB, secure HTTP-only cookies.
- API style: **REST JSON**, versioned as `/api/v1`, OpenAPI spec generated from code.
- API errors: **RFC 7807 Problem Details** (`application/problem+json`) plus stable `code` and `request_id` extensions.
- Pagination: **Cursor-based** for food-entry listing, ordered by `(consumed_at desc, id desc)`.
- Infrastructure: **Local-first development setup** for now (no cloud deployment in MVP phase).
- Deployment: **Local Docker Compose** (API + PostgreSQL) as the primary runtime target until cloud approval.
- Observability/logging: **Pino structured logs** in local runtime; centralized sink and **Sentry** when hosted environments are introduced.
- Testing: **Vitest** (unit), **Supertest** (API integration), **Playwright** (critical e2e paths).

# 3. Stack Tradeoffs and Alternatives
- Prisma vs Drizzle:
- Prisma was selected for MVP due to team familiarity, schema clarity, and migration ergonomics.
- Drizzle remains a strong SQL-first alternative but adds decision overhead right now without clear MVP upside.
- Fastify vs NestJS:
- Fastify is lighter/faster and simpler for MVP.
- NestJS gives more scaffolding but adds framework complexity and ceremony.
- PostgreSQL vs MongoDB:
- PostgreSQL is better for relational constraints, filtering by date/category, and future correlation queries.
- MongoDB is flexible early but can make reporting and constraints harder later.
- Cookie sessions vs JWT-only auth:
- Cookie sessions simplify revocation/logout and reduce token leakage risk in browser apps.
- JWT-only is stateless but harder to revoke safely and usually adds refresh-token complexity.
- Monolith vs microservices:
- Monolith is lower operational burden and faster to ship.
- Microservices are only justified later if team size/domain boundaries force it.

# 4. Architecture Proposal
- Style: **Modular monolith** with modules: `auth`, `users`, `food_entries`, `meal_categories`, `future_symptoms`.
- Frontend-backend interaction:
- Next.js consumes backend REST endpoints.
- Session cookie sent automatically for authenticated calls.
- API structure:
- `/api/v1/auth/*` for register/login/logout/session.
- `/api/v1/entries/*` for CRUD and query by date/category.
- `/api/v1/categories/*` read-only for MVP categories.
- Persistence strategy:
- PostgreSQL with strict FK constraints and indexed time-based queries.
- Future extensibility:
- Reserve `symptom_events` and optional `entry_symptom_links` tables for future analysis.
- Keep ingestion (entries/events) separate from analytics/correlation jobs.
- Complexity control:
- No event bus, no CQRS, no microservices in v1.
- Single codebase, clear module interfaces.

# 5. Data Model Proposal
**Core entities**
- `users`
- `id (uuid pk)`, `email (unique)`, `password_hash`, `timezone`, `created_at`, `updated_at`, `deleted_at nullable`.
- `meal_categories`
- `id`, `code` (`breakfast|lunch|dinner|snack` unique), `label`.
- `food_entries`
- `id (uuid pk)`, `user_id (fk users)`, `meal_category_id (fk)`, `food_name`, `quantity_value nullable`, `quantity_unit nullable`, `notes nullable`, `consumed_at (timestamptz)`, `created_at`, `updated_at`.
- `auth_sessions`
- `id`, `user_id`, `session_token_hash`, `expires_at`, `created_at`, `revoked_at nullable`, `ip_hash nullable`, `user_agent nullable`.

**Future-ready entities (not full MVP scope)**
- `symptom_events`
- `id`, `user_id`, `symptom_code`, `severity`, `occurred_at`, `notes`.
- `entry_symptom_links` (optional later for explicit linking or model outputs)
- `id`, `entry_id`, `symptom_event_id`, `link_type`, `confidence`, `created_at`.

**Constraints/indexing**
- Unique index on `users.email`.
- Index `food_entries(user_id, consumed_at desc, id desc)`.
- Index `food_entries(user_id, meal_category_id, consumed_at desc, id desc)`.
- Future index `symptom_events(user_id, occurred_at desc, id desc)`.
- Enforce ownership via `user_id` on all personal records.

**Auditability**
- Keep `created_at/updated_at` everywhere.
- MVP decision: use last-write-wins updates only, without edit-history tables.

# 6. Authentication and Security Approach
- Registration/login:
- Email + password MVP only, with no email verification in v1.
- Password handling:
- Argon2id hashing, strong password policy, rate-limited login endpoint.
- Session strategy:
- Server-side sessions stored in DB; cookie flags: `HttpOnly`, `Secure`, `SameSite=Lax`.
- Authorization boundary:
- Every query scoped by authenticated `user_id`; no cross-user access paths.
- Privacy defaults:
- Minimize PII collection (email only for MVP).
- Avoid logging raw food notes or sensitive payloads where unnecessary.
- Security controls:
- CSRF protection for state-changing endpoints.
- Input validation (Zod/DTOs), SQL-safe ORM usage, basic abuse/rate limits.
- Periodic dependency/security scanning in CI.

# 7. Infrastructure and Deployment Approach
- Hosting model:
- Local-only development runtime for current phase.
- No cloud hosting until explicit approval for deployment stage.
- Future cloud direction (already decided): single-region EU when deployment starts.
- Environment separation:
- `local` only for now. `staging` and `production` deferred until hosting approval.
- Secrets handling:
- Local environment variables via `.env` files (not committed), no secrets in repo or logs.
- Backups:
- Local backup script and periodic dump verification during development.
- Managed backup policy deferred to cloud deployment phase.
- Observability:
- Structured logs with request IDs in local runtime.
- Sentry and uptime checks deferred until first hosted environment.
- Operational simplicity:
- Keep one API service and one Postgres instance in local Docker setup.
- No Kubernetes and no distributed services in MVP.

# 8. MVP Technical Roadmap
1. **Phase 0: Foundations (1 week)**
- Repo structure, CI, env management, DB migrations, logging baseline.
2. **Phase 1: Auth + User Accounts (1-2 weeks)**
- Register/login/logout/session endpoints, ownership enforcement, minimal profile.
3. **Phase 2: Food Entry Core (2 weeks)**
- Meal categories, create/edit/delete entries, list/history filtering by date/category.
4. **Phase 3: UX + Reliability (1-2 weeks)**
- Validation hardening, error states, and e2e tests for critical flows in local runtime.
5. **Phase 4: Deferred Readiness (1 week)**
- Add symptom-event schema and internal API endpoints for symptom data.
- Keep symptom correlation logic out of MVP, but ensure the API boundary exists.

**Minimum technically sound MVP**
- Secure auth, ownership-safe CRUD, searchable history, tests on critical paths, and local backup/logging workflows in place.

# 9. Technical Risks and Mitigations
- Architectural risk: Overbuilding for future correlation.
- Mitigation: Keep future tables/interfaces only; defer analytics engines/jobs.
- Product-technical unknown: Data needed for useful future correlation is uncertain.
- Mitigation: Capture high-quality timestamps/timezone now; keep schema extensible.
- Privacy/security risk: Sensitive health-adjacent data exposure.
- Mitigation: Data minimization, secure sessions, strict authz scoping, safe logging.
- Delivery risk: Scope creep into symptom tracking before MVP.
- Mitigation: Freeze MVP scope at food diary workflows; treat symptom features as post-MVP milestone.
- Operational risk: Under-invested observability causing slow incident response.
- Mitigation: Require baseline logs, alerts, and Sentry before production launch.
- Staffing risk: Missing early security review can delay release hardening.
- Mitigation: Include a security specialist review in MVP readiness phase.

# 10. Questions Requiring Human Approval (Resolved)
1. Approved: Defer email verification to post-MVP.
2. Approved: Use single-region EU when cloud deployment starts.
3. Approved: MVP uses last-write-wins updates only (no edit history).
4. Approved: Local-only infrastructure for now.
5. Approved: Email/password only for v1 (no social login).
6. Approved: Include symptom tracking in schema and internal API surface.
7. Approved: Include security specialist for MVP; data/analytics specialist deferred.
8. Approved (March 8, 2026): Use Prisma as ORM/migrations baseline.
9. Approved (March 8, 2026): Use RFC 7807 Problem Details with `code` and `request_id` API extensions.
10. Approved (March 8, 2026): Use cursor-based pagination for food-entry listing with `(consumed_at, id)` ordering.
11. Approved (March 13, 2026): Use Vitest as the unit test framework baseline.
