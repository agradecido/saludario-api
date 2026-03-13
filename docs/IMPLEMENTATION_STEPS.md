# Plan: Desarrollo completo Saludario API (MVP)

Plan de implementación end-to-end del backend Saludario, basado en los documentos aprobados: ARCHITECTURE.md, SCHEMA_PLAN.md, API_CONTRACT.md, MILESTONES.md.

**TL;DR**: Implementar el monolito modular Fastify+Prisma+PostgreSQL en 5 fases secuenciales. Cada fase es independientemente verificable. Se empieza por el scaffolding del proyecto y la infraestructura local (Docker, Prisma, config), luego auth, luego food entries CRUD, después symptoms, y finalmente hardening.

---

## Phase 1: Project Scaffolding & Infrastructure Local

Objetivo: proyecto arrancable con Docker, Prisma conectado, primer endpoint health, y toda la base compartida.

**Steps**

1. **Inicializar proyecto Node.js + TypeScript**
   - `npm init`, instalar dependencias: `fastify`, `@fastify/cookie`, `@fastify/rate-limit`, `prisma`, `@prisma/client`, `zod`, `argon2`, `pino`, `dotenv`
   - Dev deps: `typescript`, `vitest`, `supertest`, `@types/node`, `eslint`, `prettier`, `tsx` (dev runner)
   - Crear `tsconfig.json` (strict, ESM, paths), `vitest.config.ts`, `.eslintrc.cjs`, `.prettierrc`

2. **Crear estructura de carpetas** — según `docs/ARCHITECTURE.md`
   - `src/`, `src/config/`, `src/common/`, `src/modules/auth/`, `src/modules/users/`, `src/modules/entries/`, `src/modules/categories/`, `src/modules/symptoms/`, `src/plugins/`, `tests/integration/helpers/`, `scripts/`

3. **Docker Compose** — *parallel with step 2*
   - `docker-compose.yml` con servicio `db` (postgres:16-alpine) y servicio `api`
   - `Dockerfile` multi-stage (build + runtime)
   - `.env.example` con todas las variables de `ARCHITECTURE.md §5`

4. **Prisma schema + migración inicial**  — *depends on step 1*
   - Crear `prisma/schema.prisma` con los 5 modelos de `SCHEMA_PLAN.md §2`
   - Ejecutar `npx prisma migrate dev --name init`
   - Crear `scripts/seed.ts` (upsert 4 meal_categories)
   - Configurar `prisma.seed` en `package.json`

5. **Config module** (`src/config/index.ts`) — *depends on step 1*
   - Zod schema para validar env vars al arrancar
   - Export typed config object

6. **Common utilities** — *parallel with step 5*
   - `src/common/errors.ts`: builder RFC 7807 (`createProblem(status, code, title, detail, extras)`)
   - `src/common/pagination.ts`: `encodeCursor({consumed_at, id})`, `decodeCursor(opaque)` con base64url
   - `src/common/logger.ts`: factory Pino con `request-id`
   - `src/common/request-id.ts`: Fastify `onRequest` hook que genera `req_xxxx`
   - `src/common/schemas.ts`: Zod schemas compartidos (`uuidParam`, `paginationQuery`, `isoDatetime`)

7. **Fastify app factory** (`src/app.ts`) — *depends on steps 5, 6*
   - Registrar plugins en orden: config → logger/request-id → prisma → session → rate-limit → module routes
   - Global error handler que convierte errores a RFC 7807
   - `setValidatorCompiler` con Zod

8. **Prisma plugin** (`src/plugins/prisma.ts`) — *depends on step 4*
   - Decorar `fastify.prisma` con PrismaClient
   - `onClose` hook para disconnect

9. **Session plugin stub** (`src/plugins/session.ts`) — *depends on step 1*
   - Registrar `@fastify/cookie`
   - Preparar middleware de session (se implementará completo en Phase 2)

10. **Rate-limit plugin** (`src/plugins/rate-limit.ts`) — *depends on step 1*
    - Registrar `@fastify/rate-limit` con defaults de env

11. **Server entry point** (`src/server.ts`) — *depends on step 7*
    - Import app factory, listen en `PORT`

12. **Health endpoint** (`GET /api/v1/health`) — *depends on step 7*
    - Responde `{ status: "ok" }` — smoke test de que todo conecta

