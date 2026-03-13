# Saludario — Architecture Skeleton & Folder Conventions

Status: Pending approval  
Date: March 13, 2026  
Scope: Repo structure, module boundaries, and conventions for the Fastify + Prisma modular monolith

## 1. Top-level Layout

```
saludario-api/
├── docs/                        # Planning and design documents (no code)
├── prisma/
│   ├── schema.prisma            # Single Prisma schema file
│   └── migrations/              # Prisma auto-generated migration SQL
├── src/
│   ├── app.ts                   # Fastify app factory (plugin registration, global hooks)
│   ├── server.ts                # Entry point: starts the Fastify server
│   ├── config/
│   │   ├── index.ts             # Validated env config (dotenv + Zod)
│   │   └── session.ts           # Session/cookie policy constants
│   ├── common/
│   │   ├── errors.ts            # RFC 7807 error builder + app error codes
│   │   ├── pagination.ts        # Cursor encode/decode helpers
│   │   ├── logger.ts            # Pino logger setup
│   │   ├── request-id.ts        # Request-id generation hook
│   │   └── schemas.ts           # Shared Zod schemas (pagination params, UUID, etc.)
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.ts        # POST register/login/logout, GET session
│   │   │   ├── auth.service.ts       # Business logic (register, login, session mgmt)
│   │   │   ├── auth.schemas.ts       # Zod request/response schemas
│   │   │   ├── auth.hooks.ts         # requireAuth preHandler hook
│   │   │   └── auth.test.ts          # Unit tests for service layer
│   │   ├── users/
│   │   │   ├── users.repository.ts   # DB queries (Prisma) for user records
│   │   │   └── users.test.ts
│   │   ├── entries/
│   │   │   ├── entries.routes.ts     # CRUD + list with filters
│   │   │   ├── entries.service.ts    # Business logic, ownership checks
│   │   │   ├── entries.repository.ts # DB queries for food_entries
│   │   │   ├── entries.schemas.ts    # Zod schemas for entries
│   │   │   └── entries.test.ts
│   │   ├── categories/
│   │   │   ├── categories.routes.ts  # GET /categories (read-only)
│   │   │   ├── categories.service.ts
│   │   │   └── categories.test.ts
│   │   └── symptoms/
│   │       ├── symptoms.routes.ts    # Internal symptom API surface
│   │       ├── symptoms.service.ts
│   │       ├── symptoms.repository.ts
│   │       ├── symptoms.schemas.ts
│   │       └── symptoms.test.ts
│   └── plugins/
│       ├── prisma.ts            # Fastify plugin: Prisma client lifecycle
│       ├── session.ts           # Fastify plugin: cookie-session middleware
│       └── rate-limit.ts        # Fastify plugin: rate limiting config
├── tests/
│   ├── integration/             # Supertest API integration tests
│   │   ├── auth.integration.test.ts
│   │   ├── entries.integration.test.ts
│   │   └── helpers/
│   │       ├── setup.ts         # Test DB setup, app factory for tests
│   │       └── fixtures.ts      # Seed data helpers
│   └── e2e/                     # Playwright e2e tests (deferred to Milestone 4)
├── scripts/
│   ├── seed.ts                  # Seed meal_categories + dev data
│   └── backup-local.sh          # Local pg_dump wrapper
├── docker-compose.yml           # Local runtime: API + PostgreSQL
├── Dockerfile                   # Multi-stage Node.js build
├── .env.example                 # Template for local env vars
├── tsconfig.json
├── package.json
├── vitest.config.ts
├── .eslintrc.cjs
├── .prettierrc
├── .gitignore
├── AGENTS.md
└── README.md
```

## 2. Module Boundaries

Each module under `src/modules/<name>/` is self-contained:

