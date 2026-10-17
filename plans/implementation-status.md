# Implementation status

Last reviewed: 2026-10-17.

V1 scope authority: `C:/pacificaurora/Pacific Aurora — Project Specification.md`.
V2 scope authority: `plans/Pacific Aurora — Project Specification - V2.pdf`.
V2 implementation order: `plans/pacific-aurora-v2-blueprint.md`.

## Current V2 branch status

- Patch 2.1.4 retires preview-only AI test credentials. Guarded AI state,
  apply, and provider end-to-end suites use the app's main-project URL and
  matching keys only when explicitly enabled with a separate live confirmation.
  `.env.example` was removed from branch history after real credentials appeared
  in its local working copy; those keys should be rotated. The guarded
  route-to-Groq-to-apply suite passed against the live database with a
  disposable account. Lint, typecheck, 84 default tests, production build,
  and 29 Chromium browser tests pass.
- By owner direction, migrations 0003-0007 were applied in order to the live
  `Pacific Aurora` database on 2026-10-17 without a verified backup. Migration
  records, five RLS-protected tables, five triggers, RPCs and grants were
  verified; existing profile/chapter/entity counts stayed 5/7/8. V1.3.1 code
  remains deployed. Arrange a backup and do not reapply the migrations.
- Patch 2.1.3 brings the V1 dark logo and a light-theme variant to the V2
  landing header. Book import/export and additional relationship graph handles
  are approved as post-launch patches. Lint, typecheck, 83 default tests,
  focused Chromium theme coverage, and isolated build pass. Production Groq
  and application rollout checks remain open.
- Patch 2.1.2 adds password visibility controls to sign-in and sign-up only.
  Lint, typecheck, 83 default tests, focused Chromium 2/2, and isolated build
  pass. No auth API, preview database, or deployed V1 change.
- Patch 2.1.1 configures local Groq (`openai/gpt-oss-120b`) through the
  existing server-only adapter/key. A live JSON-mode request succeeded.
  Invalid create/update excerpts are filtered; Groq output quality remains
  stochastic. Lint, typecheck, 83 default tests, and isolated build pass.
  No deployed V1 configuration or database was changed.
- Version 2.1.0 changes AI review to the latest 500 words every five minutes
  while Writer remains open, with fresh World Management comparison and
  chapter-scoped declines persisted across sign-ins/devices. Migration 0007
  is applied only to the isolated `pa-newbranchtest` preview project; deployed
  V1 remains unchanged. Lint, typecheck, 82 default tests, and isolated build
  pass. Full Chromium was 26/27; the unrelated sign-in consent case passed on
  isolated rerun.
- Patch 2.0.5 replaces the AI prompt with owner-supplied extraction rules,
  real schema fields, and a sword-as-item example. `AI_BASE_URL` now accepts a
  configured loopback Ollama port rather than only port 11434. A local model
  probe classified a named sword as an item, not a character. The service now
  filters same-kind duplicate-name creates. Lint, typecheck, 78 default tests,
  and an isolated production build pass;
  no preview dispatch or database state was changed.
- Patch 2.0.4 accepts up to eight validated AI cards from an overlong model
  response and raises the local Ollama deadline to 120 seconds. The saved
  500-word chapter reproduced a 60-second timeout and a nine-card response
  rejected as 502. A read-only replay with the patch returned one usable card
  in 65 seconds. Lint, typecheck, 75 default tests, and an isolated production
  build pass. No preview dispatch or database state was changed by this fix.
- Patch 2.0.3 explicitly defaults landing-page body and headings to Times New Roman.
  A computed-font browser regression and production-build check passed, as did lint,
  typecheck, 74 default tests, and build. No deployed V1 change.
- Patch 2.0.2 fixes initial Writer word count and initializes new AI checkpoints at
  milestone zero via migration 0006. The isolated preview migration and affected
  550-word chapter repair are verified; deployed V1.3 is unchanged. Local lint,
  typecheck, 74 default tests, build, four guarded preview AI-state tests, and all
  26 Chromium cases and a route-to-local-Ollama-to-apply smoke passed, although
  the browser runner did not exit cleanly. No disposable AI users remain.
- Version 2.0.0 is implemented on `codex/pacific-aurora-v2`, not merged or
  deployed. Deployed V1.3 and its database remain unchanged.
- V2 steps 1–8 are implemented. Local lint, typecheck, 73 default tests, the
  production build, and 24 browser tests pass; contract generation has no drift.
- On the isolated V2 preview database, five AI state/apply tests, six two-user
  authorization groups covering 54 dynamic routes, and one route-to-Ollama-to-
  apply test pass. Temporary accounts were removed.
- Local Ollama smoke passes with a 4,867-byte prompt and 8.7–13.5-second warm
  latency. The local 120-second timeout can still expire on a very slow model.
- Production dependencies have zero npm advisories. The full development tree
  has five high-severity advisories in the ESLint dependency chain with no
  patched `braces` release; recheck before merge.
- Privacy and Terms disclose provider transmission and Accept-only writes;
  the owner approved the wording. Production Groq was not tested because the
  owner chose local Ollama for this pass.
- Production rollout still requires explicit approval, V2 migrations 0003,
  0004, 0005, 0006, then 0007 on the deployed project, production provider configuration,
  and a disposable-account post-deploy smoke. See `deployment-checklist.md`.

## V1.3 historical verification

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

## V2 release steps remaining

1. Obtain explicit owner approval to merge and deploy the verified V2 revision.
2. Arrange a restorable backup; 0003 through 0007 are already applied to the
   live database and must not be reapplied.
3. Configure the production AI provider and run its smoke path.
4. Deploy and smoke auth, Writer, AI apply, world data, and deletion with a
   disposable account; then tag the deployed revision.

## V1.3 historical exclusions

- Production authentication/provider/environment configuration is left as-is.
- Previously accepted visual/spec deviations are left as-is. Accessibility fixes
  needed for the deployment gate are included, but no redesign was performed.
