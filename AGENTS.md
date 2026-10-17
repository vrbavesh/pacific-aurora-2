# AGENTS.md

Agent-facing context for Pacific Aurora. This file exists so an agent can start work
without a full codebase onboarding. It has three parts:

1. **Current state** — what is built, what is verified live, what is open, and where the
   documents live. Read this first.
2. **Project instructions** — the complete contents of `CLAUDE.md`, reproduced below.
3. **Recent work log** — what changed recently, so you can tell intentional state from
   half-finished work.

---

## 1. Current state

**Deployed product: V1.3, complete and live against Supabase.** V2 is being built only on
`codex/pacific-aurora-v2`; it has not been merged or deployed. The V2 PDF in `plans/` is the
authority for V2 scope, and `plans/pacific-aurora-v2-blueprint.md` sets its eight-step order.
Steps 1-8 are implemented on the V2 branch. Patch work has advanced the branch files to
version 2.1.0. Patch 2.0.3 explicitly defaults the landing page to Times New Roman.
Writer and AI regressions pass, along with lint,
typecheck, 82 default tests, and the production build. The 27-case browser run
passed 26; an unrelated sign-in consent case passed on isolated rerun.
Explicit merge/deploy approval is pending. Migrations 0003-0007 are
applied only to the isolated preview project.
Do not apply V2 migrations to the live
database or change the deployed V1 project during branch work. Before a V2
production rollout, apply the V2 migration to the deployed project in order.

### Verified against the live project

- All 15 tables present with real records; both migrations applied
- Email/password sign-up, sign-in, OTP recovery, onboarding, and normal CRUD verified live
- Google sign-in **enabled** (`/auth/v1/settings` reports `"google": true`) and needs no
  code change; only the Client ID env var on the host
- Service-role key configured, server-side only, `.env.local` gitignored, no env tracked
- Gates: `typecheck` clean, `lint` 0 errors (6 pre-existing warnings), `test` 37 passed /
  11 skipped (the skipped ones are the `RUN_LIVE_*` suites), `build` passing with
  `/home`, `/books/[bookId]`, `/worlds/[worldId]` and all 38 route groups

### V2 branch progress (local and isolated preview only)

- Version 2.1.0 replaces one-shot 500-word milestones with a latest-500-word
  review after a pause and every five minutes while Writer remains open. Each
  analysis reads current World Management data, filters existing/duplicate
  facts, and excludes chapter-scoped declines persisted across devices.
  Migration 0007 is applied only to `pa-newbranchtest`, not deployed V1.
- Step 1: additive OpenAPI operations for AI eligibility, analysis, and explicit apply;
  generated Orval types/schemas, success-response validation, contract fixtures, and
  provider-neutral API notes. No V2 route handler or database migration exists yet.
- Step 2: bounded Writer toolbar for font family/size, headings, underline, strike,
  numbered lists, alignment, text color, highlight, and HTTP(S) links, with existing
  Bold/Italic/Bullet List/Undo/Save intact. Uses pinned TipTap 3.31.4 text-style and
  text-align extensions. Existing TipTap JSON and draft recovery remain supported.
- Step 3: a bottom-left Settings dialog selects Light or Dark per browser. The choice
  applies before first paint and follows the user across routes. Semantic light colors
  cover landing, auth, legal, home, Writer, world, and relationships surfaces; Writer
  marks and the aurora also respond to the theme. No settings API or database change.
- Step 4: `0003_ai_analysis_state.sql` adds per-user dispatch, per-chapter
  checkpoint, and ID-only apply-receipt state with RLS and no direct client table access.
  Reservation RPCs derive owner and database time and serialize dispatches; only the
  server's service-role client can finalize a valid response. Failed dispatches keep
  the five-minute cooldown. Supabase/in-memory repositories and a
  preview-only integration suite are present. All three preview integration tests passed
  against a separate V2 Supabase project on 2026-10-15. The migration has **not** been
  applied to the deployed V1 project.
- Step 5: authenticated eligibility and analysis routes, complete paged RLS
  world/book context (128 KiB cap), a config-only Ollama/Groq chat-completions
  adapter, and strict model-output filtering are implemented. Invalid input or
  oversized context consumes no dispatch; attempted provider calls do, while
  only a usable response advances the checkpoint. No AI writes to world data.
  Local tests, lint, typecheck, and isolated production build pass. No provider
  smoke or preview-project end-to-end analysis was run yet.
