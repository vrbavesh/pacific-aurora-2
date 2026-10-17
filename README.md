# Pacific Aurora

**Version 2.1.4 on `codex/pacific-aurora-v2`.** V1.3.1 remains deployed until the
V2 migration and release are explicitly approved.

A serene, private writing and worldbuilding workspace. Pacific Aurora gives fiction a
persistent world behind it: characters, places, items, relationships, and your own custom
kinds of entities stay connected while you write the books that belong to them.

```bash
npm install && npm run dev
# open http://localhost:3000
```

---

## What it does

**Authentication and onboarding**

- Email and password sign-up with a 6-digit Supabase OTP (2-minute expiry, 2-minute resend
  cooldown, registration incomplete until the mail is verified)
- Google sign-in through Google Identity Services; Supabase may link an identity
  to an existing account only after verified-email confirmation
- Password recovery by OTP that doubles as the entry token
- Onboarding collects a non-unique username and a unique userid; profiles without a userid
  are flagged and redirected back to onboarding
- Full account deletion from the account menu: typing `DELETE` removes the auth user, and the
  database cascade removes the profile, worlds, books, chapters, entities, timelines, and
  relationships

**Home (`/home`)**

- Scrollable left navigation with a BOOKS section and a WORLDS section, each with a create
  button, and every entry carrying a three-dots menu for Edit name and Delete
- Deleting a book keeps the world's entities and removes only its text; deleting a world
  removes everything inside it, including its linked books. Both confirmations say so
- The middle shows the current world's details as vertical sections; at most 4 sections
  appear, ordered by the newest `updated_at` inside each one, and a world may hold up to
  10 custom sections
- Settings lets each browser choose Light or Dark, applied before the first paint
- Clicking an entity opens its world's book on the World section

**Book (`/books/[bookId]`)**

- Horizontal menu: Writer (default), World, Relationships, Timeline
- Writer is a TipTap editor with chapter tabs, sessionStorage draft recovery, explicit Save,
  and Ctrl/Cmd+S. It has bounded font, heading, list, alignment, link, color, underline,
  and strike controls. A book with no chapters gets an "Introduction" chapter automatically
- Once a chapter reaches 500 words, the optional AI provider reviews its latest 500 words
  after a pause and again every five minutes while the Writer is open. It compares those
  words with current World Management data; missing facts become cards. Accept writes a
  proposed world change; Decline is remembered across sign-ins and devices for that chapter.
  AI never edits manuscript prose or blocks Save
- World mirrors the world page: every section, plus/New, right-hand detail panels, deletion
  with confirmation, and character timelines
- Relationships is a React Flow canvas: add character nodes from the right list, drag them,
  connect them, and set a 0-100 sentiment plus a free-text type with presets
- Timeline segments chapters with create, rename, reorder, delete, and per-chapter
  important points

**World (`/worlds/[worldId]`)**

- The same shape as the home middle but scrollable and containing every entity, including
  all custom sections, each with an editable right-hand panel
- A horizontal strip of connected books across the top; opening one loads that book

**Legal**

- `/privacy` and `/terms` are published and linked from the landing footer and the auth
  pages; sign-up and sign-in require agreeing to the terms

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router), React 19, strict TypeScript |
| Styling | Tailwind CSS v4 with design tokens in `app/globals.css` |
| Backend | Supabase Auth and PostgreSQL with row-level security |
| Data access | `@supabase/supabase-js`, RLS-scoped client per request, service-role admin client |
| Contract | OpenAPI 3.1 in `contracts/`, Orval generates the fetch client and zod schemas |
| Editor | TipTap |
| Graph | React Flow (`@xyflow/react`) |
| Data fetching | TanStack Query for the workspaces, `apiFetch` for the auth and home flows |
| Motion | Motion (`motion/react`), all animation respects `prefers-reduced-motion` |
| 3D background | React Three Fiber with a custom aurora shader, `AuroraBackground` |
| Icons | Phosphor |
| Tests | Vitest (unit, contract, database, and live suites) and Playwright (browser) |

---

## Getting started

### Prerequisites

- Node.js 20 or newer (CI uses 24) and npm
- A Supabase project (Auth + Postgres)
- A Google OAuth 2.0 **Web application** client, if you want Google sign-in

### Install and configure

```bash
npm install
```

Create a local `.env.local` with the variables below. Environment files are
gitignored; do not commit credentials.

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | Supabase project URL. Use the bare origin; no `/rest/v1` suffix |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser + server | Publishable (anon) key |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | Userid sign-in lookup and account deletion. Never exposed to the browser |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | browser | Google Identity Services client ID |
| `AI_BASE_URL` | server only | Loopback Ollama URL and port (for example `http://localhost:11434/v1`) or `https://api.groq.com/openai/v1` |
| `AI_MODEL` | server only | Groq model ID (`openai/gpt-oss-120b` by default) or installed Ollama model |
| `AI_API_KEY` | server only | Required for Groq, unused by local Ollama |

