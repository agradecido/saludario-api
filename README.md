# Saludario API

Backend planning repository for Saludario, a web-based food diary focused on health tracking.

This repository currently contains technical planning artifacts. Implementation has not started yet.

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
- Infrastructure: Local-only for now
- Future cloud direction: Single-region EU
- Future symptom support: Include schema + internal API in MVP boundary
- Specialist support: Security specialist included for MVP

## Reference Documents

- Technical proposal: [docs/TECHNICAL_PROPOSAL.md](./docs/TECHNICAL_PROPOSAL.md)
- API contract baseline: [docs/API_CONTRACT.md](./docs/API_CONTRACT.md)
- Delivery milestones: [docs/MILESTONES.md](./docs/MILESTONES.md)
- Agent/operating rules: [AGENTS.md](./AGENTS.md)

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