- Step 6: explicit apply route validates one typed card,
  re-reads canonical context, and dispatches to receipt-backed atomic RPCs.
  Migration `0005_ai_apply_once.sql` supplies entity/chapter-point writes and
  makes subtype-only edits advance entity versions. The existing `0003` RPC
  handles atomic character timeline points. Same-ID/chapter/kind replays return the original
  resource ID. Migration 0005 was applied to the isolated V2 preview project
  on 2026-10-15. The guarded apply and AI state suites passed there (5 tests),
  and temporary users were cleaned up.
- Step 7: Writer pause observer and lower-right suggestion panel are implemented.
  Cards stay in book-session memory until their chapter closes, and explicit
  Accept/Decline controls all AI writes. A rolling 500-word window,
  eligibility reconciliation, and cooldown states are covered by browser tests.
  The browser sends only the text window and count; canonical world context
  is read on the server. Local lint, typecheck, 73 tests, and build pass.
  Provider smoke and preview end-to-end analysis were carried into Step 8.
- Step 8: contract generation has no drift; lint, typecheck, 73 default tests,
  build, and 24 Chromium browser tests pass. Isolated preview AI state/apply
  tests (5), route-to-Ollama-to-apply (1), and two-user authorization (6 groups,
  54 dynamic routes) pass with zero temporary users left. Local Ollama returned
  three usable cards from a 4,867-byte prompt in a sampled 13.5-second warm
  run. Privacy/Terms were updated with owner approval; README/package/lockfile
  are 2.0.0. No V2 production deployment or migration has occurred.
- Patch 2.0.1 adds a compact Light/Dark toggle to the landing page by reusing
  `ThemeSettings`. It shares the existing `pacific_aurora_theme` preference, has an
  accessible dynamic label, remains visible on mobile, and is covered by the existing
  persistence/browser test. Focused browser coverage, lint, and typecheck passed.
- Patch 2.0.2 fixes Writer initialization and AI's first 500-word milestone. The footer
  and suggestions share a snapshot seeded from initial TipTap content. Focused Chromium
  tests pass for initial 3-word content, clipboard paste to 9 words, and loaded 550-word
  content dispatching analysis. Migration `0006_ai_new_chapter_checkpoint.sql` initializes
  new chapters at milestone zero while preserving older uncheckpointed manuscripts'
  saved baseline. It was applied only to isolated preview; the affected 550-word chapter
  was repaired to milestone zero. A rollback-only database probe confirmed the trigger.
  The guarded preview AI state suite passed 4/4 with network access. A fresh
  route-to-local-Ollama-to-apply smoke passed, and no disposable AI users remain.
- Patch 2.0.3 gives the landing page an explicit Times New Roman default for body text
  and headings. A computed-font browser regression passed after reproducing the local
  system-sans fallback; the optimized production build computes the same font. Lint,
  typecheck, 74 default tests, and build pass. The deployed V1 site was not changed.
- Patch 2.0.4 caps validated AI suggestions at eight and gives local Ollama up to
  120 seconds. A read-only replay of the affected 500-word chapter returned nine
  model cards in 65 seconds and produced one usable card with the patch. Lint,
  typecheck, 75 default tests, and an isolated production build pass. The
  deployed V1 site and preview dispatch state were not changed.
- Patch 2.0.5 replaces the generic AI prompt with fact-extraction priorities,
  entity-type guidance, real schema fields, duplicate checks, and a sword-as-item
  example. The Ollama endpoint continues to come from `AI_BASE_URL`, now allowing
  the configured loopback port while rejecting arbitrary hosts. A local model
  probe classified Dawnbringer as an item, not a character. The suggestion/apply
  boundary also rejects same-kind duplicate names when the model ignores the
  prompt. No preview or V1 data was changed.
- Supabase confirmation-mail investigation made no database, dashboard, or code changes.
  The local `.env.local` targets the isolated V2 preview project, not deployed V1. Delivery
  remains an environment/provider issue to verify in that preview project's Auth logs and
  SMTP/provider settings; no conclusive provider-side cause was established in this pass.
- Local Step 4 gates: 51 Vitest tests passed; 14 live/preview tests skipped without their
  opt-in flags. Typecheck and lint pass (3 warnings in unrelated untracked workbook
  scripts). No app route or bundle change was made in Step 4.
