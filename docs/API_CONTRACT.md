# Saludario API Contract (MVP)

Status: Approved baseline for implementation readiness  
Date: March 8, 2026  
Scope: MVP (`/api/v1`) for `auth`, `entries`, `categories`, and internal symptom API surface

## 1. Global Conventions

### 1.1 Base URL and versioning
- Base path: `/api/v1`
- API style: JSON over HTTP

### 1.2 Authentication
- Auth mechanism: server-side session cookie (HTTP-only cookie, set by backend)
- Protected endpoints require a valid authenticated session
- All protected resources are user-scoped by session `user_id`

### 1.3 Content type
- Request body: `Content-Type: application/json`
- Success responses: `Content-Type: application/json`
- Error responses: `Content-Type: application/problem+json`

### 1.4 Date/time and identifiers
- All timestamps use ISO-8601 with timezone offset
- Persistence target in DB uses `timestamptz`
- Resource IDs are UUID strings

### 1.5 Ownership and not-found behavior
- The API never returns cross-user resources
- If a resource exists but belongs to another user, return `404` (not `403`)

### 1.6 Meal category codes (MVP fixed set)
- `breakfast`
- `lunch`
- `dinner`
- `snack`

## 2. Error Contract (RFC 7807)

All non-2xx responses must follow:

```json
{
  "type": "https://api.saludario.local/problems/validation-error",
  "title": "Validation error",
  "status": 400,
  "detail": "One or more fields are invalid.",
  "instance": "/api/v1/entries",
  "code": "VALIDATION_ERROR",
  "request_id": "req_01HTX...",
  "errors": [
    { "field": "consumed_at", "message": "Invalid datetime format", "code": "INVALID_FORMAT" }
  ]
}
```

Notes:
- `code` is a stable machine-readable app code.
- `request_id` is included in every error for traceability.
- `errors` is optional and used for field-level validation failures.

Common app error codes:
- `VALIDATION_ERROR` (`400`)
- `UNAUTHORIZED` (`401`)
- `FORBIDDEN` (`403`) for non-ownership policy violations only
- `NOT_FOUND` (`404`)
- `CONFLICT` (`409`)
- `RATE_LIMITED` (`429`)
- `INTERNAL_ERROR` (`500`)

## 3. Pagination Contract

### 3.1 Entries list pagination

Entries endpoints use cursor pagination:
- Sort order: `(consumed_at DESC, id DESC)`
- Query params:
  - `limit` (optional, default `20`, max `100`)
  - `cursor` (optional opaque string)

Cursor payload semantics (opaque to clients):
- Encodes the last seen pair: `consumed_at` and `id`

Page response shape:

```json
{
  "data": [],
  "page": {
    "limit": 20,
    "has_more": true,
    "next_cursor": "eyJjb25zdW1lZF9hdCI6Ii4uLiIsImlkIjoiLi4uIn0="
  }
}
```

### 3.2 Symptom events list pagination

Symptom endpoints use cursor pagination:
- Sort order: `(occurred_at DESC, id DESC)`
- Query params:
  - `limit` (optional, default `20`, max `100`)
  - `cursor` (optional opaque string)

Cursor payload semantics (opaque to clients):
- Encodes the last seen pair: `occurred_at` and `id`

## 4. Auth Endpoints

### 4.1 Register
- Method/Path: `POST /api/v1/auth/register`
- Auth: Public
- Request:

```json
{
  "email": "user@example.com",
  "password": "strong-password",
  "timezone": "Europe/Madrid"
}
```

- Validation:
  - `email` required, normalized lowercase
  - `password` required, minimum length policy defined by auth policy doc
  - `timezone` optional, defaults to `UTC`
- Responses:
  - `201 Created`: account created, session established (cookie set)
  - `409 Conflict`: email already registered
  - `400 Bad Request`: validation error
- Success body:

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "timezone": "Europe/Madrid",
    "created_at": "2026-03-08T15:00:00Z"
  }
}
```

### 4.2 Login
- Method/Path: `POST /api/v1/auth/login`
- Auth: Public
- Request:

```json
{
  "email": "user@example.com",
  "password": "strong-password"
}
```

- Responses:
  - `200 OK`: session established (cookie set)
  - `401 Unauthorized`: invalid credentials
  - `429 Too Many Requests`: rate-limited
- Success body:

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "timezone": "Europe/Madrid"
  }
}
```

### 4.3 Logout
- Method/Path: `POST /api/v1/auth/logout`
- Auth: Protected
- Request body: empty
- Responses:
  - `204 No Content`: cookie cleared; current session revoked
  - `401 Unauthorized`: no active session

### 4.4 Session Introspection
- Method/Path: `GET /api/v1/auth/session`
- Auth: Protected
- Responses:
  - `200 OK`: current session + user summary
  - `401 Unauthorized`: no active session
- Success body:

```json
{
  "session": {
    "expires_at": "2026-03-15T15:00:00Z"
  },
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "timezone": "Europe/Madrid"
  }
}
```

