# Implementation status

Last reviewed: 2026-10-10.

Scope authority: `C:/pacificaurora/Pacific Aurora — Project Specification.md`.
Implementation order: `plans/pacific-aurora-blueprint.md`.

## Completed and verified

- The initial Supabase schema is present in the live project: 15 tables with RLS.
- The live two-user authorization suite passes all 6 test groups. It checks the
  15-table ownership model and all 51 dynamic route handlers for hidden-resource
  `404` behavior, and cleans up its temporary users and records.
- Step 13 account deletion is implemented. `DELETE /api/auth/account` requires
  the exact `DELETE` confirmation phrase, derives the caller from the bearer
  token, and uses server-only credentials to remove that Auth user. The existing
  cascade then removes all owned application data. The live temporary-account
  test verifies rejected confirmation, caller deletion, and profile/world cleanup.
- Production dependency audit is clean: `npm audit --omit=dev` reports zero
  vulnerabilities.
- Successful API responses are validated at runtime against the generated Zod
  schemas. Unknown operations and malformed responses fail closed.
- Character, place, item, custom entity, and custom entity type responses expose
  `updatedAt`. Home section ordering now uses authoritative database timestamps;
  browser-local recency state has been removed.
- Atomic RPC boundaries are implemented for chapter moves and multi-table entity
  create/update operations. Custom-entity attribute values have database-side
  validation for required fields, unknown attributes, data types, and options.
- Migration `0002_atomic_writes.sql` is applied to the live project. Its live
  suite passes all 4 tests: create rollback, update rollback, custom-attribute
  rejection/acceptance, and concurrent chapter-order integrity.
- Production response headers include CSP, HSTS, clickjacking, MIME-sniffing,
  referrer, and permissions protections.
- The landing page, book workspace, and world workspace pass serious/critical
  WCAG checks. Reduced-motion behavior and mobile/tablet/desktop overflow are
  covered by browser tests.
- Verification is green: lint and typecheck are clean; 37 local tests pass with
  the 11 opt-in live tests skipped by default; all 14 Playwright tests pass; and
  the optimized Next.js production build succeeds.

## Release steps remaining

1. Commit and deploy the exact verified revision.
2. Run the post-deploy smoke path on the production origin, including account
   deletion with a disposable test account.
3. Tag the deployed revision so the released state is reproducible.

## Explicitly excluded by direction

- Production authentication/provider/environment configuration is left as-is.
- Previously accepted visual/spec deviations are left as-is. Accessibility fixes
  needed for the deployment gate are included, but no redesign was performed.