- The preview suite uses `RUN_PREVIEW_AI_STATE=1`,
  `PA_AI_PREVIEW_CONFIRM=ISOLATED_V2_PREVIEW`, `PA_AI_PREVIEW_URL`,
  `PA_AI_PREVIEW_PUBLISHABLE_KEY`, and `PA_AI_PREVIEW_SECRET_KEY`. Never use the deployed
  V1 URL or paste the secret key into chat.
- Local gates after Step 3: 42 Vitest tests passed, 11 live-only tests skipped;
  typecheck, lint, isolated production build, and Chromium browser tests passed.
  Browser coverage includes persistence, focus/Escape, mobile, reduced motion, and
  light-route contrast. Provider smoke and release gates remain in Step 8.
- `npm audit --omit=dev` reports zero production advisories. Full audit reports
  five high-severity issues confined to the ESLint development chain, rooted in
  `braces` with no patched release. Recheck before merge; do not downgrade Next
  to mask the finding.
- V2 security hardening accepts verified-email Google linking by owner approval.
  Confirm Email is enabled in both preview and deployed projects; Google is
  enabled on deployed V1 but disabled on preview, so linking was not exercised
  on preview. Migration `0004_auth_resend_limits.sql` remains preview-only.

### Open items

1. Explicit owner approval for merge/deployment; deployed V1.3 remains unchanged.
2. Back up deployed V1 data, then apply V2 migrations 0003 through 0007 in order
   before V2 traffic. Never reverse migrations after V2 writes.
3. Configure and smoke the production AI provider; only local Ollama was tested
   this pass. A cold local model can exceed the 60-second timeout.
4. Recheck the five dev-tool advisories before merge and review existing V1
   Supabase function lints noted in `plans/deployment-checklist.md`.
5. Keep section recency by `updated_at` and chapter reorder via
   `move_chapter_atomic`; do not reintroduce browser-local timestamps or
   repeated reorder writes.
6. Landing page middle hero has no "Sign in" button — **accepted deviation**, the landing
   UI stays as built.
7. Confirm the browser runner exits cleanly on the release host before deployment.
8. Diagnose confirmation-mail delivery against the isolated preview Supabase project.
   Check Auth logs and SMTP/provider configuration without changing deployed V1.

### Document map

| File | What it holds |
|---|---|
| `README.md` | Public-facing overview, setup, deployment. Records version 1.3 |
| `CLAUDE.md` | Project instructions, conventions, gates |
| `plans/pacific-aurora-blueprint.md` | The 12-step build plan and the document's fixed readings |
| `plans/pacific-aurora-api-design.md` | API design notes |
| `plans/Pacific Aurora — Project Specification - V2.pdf` | V2 scope authority for this branch |
| `plans/pacific-aurora-v2-blueprint.md` | Approved V2 eight-step implementation plan and mutation log |
| `plans/implementation-status.md` | What is built, verification boundaries, what remains |
| `plans/deployment-checklist.md` | Ordered pre-deploy checklist |
| `plans/security-review-2026-10-10.md` | Full security review with severities and fixes |
| `C:/pacificaurora/Pacific Aurora — Project Specification.md` | **The only scope authority** |

### Repository quirks worth knowing

- `.gitignore:46` ignores `/plans`, so `plans/security-review-2026-10-10.md` and
  `plans/deployment-checklist.md` are **not tracked** in git. The three older files stay
  tracked only because they were committed before the ignore rule was added. The V2 PDF
  and blueprint were force-added on the V2 branch; keep them staged/tracked. If you want
  the two security/deployment docs backed up, un-ignore the directory or move them.
- `package.json` still says `0.1.0` while the project is version 1.3. The README is the
  source of truth for the deployed version. The approved V2 blueprint reserves the
  `README.md`/`package.json` synchronized bump to 2.0.0 for Step 8, once V2 passes its
  release gates; package dependencies changed in Step 2 without an early release bump.

---

## 2. Project instructions (contents of CLAUDE.md, reproduced in full)

# Project Instructions

## Project

Pacific Aurora is a full-stack authoring and worldbuilding workspace. Fiction gets a
persistent world behind it: characters, places, items, relationships, and user-defined
custom entity types stay connected to the books written inside them.

**V2 branch version: 2.1.0.** Recorded in `README.md` and `package.json`.
V1.3 remains deployed until the V2 rollout is explicitly approved.

