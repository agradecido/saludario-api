# End-to-End Critical Path Test Plan

Status: completed plan for MVP release readiness

## Automated integration coverage

1. Auth lifecycle
   - Register
   - Session introspection
   - Logout
   - Rejected session after logout

2. Auth abuse resistance
   - Duplicate registration returns `409`
   - Invalid login returns `401`
   - Login rate limit returns `429`
   - Missing CSRF header returns `403`

3. Food entries lifecycle
   - Create entry
   - List entries
   - Get entry
   - Update entry
   - Delete entry
   - Missing entry after delete returns `404`

4. Food entries query behavior
   - Cursor pagination across more than 20 rows
   - Filter by date range
   - Filter by meal category
   - Anonymous access returns `401`

5. Ownership isolation
   - User B cannot read, update, or delete User A entries
   - User B cannot read User A symptom events

6. Symptoms lifecycle
   - Create symptom event
   - List symptom events
   - Get symptom event
   - Cursor pagination for symptom events
   - Filter by date range
   - Filter by symptom code
   - Invalid severity returns `400`

## Manual smoke plan before release

1. Start local stack with Docker and run migrations
2. Run `npm run check`
3. Register a new user through the API client
4. Verify the `Set-Cookie` header and `x-request-id`
5. Create, list, update, and delete one food entry
6. Create and list one symptom event
7. Run `npm run db:cleanup-sessions`
8. Run `npm run db:backup-local`
9. Restore backup manually in a disposable local database before any production-like release work

## Exit criteria

- All automated tests pass
- Manual smoke flow completes without contract drift
- Backup and cleanup commands run successfully in the target environment