**Relevant files**
- `package.json`, `tsconfig.json`, `vitest.config.ts` — project config
- `docker-compose.yml`, `Dockerfile`, `.env.example` — infra local
- `prisma/schema.prisma` — modelo de datos completo
- `scripts/seed.ts` — seed de meal_categories
- `src/config/index.ts` — config validada
- `src/common/errors.ts` — RFC 7807 builder (reusar en todos los módulos)
- `src/common/pagination.ts` — cursor encode/decode (reusar en entries y symptoms)
- `src/app.ts` — app factory central
- `src/plugins/prisma.ts` — lifecycle de PrismaClient
- `src/server.ts` — entry point

**Verification**
- `docker compose up -d db` arranca PostgreSQL sin errores
- `npm run typecheck` y `npm run build` pasan
- Smoke test del health endpoint devuelve `200 { status: "ok" }`
- Seed verificado: `meal_categories` tiene 4 rows
- `.env.example` tiene todas las variables documentadas

---

## Phase 2: Auth & Ownership

Objetivo: registro, login, logout, introspección de sesión, y hook `requireAuth` que protege todas las rutas futuras.

**Current progress**
- [x] Auth request context base in `request.auth`
- [x] `requireAuth` resolves valid sessions and returns RFC 7807 `401` otherwise
- [x] Password hashing and verification helpers with Argon2id
- [x] Session persistence, auth service, and auth routes implemented
- [x] Unit and integration auth coverage implemented

**Steps**

1. **Auth request context baseline** (`src/modules/auth/auth.hooks.ts`, `src/plugins/session.ts`) — implemented
   - `request.auth = { sessionId, sessionToken, userId, isAuthenticated }`
   - `requireAuth` devuelve `401` RFC 7807 si no hay sesión autenticada

2. **Password helpers** (`src/modules/auth/password.ts`) — implemented
   - `hashPassword(password)` con Argon2id
   - `verifyPassword(hash, password)`
   - `PASSWORD_MIN_LENGTH = 8`

3. **Session plugin completo** (`src/plugins/session.ts`) — implemented
   - Implementar lógica de cookie session: generar token crypto random (32 bytes hex), hashear con SHA-256, almacenar hash en `auth_sessions`
   - Cookie flags: `HttpOnly`, `Secure` (en prod), `SameSite=Lax`, `Path=/`, `Max-Age` de config
   - Funciones: `createSession(userId, req)`, `validateSession(token)`, `revokeSession(token)`

4. **Auth schemas** (`src/modules/auth/auth.schemas.ts`) — implemented
   - Zod: `registerBodySchema` (email, password, timezone?), `loginBodySchema` (email, password)
   - Password policy: mínimo 8 chars (configurable)
   - Email normalización: lowercase + trim

5. **Users repository** (`src/modules/users/users.repository.ts`) — implemented
   - `findByEmail(email)`, `create({ email, passwordHash, timezone })`, `findById(id)`

6. **Auth service** (`src/modules/auth/auth.service.ts`) — implemented
   - `register(body, req)`: validar unicidad email → hash password (Argon2id) → crear user → crear session → devolver user + set cookie
   - `login(body, req)`: buscar user por email → verify Argon2id → crear session → set cookie
   - `logout(token)`: revocar session (set `revoked_at`) → clear cookie
   - `getSession(token)`: validar session (no expirada, no revocada) → devolver user summary

7. **Auth hook resolution** (`src/modules/auth/auth.hooks.ts`) — implemented
   - Completar el baseline para que `requireAuth` use `request.auth`
   - Resolver sesión válida y poblar `request.auth.userId`, `request.auth.sessionId`, `request.auth.isAuthenticated = true`
   - Si inválida → 401 RFC 7807

8. **Auth routes** (`src/modules/auth/auth.routes.ts`) — implemented
   - `POST /api/v1/auth/register` → auth.service.register
   - `POST /api/v1/auth/login` → auth.service.login
   - `POST /api/v1/auth/logout` (session-aware, idempotent) → auth.service.logout
   - `GET /api/v1/auth/session` (protected) → auth.service.getSession
   - Rate-limit reforzado en login: max 5 intentos/minuto por IP

9. **Auth config** (`src/config/session.ts`) — *parallel with step 3*
   - Constantes: session TTL, cookie name
   - La política de password mínima ya vive en `src/modules/auth/password.ts`

10. **Auth unit tests** (`src/modules/auth/auth.test.ts`, `src/modules/auth/auth.service.test.ts`) — implemented
   - Test register con email duplicado → 409
   - Test login con credenciales incorrectas → 401
   - Test password hashing y verificación
   - Test session token hash no almacena plaintext

11. **Auth integration tests** (`tests/integration/auth.integration.test.ts`) — implemented
   - Flujo completo: register → session introspect → logout → session devuelve 401
   - Login → cookie presente → session válida
   - Registro duplicado → 409
   - Login rate-limit → 429