## Versioning

Pattern: `x.y.zzz`

| Part | Bump when |
|---|---|
| `x` | A massive update, or anything that changes the core of the app, functional or non-functional |
| `y` | A normal update, such as new features added to the existing app surface |
| `z` | Minor patches and minor updates |

Every change set bumps exactly one part. Moving `y` or `x` resets the parts to its right
to zero. Record the new version in `README.md` and keep `package.json` in step with it.

---

## Tech stack

- Next.js 15 App Router, React 19, strict TypeScript
- Supabase Auth and PostgreSQL, row-level security on every table, `@supabase/supabase-js`
- OpenAPI 3.1 contract; Orval generates the fetch client and the zod schemas
- Tailwind CSS v4 with design tokens in `app/globals.css`
- TipTap (writer), React Flow (relationships graph), TanStack Query (workspace data)
- Motion for animation, React Three Fiber for the aurora shader, Phosphor for icons
- Vitest (unit, contract, database, live) and Playwright (browser)

`zustand` and `@tanstack/react-query` are installed; only React Query is used.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server on port 3000 |
| `npm run build` | Production build |
| `npm run start` | Serve the build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest: contract, database, service |
| `npm run test:contract` | Contract sub-suite |
| `npm run test:e2e` | Playwright (run `npx playwright install chromium` first) |
| `npm run generate:api-types` | Regenerate `src/lib/api/generated.ts` and `schemas.ts` |

**Live suites** create and delete real data, so they are skipped unless enabled. Each reads
credentials from `.env.local`:

```bash
RUN_LIVE_RLS=1 npm test               # two-user 404 behaviour on every dynamic route
RUN_LIVE_ATOMIC=1 npm test            # concurrent chapter reorder under the unique index
RUN_LIVE_ACCOUNT_DELETE=1 npm test    # cascade removal of an account and all it owns
```

Before handing off: lint, typecheck, test, and build whenever routing or bundling could be
affected. CI (`.github/workflows/verify.yml`) runs all four plus the browser suite.

---

## Architecture

```
Browser  token in localStorage under `pacific_aurora_token`
  -> apiFetch (src/lib/api/client.ts)     bearer header, { data } / { error } envelope,
                                          response validated against the generated zod schema
  -> route handler (thin)                 readJson + validation, then getContext
  -> getContext (src/server/context.ts)   requireUser + RLS-scoped client + authorizeResourcePath
  -> service (src/server/services)        business rules, ownedOr404
  -> repository (src/server/repositories) row mapping snake_case -> contract shape
  -> Supabase with RLS                    every query scoped to the owner
```

Four Supabase clients exist. `anonClient()` for auth operations, `supabaseForRequest(req)`
for everything the user touches, `adminClient()` (service role, server only, returns `null`
when unset) for userid sign-in lookup and account deletion, and nothing else.

Contract-driven: both sides are generated from or tested against
`contracts/pacific-aurora.openapi.yaml`. Never hand-edit generated files.

## Where things live

- `app/` — pages, layout, `globals.css`, and `app/api/**` route handlers, one directory per
  contract path (42 path groups). Pages: landing, `signup`, `signin`, `forgot-password`,
  `onboarding`, `home`, `books/[bookId]`, `worlds/[worldId]`, `privacy`, `terms`.
- `src/components/` — `AuroraBackground`, `AccountMenu`, `PageTransition`,
  `SmoothScrollProvider`, `GoogleAuthButton`, plus `home/` (sidebar, sections, entry menu,
  dialogs) and `workspace/` (BookWorkspace, WorldWorkspace, WorldEntities, Writer,
  ChapterTimeline, Relationships, CharacterHistory, shared).
- `src/lib/` — `api/` (client, session, admin, errors, generated, schemas,
  response-validation), `sectionRecency.ts`, `utils.ts`.
- `src/server/` — `context`, `http`, `ownership`, `resource-scope`,
  `auth/resend-cooldown`, `repositories/` (interfaces plus Supabase implementations),
  `services/`.
- `supabase/migrations/` — `0001_pacific_aurora.sql` (schema, RLS, triggers, validators),
  `0002_atomic_writes.sql` (atomic writes), `0003_ai_analysis_state.sql`,
  `0004_auth_resend_limits.sql`, `0005_ai_apply_once.sql`, and
  `0006_ai_new_chapter_checkpoint.sql`, and `0007_ai_sliding_review.sql`.
