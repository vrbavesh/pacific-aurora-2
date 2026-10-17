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
