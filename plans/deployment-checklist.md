# Deployment checklist

Last reviewed: 2026-10-17.

## V2 release gate — branch only, not deployed

- [x] V2 steps 1–7 implemented on `codex/pacific-aurora-v2`; `README.md`,
      `package.json`, and lockfile aligned to 2.0.0 on this branch.
- [x] Contract regenerated with no drift; lint, typecheck, 73 default tests,
      and optimized build pass.
- [x] Full Playwright suite: 24/24 passed, including light/dark accessibility,
      reduced motion, mobile, legal consent, and AI panel flows.
- [x] Local Ollama smoke through the production adapter: 4,867 prompt bytes,
      8.7–13.5 seconds warm, three usable cards in a sampled run. Local timeout
      is 60 seconds; a cold model took about 67 seconds to load, so pre-warm it.
- [x] Isolated preview: five AI state/apply tests, six two-user authorization
      groups covering 54 dynamic routes, and one route-to-Ollama-to-apply test
      passed. Disposable users were removed. No V2 migration touched V1.
- [x] Privacy and Terms disclose automatic excerpt/world-context transmission
      and explicit Accept-only writes; wording approved by the owner.
- [x] `npm audit --omit=dev`: zero production advisories. Full audit reports
      five high-severity findings only in the ESLint development dependency
      chain (`braces` → `micromatch` → `fast-glob` → Next ESLint). The upstream
      `braces` advisory has no patched version; do not downgrade Next/ESLint
      merely to hide it. Recheck before merge.
- [x] Public Auth settings: Confirm Email enabled on preview and deployed
      projects; deployed Google enabled. Preview Google is disabled, so Google
      linking itself has not been exercised there.
- [ ] Production AI provider (Groq) smoke test and deployment configuration.
      Only local Ollama was authorized/tested this pass.
- [ ] Explicit owner approval to merge/deploy the V2 branch.

### Production migration order and rollback

1. Back up the deployed V1 database and confirm 0001 and 0002 are applied.
2. Apply `0003_ai_analysis_state.sql`, `0004_auth_resend_limits.sql`,
   `0005_ai_apply_once.sql`, `0006_ai_new_chapter_checkpoint.sql`, then
   `0007_ai_sliding_review.sql` to the deployed project. Verify
   functions, RLS, and policies/grants before routing V2 traffic.
3. Configure server-only `AI_BASE_URL`, `AI_MODEL`, and `AI_API_KEY`, rebuild so
   `NEXT_PUBLIC_*` values are inlined, then deploy the exact verified V2 revision.
4. With a disposable production account, smoke sign-in, onboarding, writing,
   AI eligibility/analysis/apply, world edits, chapter reorder, and deletion.
5. If rollout fails before any V2 use, keep serving V1.3 and leave additive V2
   tables/functions unused. After V2 traffic, do not reverse migrations or
   discard checkpoints/receipts; use a forward repair migration and preserve data.

### Preview database note

Migrations 0003–0007 are already applied only to `pa-newbranchtest`. Guarded
tests require `PA_AI_PREVIEW_CONFIRM=ISOLATED_V2_PREVIEW` and the preview-only
credentials in `.env.local`; the end-to-end suite also requires
`PA_AI_DEPLOYED_URL` and rejects matching preview/deployed origins. Never deploy
those test credentials. The V2 tables
have RLS enabled and no direct client policies by design; Supabase's advisory
reports this as informational. Existing V1 trigger functions also have mutable
search-path advisories; review separately before rollout.

---

## V1.3 historical deployment record

Scope authority: `C:/pacificaurora/Pacific Aurora — Project Specification.md`.
Implementation order: `plans/pacific-aurora-blueprint.md`.
Progress record: `plans/implementation-status.md`.

## Green gates

- [x] `npm audit --omit=dev` — 0 vulnerabilities.
- [x] `npm run lint` — clean.
- [x] `npm run typecheck` — clean.
- [x] `npm run test` — 37 passed; 11 opt-in live tests skipped.
- [x] `npm run test:e2e` — 14 passed.
- [x] `npm run build` — optimized production build succeeds.
- [x] Generated API types and runtime response schemas are in sync.
- [x] Live two-user RLS/route authorization suite — 6 passed.
- [x] Security headers, reduced motion, WCAG serious/critical findings, and
      mobile/tablet/desktop viewport fit are covered by Playwright.
- [x] Section recency comes from database `updated_at` values.

## Database gate

- [x] Apply `supabase/migrations/0002_atomic_writes.sql` to live Supabase.
- [x] Verify the three RPCs exist and are executable by `authenticated`:
      `move_chapter_atomic`, `create_world_entity_atomic`, and
      `update_world_entity_atomic`.
- [x] Run live contention/rollback/custom-attribute validation tests — 4 passed.
- [x] Re-run the live two-user authorization suite with the validation trigger
      active — 6 passed.
- [x] Live account-deletion cascade test — 1 passed.

## Release and rollout

- [ ] Deploy the exact verified Git revision.
- [ ] Smoke-test sign-in, onboarding, world/book creation, chapter movement,
      entity create/edit/delete, relationships, timelines, and account deletion
      with a disposable account on the production origin.
- [ ] Confirm no browser-console or server errors.
- [ ] Tag the deployed revision.

## Excluded from this pass

- Production authentication/provider/environment configuration.
- Previously accepted visual/spec deviations.