- `tests/` — `contract/`, `db/`, `live/`, `e2e/`, `helpers/in-memory.ts`.
- `plans/` — `pacific-aurora-blueprint.md` (12-step plan), `pacific-aurora-api-design.md`,
  `implementation-status.md`, `deployment-checklist.md`.

**Authority:** the specification at `C:/pacificaurora/Pacific Aurora — Project
Specification.md` is the only scope authority; the blueprint sets the build order.
`plans/implementation-status.md` records current state and open items.

---

## Product rules to carry in your head

**Auth.** Email/password sign-up sends a 6-digit Supabase OTP; expiry and resend cooldown
are 2 minutes each and resend triggers the same generator. Registration is complete only
after verification. Google uses an ID-token exchange server-side; V2 accepts Supabase
verified-email identity linking (user-approved). Sign in accepts email **or**
userid. Sign-in failures return one uniform code and message, with calm copy, never a red
alert.

**Onboarding.** Username is not unique, userid is. The completion flag is raised whenever
userid is empty, and flagged users are redirected to onboarding from anywhere.

**Home.** Left nav carries BOOKS and WORLDS with create buttons, a three-dots menu per entry
(Edit name, Delete), and is scrollable. Deleting a book removes its text and chapters but
keeps the world's entities; deleting a world removes everything inside it including linked
books. Both confirmations state this. The middle shows the current world's sections; at most
4 sections appear, ordered by the newest `updated_at` inside each, and a world holds at most
10 custom sections. Clicking an entity opens that world's book on the World tab.

**Book page.** Tabs: Writer (default), World, Relationships, Timeline. A book with no
chapters gets an "Introduction" chapter automatically. Writer is TipTap with chapter tabs,
sessionStorage drafts keyed `pacific_aurora_draft:{bookId}:{chapterId}`, explicit Save and
Ctrl/Cmd+S. Chapter reorder goes through the `move_chapter_atomic` RPC, never repeated
updates. Relationships are characters only, node positions are local UI state, sentiment is
0-100, and the type is free text with presets.

**World page.** Same shape as the home middle but scrollable and containing every custom
section, with editable right-hand detail panels and a horizontal strip of connected books
that open in a new tab.

**Account deletion.** `DELETE /api/auth/account` with body `{ confirmation: "DELETE" }`. It
deletes the auth user and the cascade removes the profile, worlds, books, chapters,
entities, timelines, and relationships. No RLS delete policy is needed because it runs
through the service-role client.

**V2 additions.** Settings selects browser-local Light or Dark. Writer suggestions
analyze the latest 500 words after a pause once 500 words exist, then every five minutes
while Writer is open; only Accept applies a card. The server loads current world context
under RLS. Cards are session-only; chapter-scoped declines persist across devices.

## Conventions

- PascalCase component files, kebab-case route segments, `@/` alias for imports.
- Routes stay thin: validate, build context, call a service, return the envelope.
- Expected failures become typed errors from `src/lib/api/errors.ts`; everything goes
  through `errorResponse`.
- Ownership through the authenticated client and RLS. Cross-user access returns 404, never
  403, so it is indistinguishable from a missing resource.
- Persistence stays behind the interfaces in `src/server/repositories/types.ts`.
- async/await, no unstructured logging outside the central unexpected-error path.
- Free-text statuses (`places.status`, `items.status`, `relationship_type`) accept manual
  entry; named options are presets only. `character_status` is the only true enum.
- Calm failure copy, no em-dashes, no decorative emoji in product surfaces.

## Frontend notes

- Light and Dark. Tokens in `globals.css`: near-black navy dark base, one aurora-teal accent,
  Newsreader for display type, a z-index scale. Component classes: `.btn`, `.input`,
  `.frosted-panel`, `.calm-notice`; workspace surfaces live in a `.ws-*` layer.
- Every animation respects `prefers-reduced-motion`.
- `AuroraBackground` skips `/books` and `/worlds` (opaque workspaces). Lenis smooth scroll
  runs on the landing page only, and app panes carry `data-lenis-prevent`.
- Workspaces use TanStack Query with `read`/`write` helpers from
  `src/components/workspace/shared.tsx`, which also owns the session gate (401 to `/signin`,
  incomplete profile to `/onboarding`). Home and auth use `apiFetch` directly.

