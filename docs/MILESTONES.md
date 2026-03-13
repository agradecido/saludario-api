# Saludario MVP Milestones

Planning baseline for the approved MVP direction:
- Fastify + Node.js + TypeScript
- PostgreSQL
- Cookie-based server sessions
- Modular monolith
- Local-only infrastructure for now

## Milestone 0: Foundations (Week 1)

Objectives:
- Finalize module boundaries and repo structure
- Define API conventions (`/api/v1`)
- Define migration and local runtime standards
- Define logging and validation standards

Checklist:
- [x] ORM decision closed: Prisma selected (March 8, 2026)
- [x] API error format defined: RFC 7807 Problem Details (`application/problem+json`) with `code` and `request_id`
- [x] Pagination strategy defined for entry listing: cursor `(consumed_at, id)` descending
- [x] Architecture skeleton and folder conventions drafted (`docs/ARCHITECTURE.md`, March 13, 2026)
- [x] Initial schema/migration plan drafted (`docs/SCHEMA_PLAN.md`, March 13, 2026)
- [x] Endpoint definition-of-done documented (`docs/API_CONTRACT.md`, March 8, 2026)

Exit criteria:
- Team agrees on structure, standards, and database baseline

## Milestone 1: Auth and Ownership (Weeks 2-3)

Objectives:
- Implement registration/login/logout/session flows
- Enforce strict per-user account ownership boundaries

Checklist:
- [x] Auth endpoint contract documented (`docs/API_CONTRACT.md`, March 8, 2026)
- [x] Password hashing and session policy documented (`src/modules/auth/password.ts`, `src/config/session.ts`, `docs/IMPLEMENTATION_STEPS.md`, March 13, 2026)
- [ ] Ownership rules documented for protected routes
- [x] Critical auth test scenarios defined (`docs/IMPLEMENTATION_STEPS.md`, March 13, 2026)

Exit criteria:
- Auth design is complete, testable, and ownership-safe by design

## Milestone 2: Food Entry Core (Weeks 4-5)

Objectives:
- Build CRUD for food entries
- Support browsing/history by date and meal category

Checklist:
- [x] Food entry endpoint contract documented (`docs/API_CONTRACT.md`, March 8, 2026)
- [x] Filter/query behavior specified (date range, category, pagination rules) (`docs/API_CONTRACT.md`, March 8, 2026)
- [x] Last-write-wins update behavior explicitly documented (`docs/API_CONTRACT.md`, March 8, 2026)
- [ ] Critical food-entry test scenarios defined

Exit criteria:
- Food diary core behavior is fully specified for MVP implementation

## Milestone 3: Symptom API Readiness (Week 6)

Objectives:
- Include symptom tracking in schema and internal API surface
- Keep correlation logic out of MVP

Checklist:
- [x] `symptom_events` data contract documented (`docs/API_CONTRACT.md`, March 8, 2026)
- [x] Internal symptom API boundaries documented (`docs/API_CONTRACT.md`, March 8, 2026)
- [x] Indexing and future extensibility review completed (`docs/SCHEMA_PLAN.md`, March 13, 2026)

Exit criteria:
- Symptom readiness is preserved without expanding MVP scope

## Milestone 4: Hardening and Release Readiness (Weeks 7-8)

Objectives:
- Validate security and reliability readiness
- Prepare MVP handoff for implementation execution

Checklist:
- [ ] End-to-end critical-path test plan completed
- [ ] Security specialist review completed
- [ ] MVP release readiness checklist completed
- [ ] Local backup and log workflow documented

Exit criteria:
- MVP plan is implementation-ready with explicit security and quality gates

## Out of Scope (MVP)

- Email verification
- Social login (Google/Apple)
- Food edit history/audit trail
- Symptom correlation engine/analytics
- Cloud deployment in current phase
