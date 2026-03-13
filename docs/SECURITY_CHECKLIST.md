# Security Checklist

Status: implemented baseline for local MVP hardening

## Implemented controls

- [x] Passwords hashed with Argon2id in [src/modules/auth/password.ts](../src/modules/auth/password.ts)
- [x] Session tokens are random 32-byte values and only their SHA-256 hash is stored in the database
- [x] Session cookies use `HttpOnly`, `SameSite=Lax`, `Path=/`, and `Secure` in production
- [x] Login route rate-limited to 5 attempts per minute per IP
- [x] Protected routes enforce ownership by querying with `userId` and return `404` on cross-user access
- [x] State-changing requests require `X-Requested-With: XMLHttpRequest`
- [x] Security headers enabled: `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`
- [x] RFC 7807 problem responses used for auth, validation, rate limiting, and authorization failures
- [x] Request tracing uses `x-request-id`, with incoming ids sanitized before reuse
- [x] 5xx responses are logged server-side without exposing stack traces to clients

## Operational controls

- [x] Expired and revoked session cleanup script: `npm run db:cleanup-sessions`
- [x] Local database backup script: `npm run db:backup-local`
- [x] Pre-commit validation runs `npm run check`

## Review items

- [ ] Security specialist review completed
- [ ] CSRF strategy re-reviewed before any browser frontend from another origin is introduced
- [ ] Deployment environment verified to run with `NODE_ENV=production` behind TLS termination
- [ ] Production TLS, secret rotation, and hosted backup policy reviewed during deployment phase