## Environment and security

Copy `.env.example` to `.env.local`. Base and V2 provider variables:

| Variable | Scope | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | Bare origin. A `/rest/v1` suffix breaks every call with a 404 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser + server | Publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | userid lookup, account deletion, AI finalization and resend limits |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | browser | Google Identity Services client |
| `AI_BASE_URL` | server only | Local Ollama or Groq chat-completions base URL |
| `AI_MODEL` | server only | Provider model ID |
| `AI_API_KEY` | server only | Required for Groq; unused locally |

`.env*` is gitignored and no env file is tracked. Never expose the service-role key.
`NEXT_PUBLIC_*` values are inlined at build time, so a change needs a rebuild, not a reload.
`next.config.ts` ships a Content-Security-Policy pinned to self, the Supabase origin, and
Google, plus HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, and
`Permissions-Policy`.

Google needs an OAuth **Web application** client, every loading origin in Authorized
JavaScript origins, the provider enabled in Supabase with the Client ID and Secret, and the
Client ID in `.env.local`.

## Testing

- `tests/**/*.test.ts` run under Vitest.
- Service behaviour uses the in-memory repositories in `tests/helpers/in-memory.ts`; extend
  those rather than reaching for a live client.
- `tests/contract` guards that the artifact declares the contract and that responses
  validate against the generated schemas.
- `tests/db/migration.test.ts` asserts tables, RLS coverage, enums, triggers, and functions.
- `tests/db/resource-scope.test.ts` and the live suites cover ownership and 404 behaviour,
  simulated and real respectively.
- Playwright specs in `tests/e2e/*.spec.ts` mock the API; they test UI behaviour, not RLS.
- Add a test with each behaviour change. Live suites need their `RUN_LIVE_*` flag.

## Gotchas

- PostgREST cannot filter reliably on nested resource columns, so entity list repositories
  fetch visible rows and narrow by `world_id` in the client. Ownership is still RLS.
- `optionalString` returns `null` for an explicit `null` so nullable fields can be cleared;
  omission leaves them untouched. `optionalInt` rejects non-integers.
- The OTP resend limit is durable through migration 0004; preview-only until V2 rollout.
- `src/lib/api/generated.ts` and `schemas.ts` are generated; regenerate instead of editing.

## Git

Short, descriptive, implementation-oriented commit subjects. Keep secrets out of commits.

---

## 3. Recent work log

Most recent first. Use this to tell deliberate state from unfinished work.

- **Sliding AI review (2026-10-17, branch plus isolated preview).** Version
  2.1.0 reviews the latest 500 words every five minutes after the chapter
  reaches 500, compares suggested facts with the current world, and remembers
  declines per chapter across devices. Migration 0007 was applied only to
  `pa-newbranchtest`; deployed V1 remains unchanged. Lint, typecheck, 82
  default tests, and isolated build pass; full Chromium 26/27, with the
  sign-in consent case passing on isolated rerun.
- **AI quality prompt (2026-10-17, branch only).** Patch 2.0.5 uses the
  owner-supplied extraction prompt with real entity fields and accepts the
  loopback Ollama URL and port from `AI_BASE_URL`. A local provider check returned
  item, place, and character-timeline cards for a named-sword passage, without
  a sword-as-character card. Duplicate-name creates are filtered. Lint, typecheck,
  78 default tests, and an isolated
  production build pass. V1 and preview data were not changed.
- **AI 502 fix (2026-10-17, branch only).** Patch 2.0.4 caps validated model
  suggestions at eight instead of rejecting a nine-card response. Local Ollama's
  deadline increased from 60 to 120 seconds after the saved 500-word chapter
  reproduced both a timeout and a nine-card 502. No preview data or deployed V1
  state changed during the fix.
- **Landing font default (2026-10-17, branch only).** Patch 2.0.3 sets Times New Roman
  explicitly for the landing page and verifies computed body/heading fonts in Chromium
  and the production build. Lint, typecheck, 74 default tests, and build pass.
  Deployed V1 remains unchanged.