**Relevant files**
- `src/plugins/session.ts` — core session management, cookie handling
- `src/modules/auth/auth.service.ts` — business logic (register, login, logout, getSession)
- `src/modules/auth/auth.hooks.ts` — `requireAuth` hook (usado por todos los módulos protegidos)
- `src/modules/auth/password.ts` — password hashing/verification helpers
- `src/modules/auth/auth.routes.ts` — endpoints según API_CONTRACT.md §4
- `src/modules/auth/auth.schemas.ts` — validación Zod
- `src/modules/users/users.repository.ts` — queries Prisma para users
- `src/config/session.ts` — política de sesión
- `tests/integration/auth.integration.test.ts` — tests E2E de auth
- `tests/integration/helpers/create-auth-test-app.ts` — auth test app con Prisma fake stateful

**Verification**
- `npm run typecheck` y `npm test` pasan
- Integration tests pasan: register → session → logout → session `401`; login → session válida; duplicate register `409`; login rate-limit `429`
- Endpoint protegido sin cookie devuelve `401` RFC 7807
- Session cookie tiene flags `HttpOnly` + `SameSite=Lax`
- Session persistence almacena `session_token_hash` y no el token raw
- `users.password_hash` es string Argon2id (empieza por `$argon2id$`)

---

## Phase 3: Categories & Food Entries CRUD

Objetivo: CRUD completo de food entries con filtros por fecha y categoría, paginación cursor, y endpoint de categorías.

**Current progress**
- [x] Categories service and protected route implemented
- [x] Entries schemas, repository, service, and routes implemented
- [x] Unit and integration coverage for CRUD, pagination, filters, and ownership implemented

**Steps**

1. **Categories service + routes** — implemented
   - `src/modules/categories/categories.service.ts`: `listAll()` → devuelve las 4 categorías ordenadas
   - `src/modules/categories/categories.routes.ts`: `GET /api/v1/categories` (protected)
   - `src/modules/categories/categories.test.ts`

2. **Entries schemas** (`src/modules/entries/entries.schemas.ts`) — implemented
   - `createEntrySchema`: meal_category_code (enum), food_name (string, max 500), quantity_value?, quantity_unit?, notes?, consumed_at (ISO datetime)
   - `updateEntrySchema`: partial del anterior (todos opcionales excepto al menos uno requerido)
   - `listEntriesQuerySchema`: from?, to?, meal_category_code?, limit?, cursor?
   - `entryParamsSchema`: entry_id (UUID)

3. **Entries repository** (`src/modules/entries/entries.repository.ts`) — implemented
   - `create(userId, data)`: inserta food_entry con lookup de meal_category_id por code
   - `findById(id, userId)`: busca por id + userId (ownership)
   - `update(id, userId, data)`: partial update, last-write-wins
   - `remove(id, userId)`: hard delete
   - `list(userId, filters)`: query con filtros opcionales (from, to, meal_category_code) + cursor pagination `(consumed_at DESC, id DESC)`

4. **Entries service** (`src/modules/entries/entries.service.ts`) — implemented
   - Orquesta repository calls
   - Valida que `meal_category_code` existe
   - Mapea `meal_category_id` ↔ `meal_category_code` para API responses
   - Aplica cursor encode/decode de `common/pagination.ts`

5. **Entries routes** (`src/modules/entries/entries.routes.ts`) — implemented
   - `POST /api/v1/entries` → 201
   - `GET /api/v1/entries` → 200 con paginación
   - `GET /api/v1/entries/:entry_id` → 200 / 404
   - `PATCH /api/v1/entries/:entry_id` → 200 / 400 / 404
   - `DELETE /api/v1/entries/:entry_id` → 204 / 404
   - Todos protegidos con `requireAuth`

6. **Entries unit tests** (`src/modules/entries/entries.test.ts`, `src/modules/categories/categories.test.ts`) — implemented
   - Cursor encode/decode round-trip
   - Category code validation
   - Ownership filtering lógica

7. **Entries integration tests** (`tests/integration/entries.integration.test.ts`) — implemented
   - CRUD completo: create → get → update → get (verificar cambio) → delete → get (404)
   - Listado con paginación: crear 25 entries → primer page tiene 20 + has_more=true → second page con cursor tiene 5 + has_more=false
   - Filtro por date range
   - Filtro por meal_category_code
   - Ownership: user A no puede ver/editar/borrar entries de user B (devuelve 404)
   - Validación: meal_category_code inválido → 400
   - Sin auth → 401

