# Saludario — Initial Schema & Migration Plan

Status: Pending approval  
Date: March 13, 2026  
ORM: Prisma (approved March 8, 2026)  
DB: PostgreSQL 16+

## 1. Migration Strategy

### Approach
- Use **Prisma Migrate** for all schema changes.
- Migrations are committed to the repo under `prisma/migrations/`.
- Each migration is a single, focused change with a descriptive name.
- Local development uses `prisma migrate dev`; future CI/production will use `prisma migrate deploy`.

### Initial migration plan (ordered)

| # | Migration name | Tables | Notes |
|---|---------------|--------|-------|
| 1 | `init_foundation` | `users`, `meal_categories`, `auth_sessions`, `food_entries`, `symptom_events` | Preferred MVP baseline migration for a fresh schema |

Optional during active design:
- Split future deltas into focused migrations (for example: `add_auth_indexes`, `add_symptom_fields`) when changes are introduced after initial baseline approval.

## 2. Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── USERS ───────────────────────────────────────────────

model User {
  id           String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  email        String    @unique @db.VarChar(320)
  passwordHash String    @map("password_hash") @db.VarChar(255)
  timezone     String    @default("UTC") @db.VarChar(100)
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt    DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  deletedAt    DateTime? @map("deleted_at") @db.Timestamptz

  sessions      AuthSession[]
  foodEntries   FoodEntry[]
  symptomEvents SymptomEvent[]

  @@map("users")
}

// ─── MEAL CATEGORIES ────────────────────────────────────

model MealCategory {
  id        Int    @id @default(autoincrement())
  code      String @unique @db.VarChar(32)          // breakfast | lunch | dinner | snack
  label     String @db.VarChar(50)
  sortOrder Int    @default(0) @map("sort_order")

  foodEntries FoodEntry[]

  @@map("meal_categories")
}

// ─── AUTH SESSIONS ──────────────────────────────────────

model AuthSession {
  id               String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId           String    @map("user_id") @db.Uuid
  sessionTokenHash String    @map("session_token_hash") @db.VarChar(64)
  expiresAt        DateTime  @map("expires_at") @db.Timestamptz
  createdAt        DateTime  @default(now()) @map("created_at") @db.Timestamptz
  revokedAt        DateTime? @map("revoked_at") @db.Timestamptz
  ipHash           String?   @map("ip_hash") @db.VarChar(64)
  userAgent        String?   @map("user_agent") @db.VarChar(1024)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@map("auth_sessions")
}

// ─── FOOD ENTRIES ───────────────────────────────────────

model FoodEntry {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId         String   @map("user_id") @db.Uuid
  mealCategoryId Int      @map("meal_category_id")
  foodName       String   @map("food_name") @db.VarChar(500)
  quantityValue  Decimal? @map("quantity_value") @db.Decimal(10, 2)
  quantityUnit   String?  @map("quantity_unit") @db.VarChar(50)
  notes          String?  @db.VarChar(2000)
  consumedAt     DateTime @map("consumed_at") @db.Timestamptz
  createdAt      DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt      DateTime @updatedAt @map("updated_at") @db.Timestamptz

  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  mealCategory MealCategory @relation(fields: [mealCategoryId], references: [id])

  @@index([userId, consumedAt(sort: Desc), id(sort: Desc)], map: "idx_entries_user_consumed_id")
  @@index([userId, mealCategoryId, consumedAt(sort: Desc), id(sort: Desc)], map: "idx_entries_user_cat_consumed_id")
  @@map("food_entries")
}

// ─── SYMPTOM EVENTS (future-ready) ─────────────────────