- **Writer/AI first-milestone fix (2026-10-17, branch plus isolated preview).** Loaded
  content now seeds the Writer word-count/suggestion snapshot before editing; the initial
  3-word, clipboard-paste, and loaded 550-word analysis browser regressions pass.
  Migration 0006 creates milestone-zero checkpoints for newly created chapters; the
  isolated preview migration and targeted repair of the affected 550-word chapter were
  verified. Local lint, typecheck, 74 default tests, build, and 26 browser cases passed,
  though the browser runner did not exit cleanly. Route-to-local-Ollama-to-apply
  passed with no disposable AI users left. No deployed V1 change; production Groq
  smoke remains open.
- **Landing theme toggle complete (2026-10-17, branch only).** The landing page now shows
  the compact mode of the existing `ThemeSettings` control. It persists the same local
  preference across routes, exposes `Switch to light/dark theme`, works at mobile width,
  and passed focused browser, lint, and typecheck checks. Version advanced to 2.0.1 at
  completion; subsequent unfinished Writer work moved the files to 2.0.2.
- **Supabase confirmation-mail investigation (2026-10-17, no mutations).** The local app
  is configured against the isolated V2 preview project. No code or Supabase settings were
  changed, and the provider-side delivery cause was not conclusively established. Continue
  with preview Auth logs and SMTP/provider configuration; do not touch deployed V1.
- **V2 Step 8 local/preview gate complete (2026-10-17, branch only).** Full
  browser suite 24/24, local/preview database and provider checks, approved
  legal disclosure, version 2.0.0 docs, and zero production dependency
  advisories. Production Groq smoke, V2 migrations on deployed V1, and merge/
  deployment await separate owner approval. V1.3 remains live.
- **V2 Step 7 complete (2026-10-17, branch only).** Pause-driven Writer
  suggestions, in-memory cards, explicit apply/decline, cooldown and outage
  states, and focused browser coverage. Canonical world context stays server-side.
  No V2 change touched deployed V1; Step 8 is next.
- **V2 Step 6 complete (2026-10-15, branch plus isolated preview only).**
  Corrected the PL/pgSQL `CASE` condition in migration 0005, applied it to
  `pa-newbranchtest`, and verified the apply function, four version triggers,
  and five guarded live tests (AI state plus apply). No V2 migration touched
  deployed V1; Step 7 is next.
- **V2 Step 4 complete (2026-10-15, branch plus isolated preview only).** Durable AI
  state migration, repository, and tests are local; the migration was applied only to a
  separate V2 test project. All three guarded preview tests passed. Apply migration 0003
  to the deployed project only during the approved V2 rollout, before V2 code deployment.
- **V2 Step 3 complete (2026-10-13, branch only).** Settings and light theme are
  implemented across public and workspace routes, with preference persistence and
  browser accessibility coverage. No live deployment or migration. Step 4 is next.
- **V2 Steps 1-2 complete (2026-10-13, branch only).** AI contract/types/tests and Writer
  formatting landed locally. No AI backend or live migration is present.
  See `plans/pacific-aurora-v2-blueprint.md` for exact scope and order.
- **Aurora fix (this session).** `/` and `/home` each mounted a second copy of
  `<AuroraBackground />` on top of the layout's global one, and the landing `<main>` carried
  an opaque `bg-[#020a10]` that masked the aurora at `-z-10`. Both inline copies and the
  opaque background were removed. One canvas per page now.
- **Security review completed.** No Critical. 2 High (Google identity-conflict chain,
  resend flood), 4 Medium, 4 Low. Full findings in `plans/security-review-2026-10-10.md`.
  Authorization/IDOR, SQL injection, XSS, mass assignment, and secrets all verified clean.
- **Live Supabase connection established and verified.** All 15 tables with real records,
  auth flows verified, Google provider enabled.
- **Account deletion shipped.** `DELETE /api/auth/account` requiring `{ "confirmation":
  "DELETE" }`, backed by the `auth.users` cascade.
- **Live test suites added**, gated behind `RUN_LIVE_RLS=1`, `RUN_LIVE_ATOMIC=1`,
  `RUN_LIVE_ACCOUNT_DELETE=1`.
- **Section recency switched to `updated_at`** per blueprint fixed reading 1, replacing
  browser-local access timestamps.
- **Atomic chapter reorder** via `move_chapter_atomic` in `0002_atomic_writes.sql`.
- **Response validation wired** into `apiFetch` through `response-validation.ts`.
- **Privacy and terms pages** added at `/privacy` and `/terms`, with agreement required at
  sign-up and sign-in.
- **CSP and security headers** added in `next.config.ts`.