### Apply the database schema

Run migrations in order: `0001_pacific_aurora.sql`, `0002_atomic_writes.sql`,
`0003_ai_analysis_state.sql`, `0004_auth_resend_limits.sql`, and
`0005_ai_apply_once.sql`, `0006_ai_new_chapter_checkpoint.sql`, and
`0007_ai_sliding_review.sql`. Migrations 0003 through 0007 have been applied
to the live Pacific Aurora project, but V2 code has not been deployed.

### Generate the API artifacts and run

```bash
npm run generate:api-types    # contract -> src/lib/api/generated.ts + schemas.ts
npm run dev
```

### Google sign-in (optional)

Create an OAuth Web client, add every origin that loads the app to *Authorized JavaScript
origins*, enable Google in Supabase under Authentication, Providers with the Client ID and
Secret, and set `NEXT_PUBLIC_GOOGLE_CLIENT_ID`. Restart the dev server afterwards, because
`NEXT_PUBLIC_*` values are inlined at build time.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server on port 3000 |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest: contract, database, and service suites |
| `npm run test:contract` | The contract sub-suite only |
| `npm run test:e2e` | Playwright browser suite (needs `npx playwright install chromium`) |
| `npm run generate:api-types` | Regenerate the client and zod schemas from the contract |

### Live database suites

Three suites run against a real project and are skipped unless explicitly enabled, since
they create and delete data:

```bash
RUN_LIVE_RLS=1 npm test                  # two-user 404 checks on every dynamic route
RUN_LIVE_ATOMIC=1 npm test               # concurrent chapter reorder under the unique constraint
RUN_LIVE_ACCOUNT_DELETE=1 npm test       # cascade removal of an account and everything it owns
```

They read credentials from `.env.local`.

V2 AI state, apply, and route-to-provider suites now use the same Supabase URL
and keys as the app. They create and delete disposable users, so they remain
skipped unless their respective `RUN_LIVE_AI_STATE`, `RUN_LIVE_AI_APPLY`, or
`RUN_LIVE_AI_E2E` flag is `1` **and** `PA_AI_LIVE_CONFIRM` is set to
`MAIN_PROJECT_DISPOSABLE_USERS` in the shell. Do not put that confirmation in
`.env.local`. The local Ollama smoke suite remains separate. See `tests/live/`
and the [V2 deployment checklist](plans/deployment-checklist.md).

---

## Project structure

```
app/
  page.tsx                     landing page
  home/page.tsx                workspace home (navigation, sections, dialogs)
  signup/ signin/ forgot-password/ onboarding/
  books/[bookId]/              book workspace route
  worlds/[worldId]/            world workspace route
  privacy/ terms/              legal pages
  api/**                       41 route groups, one directory per contract path
  globals.css                  design tokens, component classes, workspace layer
src/
  components/
    AuroraBackground.tsx       WebGL aurora shader (route aware)
    AccountMenu.tsx            account trigger, profile, logout, account deletion
    PageTransition.tsx         motion primitives: PageTransition, Stagger, GlassPanel
    SmoothScrollProvider.tsx   Lenis smooth scroll, landing only
    GoogleAuthButton.tsx       GIS button with a calm unavailable fallback
    home/                      SidebarNav, WorldSections, EntryMenu, dialogs
    workspace/                 BookWorkspace, WorldWorkspace, WorldEntities, Writer,
                               WriterSuggestions,
                               ChapterTimeline, Relationships, CharacterHistory, shared
  lib/
    api/client.ts              apiFetch, token storage, redirectAfterAuth
    api/session.ts             RLS-scoped and anonymous Supabase clients
    api/admin.ts               service-role client (server only)
    api/errors.ts              typed errors and the central response handler
    api/generated.ts           Orval fetch client (generated)
    api/schemas.ts             Orval zod schemas (generated)
    api/response-validation.ts response validation against the generated schemas
    sectionRecency.ts          section ordering by updated_at
    utils.ts                   cn() helper
  server/
    context.ts                 authenticated request context
    http.ts                    body parsing and validation helpers
    ownership.ts               ownedOr404
    resource-scope.ts          parent-existence checks for nested routes
    auth/resend-cooldown.ts    durable OTP resend limits
    repositories/              interfaces plus Supabase implementations
    services/                  business rules per aggregate
contracts/pacific-aurora.openapi.yaml   the single source of truth for the API
supabase/migrations/         0001-0007 schema, atomic writes, V2 AI and resend limits
tests/                        contract, db, live, e2e, helpers
plans/                        blueprint, api design, status, deployment checklist
.github/workflows/verify.yml  CI: lint, typecheck, test, build, browser tests
```

---

## How a request flows

