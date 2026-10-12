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

**Product: complete and deployed.** Version 1.3. Every surface in the specification is
implemented and the project is live against Supabase.

### Verified against the live project

- All 15 tables present with real records; both migrations applied
- Email/password sign-up, sign-in, OTP recovery, onboarding, and normal CRUD verified live
- Google sign-in **enabled** (`/auth/v1/settings` reports `"google": true`) and needs no
  code change; only the Client ID env var on the host
- Service-role key configured, server-side only, `.env.local` gitignored, no env tracked
- Gates: `typecheck` clean, `lint` 0 errors (6 pre-existing warnings), `test` 37 passed /
  11 skipped (the skipped ones are the `RUN_LIVE_*` suites), `build` passing with
  `/home`, `/books/[bookId]`, `/worlds/[worldId]` and all 38 route groups

### Open items

1. **Supabase settings that decide security finding H1**: automatic identity linking and
   Confirm email. See `plans/security-review-2026-10-10.md`.
2. **Security review findings**: 0 Critical, 2 High, 4 Medium, 4 Low, all documented with
   attack sketches and fixes in `plans/security-review-2026-10-10.md`. Recommended order:
   H1 and H2 first, then M1–M4.
3. **Section recency** is resolved (ordered by `updated_at` per the blueprint's fixed
   reading). Do not reintroduce browser-local timestamps.
4. **Chapter reorder is atomic** via `move_chapter_atomic`. Never revert to repeated updates.
5. Unit-test coverage for the important-points multi-line save and relationship node
   pruning.
6. Landing page middle hero has no "Sign in" button — **accepted deviation**, the landing
   UI stays as built.

### Document map

| File | What it holds |
|---|---|
| `README.md` | Public-facing overview, setup, deployment. Records version 1.3 |
| `CLAUDE.md` | Project instructions, conventions, gates |
| `plans/pacific-aurora-blueprint.md` | The 12-step build plan and the document's fixed readings |
| `plans/pacific-aurora-api-design.md` | API design notes |
| `plans/implementation-status.md` | What is built, verification boundaries, what remains |
| `plans/deployment-checklist.md` | Ordered pre-deploy checklist |
| `plans/security-review-2026-10-10.md` | Full security review with severities and fixes |
| `C:/pacificaurora/Pacific Aurora — Project Specification.md` | **The only scope authority** |

### Repository quirks worth knowing

- `.gitignore:46` ignores `/plans`, so `plans/security-review-2026-10-10.md` and
  `plans/deployment-checklist.md` are **not tracked** in git. The three older files stay
  tracked only because they were committed before the ignore rule was added. If you want
  those two backed up, un-ignore the directory or move them.
- `package.json` still says `0.1.0` while the project is version 1.3. The README is the
  source of truth for the version; fix `package.json` when you touch it.

---

## 2. Project instructions (contents of CLAUDE.md, reproduced in full)

# Project Instructions

## Project

Pacific Aurora is a full-stack authoring and worldbuilding workspace. Fiction gets a
persistent world behind it: characters, places, items, relationships, and user-defined
custom entity types stay connected to the books written inside them.

**Current version: 1.3.** Recorded in `README.md`. `package.json` still carries `0.1.0`
and has never been aligned; fix that when you touch it.

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
  contract path (38 path groups). Pages: landing, `signup`, `signin`, `forgot-password`,
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
  `0002_atomic_writes.sql` (`move_chapter_atomic`).
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
after verification. Google uses an ID-token exchange server-side; an address that already
owns a mail/password account is refused with 409, never merged. Sign in accepts email **or**
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

**Not built.** No settings surface exists; the icon is intentionally absent from `/home` and
reserved for a future feature. Do not add one without a specification section for it.

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

- Dark only. Tokens in `globals.css`: near-black navy base, one aurora-teal accent,
  Newsreader for display type, a z-index scale. Component classes: `.btn`, `.input`,
  `.frosted-panel`, `.calm-notice`; workspace surfaces live in a `.ws-*` layer.
- Every animation respects `prefers-reduced-motion`.
- `AuroraBackground` skips `/books` and `/worlds` (opaque workspaces). Lenis smooth scroll
  runs on the landing page only, and app panes carry `data-lenis-prevent`.
- Workspaces use TanStack Query with `read`/`write` helpers from
  `src/components/workspace/shared.tsx`, which also owns the session gate (401 to `/signin`,
  incomplete profile to `/onboarding`). Home and auth use `apiFetch` directly.

## Environment and security

Copy `.env.example` to `.env.local`. All four variables:

| Variable | Scope | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | Bare origin. A `/rest/v1` suffix breaks every call with a 404 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser + server | Publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | userid sign-in lookup, account deletion |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | browser | Google Identity Services client |

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
- The OTP resend cooldown is an in-memory map, so it resets per serverless instance.
- `src/lib/api/generated.ts` and `schemas.ts` are generated; regenerate instead of editing.

## Git

Short, descriptive, implementation-oriented commit subjects. Keep secrets out of commits.

---

## 3. Recent work log

Most recent first. Use this to tell deliberate state from unfinished work.

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
