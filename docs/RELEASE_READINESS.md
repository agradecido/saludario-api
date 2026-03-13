# Release Readiness Checklist

Status: completed engineering checklist for local MVP release readiness

## Application

- [x] Health endpoint available
- [x] Auth flows implemented and tested
- [x] Food entries CRUD implemented and tested
- [x] Internal symptoms API implemented and tested
- [x] RFC 7807 error responses implemented across the app

## Security

- [x] Password hashing uses Argon2id
- [x] Session tokens are hashed in persistence
- [x] Login rate limiting enabled
- [x] CSRF header check enabled for state-changing requests
- [x] Security headers enabled
- [ ] Security specialist review completed

## Quality

- [x] `npm run typecheck` passes
- [x] `npm test` passes
- [x] Pre-commit hook runs `npm run check`
- [x] End-to-end critical path test plan documented

## Operations

- [x] Local migration flow documented
- [x] Seed flow documented
- [x] Session cleanup command implemented
- [x] Local backup command implemented
- [x] Request-id based logging in place

## Remaining non-code gate

- Human security review before any hosted deployment or public release