```
Browser (localStorage bearer token)
  -> apiFetch                        Authorization header, { data } / { error } envelope,
                                     response validated against the generated zod schema
  -> Route handler (thin)            readJson + validation, then getContext
  -> getContext                      requireUser (Supabase JWT) + RLS-scoped client
                                     + authorizeResourcePath (parent ownership)
  -> Service                         business rules, ownedOr404 for missing resources
  -> Repository                      snake_case rows mapped to contract shapes
  -> Supabase (RLS)                  row-level security scopes every query to the owner
```

Design rules the codebase holds to:

- **One contract.** Both sides are generated from or tested against
  `contracts/pacific-aurora.openapi.yaml`. Regenerate rather than hand-editing generated files.
- **404, never 403.** Another user's data is indistinguishable from a missing resource.
- **Uniform failure text.** Sign-in failures return one code and message.
- **Thin routes.** Validation and context in the handler, rules in services, persistence
  behind repository interfaces so they can be tested with in-memory doubles.
- **Calm errors.** Failure copy is quiet rather than alarming.

---

## Data model

The original 15 tables are `profiles`, `worlds`, `books`, `chapters`, `chapter_important_points`,
`world_entities`, `characters`, `places`, `items`, `custom_entity_types`,
`custom_entity_attributes`, `custom_entities`, `character_book_timelines`,
`character_timeline_points`, `entity_relationships`.
V2 adds three private AI state tables and a private resend-limit table.

- Every table has row-level security scoped to the owner through world ownership.
- Cascades run from `auth.users` down: deleting an account removes the profile, then every
  world and everything inside it. Nothing blocks the delete and nothing is orphaned.
- Triggers maintain `updated_at`, auto-create the "Introduction" chapter, create the profile
  row on sign-up, and validate entity subtypes, wielders, last chapters, timelines, and
  relationship membership.
- `0002_atomic_writes.sql` adds `move_chapter_atomic`, so chapter reordering is a single
  database call instead of many updates.
- Character status is the only true enum (`alive` / `dead`); place and item statuses and
  relationship types are free text with presets.

---

## Security

- **Content-Security-Policy and security headers** in `next.config.ts`: script, style, image
  and connect sources are pinned to self, the Supabase origin, and Google; frame-ancestors
  is `none`; HSTS, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy` are
  set on every response.
- The **service-role key is server-only**. It lives in `.env.local`, which is gitignored,
  and is used for userid lookup, account deletion, auth resend limits, and AI finalization.
- **RLS everywhere**, with ownership enforced by the authenticated request client.
- **Account deletion** requires typing `DELETE` and cascades from `auth.users`.
- Privacy policy and terms are published and acceptance is required at sign-up and sign-in.

---

## Design system

- Light and Dark themes use tokens in `app/globals.css`: a near-black navy dark base, a single aurora-teal
  accent, Newsreader for editorial display type, and a z-index scale.
- Components are built from `.btn`, `.input`, `.frosted-panel`, and `.calm-notice`, with the
  workspace surfaces in a `.ws-*` layer.
- The aurora shader runs across marketing and home surfaces and is skipped behind the opaque
  book and world workspaces.
- All motion is motivated and reduced when the user prefers reduced motion. Sharp corners on
  the home surfaces, rounded controls in the workspaces, one icon family.

---

## Testing

- **Vitest** (`npm test`): contract tests that the artifact declares the expected paths and
  that responses validate against the generated schemas; migration tests asserting tables,
  RLS, enums, triggers, and function coverage; service tests with in-memory repositories;
  and guarded live/preview suites listed above.
- **Playwright** (`npm run test:e2e`): writer saves and draft recovery, failed-save
  recovery, chapter navigation, item wielder clearing, onboarding gating, mobile layout,
  graph node creation, account deletion, legal pages, themes, and the AI suggestion panel,
  all against mocked API responses.
- **CI** (`.github/workflows/verify.yml`) runs lint, typecheck, unit tests, build, and the
  browser suite on every push and pull request.

---

## Deployment

1. Keep V1.3.1 deployed until the V2 branch passes its release gate and you approve rollout.
2. V2 migrations 0003 through 0007 were applied to the deployed database on
   2026-10-17. The owner accepted proceeding without a verified backup; arrange
   one now. Do not reapply the migrations or reverse them after V2 traffic.
   Use a forward repair migration instead.
3. Set the existing Supabase and Google variables plus `AI_BASE_URL`, `AI_MODEL`, and
   `AI_API_KEY` for Groq at production scope. Never expose the AI key to the browser.
4. In Supabase: set Site URL to the production origin, configure custom SMTP so OTP mail
   delivers to real users, set the email OTP expiry to 120 seconds, and enable Google with
   the Client ID and Secret.
5. Deploy (`npm run build` must pass) and repeat the smoke path with disposable accounts.

`plans/deployment-checklist.md` tracks this list; `plans/implementation-status.md` records
what is built and what remains.