| Layer | File pattern | Responsibility |
|-------|-------------|----------------|
| **Routes** | `<name>.routes.ts` | HTTP layer: path, method, schema binding, hooks. Registers as a Fastify plugin (encapsulated). |
| **Service** | `<name>.service.ts` | Business logic, validation orchestration, ownership enforcement. No HTTP concerns. |
| **Repository** | `<name>.repository.ts` | Direct Prisma queries. Receives PrismaClient as dependency. No business logic. |
| **Schemas** | `<name>.schemas.ts` | Zod schemas for request validation and typed response shapes. |
| **Tests** | `<name>.test.ts` | Unit tests co-located with their module. |

### Dependency rules

- **Routes → Service → Repository → Prisma** (one-way only).
- Modules do **not** import from each other's internals. Cross-module communication goes through services, injected via the Fastify DI container or simple constructor injection.
- Exception: `auth.hooks.ts` exports `requireAuth`, which other modules' routes use as a `preHandler`.

## 3. Plugin Registration Order

In `app.ts`, plugins register in this order:

1. `config` — load and validate env
2. `logger` / `request-id` — structured logging with request tracing
3. `prisma` — connect Prisma client, decorate `fastify.prisma`
4. `session` — cookie session middleware
5. `rate-limit` — global rate limiting
6. Module routes (each as an `autoPrefix` Fastify plugin under `/api/v1`)

## 4. Naming & Code Conventions

| Aspect | Convention |
|--------|-----------|
| File names | `kebab-case` for config, `<module>.<layer>.ts` for modules |
| Exports | Named exports only (no default exports) |
| Route prefix | Each module registers with `prefix: '/api/v1/<resource>'` |
| IDs | UUID (generated by PostgreSQL `gen_random_uuid()`) |
| Timestamps | `timestamptz` in DB, ISO-8601 strings in API responses |
| Validation | Zod schemas; Fastify `setValidatorCompiler` with `zod` |
| Serialisation | Fastify `setSerializerCompiler` with JSON schema or manual `toJSON` |
| Error responses | Always through `common/errors.ts` → RFC 7807 format |
| Logging | Use `request.log` inside routes (inherits request-id); `fastify.log` elsewhere |
| Tests | Vitest; co-located unit tests; integration tests in `tests/integration/` |
| Strict mode | `"strict": true` in tsconfig; `noUncheckedIndexedAccess: true` |

## 5. Environment Variables

Managed via `.env` (never committed), validated at startup with Zod:

| Variable | Example | Required |
|----------|---------|----------|
| `DATABASE_URL` | `postgresql://user:pass@localhost:5432/saludario` | Yes |
| `SESSION_SECRET` | 64-char random hex | Yes |
| `SESSION_MAX_AGE_SECONDS` | `604800` (7 days) | Yes |
| `PORT` | `3000` | No (default `3000`) |
| `LOG_LEVEL` | `info` | No (default `info`) |
| `NODE_ENV` | `development` | No (default `development`) |
| `RATE_LIMIT_MAX` | `100` | No (default `100`) |
| `RATE_LIMIT_WINDOW_MS` | `60000` | No (default `60000`) |

## 6. Docker Compose (Local Runtime)

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: saludario
      POSTGRES_USER: saludario
      POSTGRES_PASSWORD: localdev
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  api:
    build: .
    depends_on:
      - db
    ports:
      - "3000:3000"
    env_file:
      - .env
    volumes:
      - ./src:/app/src  # Dev hot-reload

volumes:
  pgdata:
```

## 7. Decisions Embedded

- **Single Prisma schema file**: avoids multi-schema complexity. Review if the schema grows past ~15 models.
- **No barrel `index.ts` files**: each import is explicit to avoid circular dependency risks and improve tree-shaking.
- **Co-located unit tests**: faster feedback loop during development; integration tests stay separated for different lifecycle.

## 8. Open for Review

- Confirm UUID version preference (v4 default via `gen_random_uuid()` vs v7 with extension for sort-friendliness).
- Confirm Vitest vs Jest (Vitest recommended for speed with TypeScript/ESM).
- Confirm whether `symptoms` module routes should be behind a feature flag or just under `/internal/` prefix as specified in API contract.