model SymptomEvent {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId      String   @map("user_id") @db.Uuid
  symptomCode String   @map("symptom_code") @db.VarChar(100)
  severity    Int      @default(1)                    // 1-5 scale
  occurredAt  DateTime @map("occurred_at") @db.Timestamptz
  notes       String?  @db.VarChar(2000)
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime @updatedAt @map("updated_at") @db.Timestamptz

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, occurredAt(sort: Desc), id(sort: Desc)], map: "idx_symptoms_user_occurred_id")
  @@map("symptom_events")
}
```

## 3. Seed Data

`meal_categories` is seeded on first migration. The seed script (`scripts/seed.ts`) will insert:

| id | code | label | sort_order |
|----|------|-------|------------|
| 1 | `breakfast` | Breakfast | 1 |
| 2 | `lunch` | Lunch | 2 |
| 3 | `dinner` | Dinner | 3 |
| 4 | `snack` | Snack | 4 |

Seed is idempotent (upsert by `code`).

## 4. Design Decisions & Rationale

### IDs
- `users`, `auth_sessions`, `food_entries`, `symptom_events`: UUID (generated by PostgreSQL `gen_random_uuid()`).
- `meal_categories`: autoincrement integer (small fixed set, simpler FK joins).
- **Open question**: Switch UUIDs to UUID v7 for time-sortability? Requires a custom PG extension (`pg_uuidv7`) or application-side generation. Recommended but not blocking.

### Soft delete
- Only `users.deleted_at` supports soft delete (account deactivation without data loss).
- `food_entries` and `symptom_events` use hard delete in MVP. Soft delete can be added later if audit requirements emerge.

### Timestamps
- All timestamps are `timestamptz` to avoid timezone ambiguity.
- `updated_at` uses Prisma's `@updatedAt` (application-level, not DB trigger). Acceptable for MVP since there's a single writer (the API).

### Password storage
- `password_hash` stores the full Argon2id output string (includes salt, params, and hash).
- Typical length: ~97 chars. `@db.VarChar(255)` keeps headroom while adding a DB-level guardrail.

### Session token
- `session_token_hash` stores a SHA-256 hash of the session token (not the raw token).
- Raw token is only in the cookie; DB never stores plaintext session tokens.
- Lookup: API hashes the incoming cookie token and queries by hash.
- `user_agent` is capped at 1024 chars in both application code and the DB schema.

### String limits
- API validation already caps user-controlled text fields.
- DB-level `@db.VarChar(...)` limits now mirror those caps for defense in depth:
  - `food_name`: 500
  - `notes`: 2000
  - `quantity_unit`: 50
  - `symptom_code`: 100
  - `user_agent`: 1024
  - `session_token_hash` / `ip_hash`: 64

### Quantity
- `quantity_value` is `Decimal(10,2)` to avoid float precision issues.
- `quantity_unit` is freeform string in MVP (no enum constraint). Users might enter "g", "ml", "cups", "pieces", etc.
- Future: Consider a controlled vocabulary or enum for units if UX benefits warrant it.

### Indexes
- **`idx_entries_user_consumed_id`**: Supports primary list query and deterministic cursor pagination on `(consumed_at DESC, id DESC)`.
- **`idx_entries_user_cat_consumed_id`**: Supports filtered list queries by meal category with same cursor semantics.
- **`idx_symptoms_user_occurred_id`**: Supports symptom list pagination on `(occurred_at DESC, id DESC)`.
- **`auth_sessions(userId)`**: Supports session lookup by user for cleanup/revocation.
- **`auth_sessions(expiresAt)`**: Supports periodic expired session cleanup job.

### Future extensibility
- `entry_symptom_links` table (described in Technical Proposal) is **not** created in the initial migration. It will be added when correlation features are designed, to avoid premature schema commitments.
- `symptom_events` is created now to match the internal API surface defined in the API contract.

## 5. Migration Execution Plan (Local Dev)

```bash
# 1. Start local PostgreSQL
docker compose up -d db

# 2. Generate initial migration
npx prisma migrate dev --name init_foundation

# 3. Seed meal categories
npx prisma db seed

# 4. Verify
npx prisma studio
```

## 6. Checklist Before Approval

- [ ] Confirm UUID version preference (v4 default vs v7 with extension)
- [ ] Confirm `quantity_unit` stays freeform (no enum) in MVP
- [ ] Confirm single Prisma schema file (vs multi-file if Prisma adds support)
- [ ] Confirm `entry_symptom_links` is deferred (not in initial migration)
- [ ] Review index choices for expected query patterns