**Relevant files**
- `src/modules/categories/categories.routes.ts` — GET /categories
- `src/modules/categories/categories.service.ts` — category listing and response mapping
- `src/modules/entries/entries.routes.ts` — CRUD endpoints según API_CONTRACT.md §6
- `src/modules/entries/entries.service.ts` — lógica de negocio, ownership, mapping category code↔id
- `src/modules/entries/entries.repository.ts` — queries Prisma con cursor pagination
- `src/modules/entries/entries.schemas.ts` — validación Zod
- `src/common/pagination.ts` — reusar cursor encode/decode
- `tests/integration/entries.integration.test.ts` — tests CRUD + pagination + ownership
- `tests/integration/helpers/create-auth-test-app.ts` — harness stateful para auth + categories + entries

**Verification**
- `npm run typecheck` y `npm test` pasan
- Integration tests pasan: categories, CRUD cycle, pagination, filters, ownership isolation, invalid payloads, and unauthenticated access
- Paginación: crear >20 entries, verificar `has_more` + `next_cursor` funciona
- Filtro por fecha y categoría devuelve resultados correctos
- Entry de otro usuario devuelve 404 (no 403)
- Response shapes coinciden con API_CONTRACT.md §5 y §6

---

## Phase 4: Internal Symptoms API

Objetivo: endpoints internos de symptom events (CRUD parcial) para preparar extensibilidad futura.

**Current progress**
- [x] Symptom schemas, repository, service, and internal routes implemented
- [x] Cursor pagination for `(occurred_at, id)` implemented
- [x] Unit and integration coverage for create/list/get, filters, validation, and ownership implemented

**Steps**

1. **Symptoms schemas** (`src/modules/symptoms/symptoms.schemas.ts`) — implemented
   - `createSymptomSchema`: symptom_code (string), severity (int 1-5), occurred_at (ISO datetime), notes?
   - `listSymptomsQuerySchema`: from?, to?, symptom_code?, limit?, cursor?
   - `symptomParamsSchema`: symptom_event_id (UUID)

2. **Symptoms repository** (`src/modules/symptoms/symptoms.repository.ts`) — implemented
   - `create(userId, data)`, `findById(id, userId)`, `list(userId, filters)` — misma estructura que entries repository

3. **Symptoms service** (`src/modules/symptoms/symptoms.service.ts`) — implemented
   - Orquesta repository, aplica cursor pagination

4. **Symptoms routes** (`src/modules/symptoms/symptoms.routes.ts`) — implemented
   - `POST /api/v1/internal/symptoms/events` → 201
   - `GET /api/v1/internal/symptoms/events` → 200 con paginación
   - `GET /api/v1/internal/symptoms/events/:symptom_event_id` → 200 / 404
   - Todos protegidos con `requireAuth`

5. **Symptoms tests** — implemented
   - Unit: `src/modules/symptoms/symptoms.test.ts`
   - Integration: `tests/integration/symptoms.integration.test.ts` (create → list → get; ownership isolation)

**Relevant files**
- `src/modules/symptoms/symptoms.routes.ts` — endpoints según API_CONTRACT.md §7
- `src/modules/symptoms/symptoms.repository.ts` — reusar patrón de entries.repository
- `src/modules/symptoms/symptoms.service.ts` — listing, ownership, and cursor handling
- `src/modules/symptoms/symptoms.schemas.ts` — validation for create/list/get
- `src/modules/symptoms/symptoms.test.ts` — unit coverage for pagination and ownership
- `tests/integration/symptoms.integration.test.ts`
- `tests/integration/helpers/create-auth-test-app.ts` — harness stateful para auth + categories + entries + symptoms

**Verification**
- `npm run typecheck` y `npm test` pasan
- Integration tests pasan: create → list → get symptom events
- Ownership: user A no ve symptoms de user B
- Severity fuera de rango 1-5 → 400
- Paginación funciona igual que entries

---

## Phase 5: Hardening & Release Readiness

Objetivo: seguridad, operaciones, y calidad de producción local.

**Current progress**
- [x] CSRF protection and security headers implemented
- [x] Session cleanup and local backup tooling implemented
- [x] End-to-end critical path test plan and release-readiness checklist documented
- [x] Security checklist documented
- [ ] Security specialist review still pending human review

**Steps**

1. **CSRF protection** — implemented
   - Evaluar `@fastify/csrf-protection` o custom header check (`X-Requested-With`)
   - Aplicar a POST/PATCH/DELETE