## 5. Meal Categories Endpoint

### 5.1 List categories
- Method/Path: `GET /api/v1/categories`
- Auth: Protected
- Responses:
  - `200 OK`
- Success body:

```json
{
  "data": [
    { "code": "breakfast", "label": "Breakfast", "sort_order": 1 },
    { "code": "lunch", "label": "Lunch", "sort_order": 2 },
    { "code": "dinner", "label": "Dinner", "sort_order": 3 },
    { "code": "snack", "label": "Snack", "sort_order": 4 }
  ]
}
```

## 6. Food Entries Endpoints

### Entry resource shape

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "meal_category_code": "lunch",
  "food_name": "Grilled chicken",
  "quantity_value": 200,
  "quantity_unit": "g",
  "notes": "Homemade",
  "consumed_at": "2026-03-08T13:15:00Z",
  "created_at": "2026-03-08T13:20:00Z",
  "updated_at": "2026-03-08T13:20:00Z"
}
```

### 6.1 Create entry
- Method/Path: `POST /api/v1/entries`
- Auth: Protected
- Request:

```json
{
  "meal_category_code": "lunch",
  "food_name": "Grilled chicken",
  "quantity_value": 200,
  "quantity_unit": "g",
  "notes": "Homemade",
  "consumed_at": "2026-03-08T13:15:00Z"
}
```

- Responses:
  - `201 Created`
  - `400 Bad Request`

### 6.2 List entries
- Method/Path: `GET /api/v1/entries`
- Auth: Protected
- Query params:
  - `from` (optional ISO datetime, inclusive)
  - `to` (optional ISO datetime, inclusive)
  - `meal_category_code` (optional enum)
  - `limit` (optional integer, default `20`, max `100`)
  - `cursor` (optional opaque cursor)
- Responses:
  - `200 OK`
  - `400 Bad Request`
- Success body:

```json
{
  "data": [],
  "page": {
    "limit": 20,
    "has_more": false,
    "next_cursor": null
  }
}
```

### 6.3 Get entry by id
- Method/Path: `GET /api/v1/entries/{entry_id}`
- Auth: Protected
- Responses:
  - `200 OK`
  - `404 Not Found`

### 6.4 Update entry (last-write-wins)
- Method/Path: `PATCH /api/v1/entries/{entry_id}`
- Auth: Protected
- Behavior:
  - Partial updates allowed
  - No optimistic concurrency token in MVP
  - Last valid write overwrites previous values
- Request (example):

```json
{
  "notes": "Updated notes",
  "consumed_at": "2026-03-08T13:45:00Z"
}
```

- Responses:
  - `200 OK`
  - `400 Bad Request`
  - `404 Not Found`

### 6.5 Delete entry
- Method/Path: `DELETE /api/v1/entries/{entry_id}`
- Auth: Protected
- Responses:
  - `204 No Content`
  - `404 Not Found`

## 7. Internal Symptoms API Surface (MVP boundary)

Purpose:
- Define schema and API boundary for future symptom tracking.
- Not exposed in MVP product UI.
- No correlation or analytics endpoints in MVP.

Namespace:
- `/api/v1/internal/symptoms/*`

### Symptom event shape

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "symptom_code": "bloating",
  "severity": 3,
  "occurred_at": "2026-03-08T18:30:00Z",
  "notes": "Started after dinner",
  "created_at": "2026-03-08T18:35:00Z",
  "updated_at": "2026-03-08T18:35:00Z"
}
```

### 7.1 Create symptom event
- Method/Path: `POST /api/v1/internal/symptoms/events`
- Auth: Protected (same user session model)
- Request:

```json
{
  "symptom_code": "bloating",
  "severity": 3,
  "occurred_at": "2026-03-08T18:30:00Z",
  "notes": "Started after dinner"
}
```

- Responses:
  - `201 Created`
  - `400 Bad Request`

### 7.2 List symptom events
- Method/Path: `GET /api/v1/internal/symptoms/events`
- Auth: Protected
- Query params:
  - `from` (optional ISO datetime, inclusive)
  - `to` (optional ISO datetime, inclusive)
  - `symptom_code` (optional string)
  - `limit` (optional integer, default `20`, max `100`)
  - `cursor` (optional opaque cursor encoding `occurred_at` and `id`)
- Sort order:
  - `(occurred_at DESC, id DESC)`
- Responses:
  - `200 OK`
  - `400 Bad Request`

### 7.3 Get symptom event by id
- Method/Path: `GET /api/v1/internal/symptoms/events/{symptom_event_id}`
- Auth: Protected
- Responses:
  - `200 OK`
  - `404 Not Found`

## 8. Endpoint Definition of Done (Contract-level)

An endpoint contract is considered done when it explicitly defines:
- Method and path
- Authentication requirements
- Ownership rules
- Request schema (body/path/query)
- Success status code and response shape
- Error codes using RFC 7807 format
- Validation boundaries
- For list endpoints: sorting and pagination semantics