2. **Input sanitization review** — completed
   - Verificar que Zod strips unknown fields (`z.object().strict()` o `.strip()`)
   - Verificar que no hay SQL injection paths (Prisma parametriza por defecto)
   - Verificar longitudes máximas: food_name (500), notes (2000), symptom_code (100)

3. **Security headers** — implemented
   - `@fastify/helmet` o manual: `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security` (prep)

4. **Session cleanup** — implemented
   - Script o cron job para purgar sessions expiradas (`WHERE expires_at < NOW() AND revoked_at IS NULL`)
   - Documentar en ops runbook

5. **Local backup script** (`scripts/backup-local.sh`) — implemented
   - `pg_dump` wrapper con timestamp en nombre
   - Documentar en README

6. **Logging review** — completed
   - Verificar que request-id aparece en todos los logs
   - Verificar que no se loguean passwords ni session tokens
   - Verificar que errores 5xx loguean stack trace pero no lo exponen al cliente

7. **End-to-end critical path test plan** — completed
   - Definir en `tests/e2e/` o como integration tests extendidos:
     - Register → login → crear entries → listar → filtrar → actualizar → borrar → logout → verify 401
     - Flujo multi-usuario: A y B no ven datos cruzados

8. **Security checklist document** — completed
   - Crear `docs/SECURITY_CHECKLIST.md`:
     - [ ] Argon2id con parámetros seguros
     - [ ] Session tokens hashed en DB
     - [ ] Cookies HttpOnly + SameSite
     - [ ] Rate limiting en login
     - [ ] Ownership enforcement en todos los endpoints
     - [ ] No PII en logs
     - [ ] CSRF protection activa
     - [ ] Security headers presentes
     - [ ] Zod validation en todos los inputs
     - [ ] Prisma parametriza queries

9. **Ops runbook** — completed
   - Documentar: start/stop, seed, migrations, backup, log access, session cleanup

**Relevant files**
- `src/plugins/security.ts` — CSRF y security headers
- `src/plugins/security.test.ts` — hardening unit tests
- `src/plugins/session.ts` — session cookie management
- `src/app.ts` — 5xx logging review
- `scripts/cleanup-sessions.ts` — cleanup de sesiones expiradas/revocadas
- `scripts/backup-local.sh` — backup local
- `docs/SECURITY_CHECKLIST.md` — checklist de seguridad
- `docs/E2E_TEST_PLAN.md` — critical path release plan
- `docs/RELEASE_READINESS.md` — release checklist
- `README.md` — runbook local de backup/logging/security notes

**Verification**
- `npm run typecheck` y `npm test` pasan
- POST/PATCH/DELETE sin protección CSRF devuelven `403`
- Response headers incluyen security headers esperados
- Backup script local documentado y ejecutable
- Cleanup script borra sesiones expiradas o revocadas
- Los tests de integración cubren auth, entries, symptoms, ownership, rate-limit y hardening

---

## Decisions

- Prisma, Fastify, PostgreSQL, Vitest, Zod están aprobados y no se cuestionan
- Email verification, social login, edit history, correlation engine → fuera de scope
- `entry_symptom_links` no se crea en la migración inicial
- `quantity_unit` es freeform string en MVP
- Symptoms van bajo `/api/v1/internal/symptoms/*` sin feature flag adicional
- Local-only infrastructure; no cloud deployment en MVP

## Dependency Graph (phases)

```
Phase 1 (scaffolding) ─┬──► Phase 2 (auth) ──► Phase 3 (entries + categories) ──► Phase 4 (symptoms)
                       │                                                               │
                       └───────────────────────────────────────────────────────────────► Phase 5 (hardening)
```

Phases 1→2→3→4 son secuenciales (cada una depende de la anterior).
Phase 5 puede empezar parcialmente en paralelo con Phase 4 (steps 1-6 no dependen de symptoms).

## Further Considerations

1. **UUID v7 vs v4**: v7 recomendado para sort-friendliness con cursor pagination, pero requiere `pg_uuidv7` extension o generación en app. Decidir antes de Phase 1 step 4. Recomendación: empezar con v4 (`gen_random_uuid()`), migrar a v7 si pagination performance lo justifica.
2. **Test DB strategy**: usar base de datos de test separada (`saludario_test`) con truncate entre tests, o transacciones rollback. Decidir antes de empezar los integration tests. Recomendación: DB separada + truncate por suite.
3. **ESM vs CJS**: TypeScript con ESM (`"type": "module"` en package.json) es el camino moderno pero puede tener fricciones con algunas deps. Recomendación: ESM con tsx para dev.
