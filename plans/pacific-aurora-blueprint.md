# Pacific Aurora — Blueprint

Status: construction plan derived from `Pacific Aurora — Project Specification.md`.

## 1. Source of truth

`Pacific Aurora — Project Specification.md` is the only authority for scope. Every
step cites the section of that document it implements. Anything the document does not
describe is not built. No features are added, and none of the document's defined
behavior is removed or repurposed.

The database schema in Step 2 is applied to the project exactly as written — every
table, column, enum, constraint, index, trigger, function, and RLS policy in the
document is created verbatim, without alteration or commentary.

## 2. Design direction

> Serene and tranquil, as the document specifies, with the 3D background as the
> single hero moment, executed at the craft level of resn / Active Theory /
> locomotive.dev: real material and light, motivated motion, no scroll-hijack, no
> forced scroll-film.

| Dial | Value | Rationale |
|---|---|---|
| `DESIGN_VARIANCE` | 6 | Calm and centered, per "SERENE AND TRANQUIL" and "APP DESC ON CENTER" |
| `MOTION_INTENSITY` | 5 | Must genuinely ship, at the reference bar, and respect reduced-motion |
| `VISUAL_DENSITY` | 2 | The landing carries three elements: centered description, 3D background, CTAs |

- **Palette:** a near-black navy base with one aurora accent that moves through
  cyan, teal, and soft green. One accent is chosen and held across the entire product.
- **Errors:** never screaming red. Sign-in failures and validation problems render
  in white on a calm surface, as the document requires ("USE WHITE IF POSSIBLE").
- **3D:** `@react-three/fiber` with `@react-three/drei`. Lazy-loaded, isolated in
  a client component, clamped pixel ratio, and a static frame with no continuous
  animation loop when `prefers-reduced-motion` is set. A CSS-only aurora treatment
  is the fallback when WebGL is unavailable.
- **Reference set:** 21st.dev, Godly, Mobbins, Jitter, Haikei, bklit, land-book,
  motion-sites, kokonutui, limora, and Rive — used as craft benchmarks, not as code
  sources to copy wholesale.
- **Centered hero is kept.** The document explicitly says the app description sits
  on center.
- **CTA labels:** Sign Up and Sign In appear in the middle and at the top right.
  Both places use the same label for the same intent.

## 3. Contract-first

One authoritative artifact for the boundary:
`contracts/pacific-aurora.openapi.yaml` (OpenAPI 3.1).

- It is authored in Step 3, **before** any route handler or page is written.
- The frontend consumes it; the route handlers provide it. Any contract change is
  reviewed before either side moves.
- Frontend types and fixtures are generated from this single artifact. Backend
  responses are validated at runtime against schemas derived from the same artifact.
  There is no second copy of the shape in a wiki, a mock, or a handwritten
  interface.
- Change protocol: consumer need → contract diff → review → regenerate → both
  sides implement → both sides verify → merge.

The contract artifact lives at `contracts/pacific-aurora.openapi.yaml`. The
human-readable conventions, resource map, error model, and validation rules live
at `plans/pacific-aurora-api-design.md`.

## 4. API conventions

Noun resources, plural and lowercase, grouped as in the ownership model:

```
/api/profiles
/api/worlds
/api/worlds/{worldId}/books
/api/worlds/{worldId}/entities
/api/worlds/{worldId}/custom-entity-types
/api/worlds/{worldId}/relationships
/api/books/{bookId}
/api/books/{bookId}/chapters
/api/books/{bookId}/chapters/{chapterId}/important-points
/api/characters/{entityId}/timelines
/api/auth/...
```

Verbs appear only where CRUD does not fit:

```
/api/auth/otp/resend
/api/auth/password/reset
/api/books/{bookId}/chapters/{chapterId}/move
```

Status codes:

- `200` success, `201` + `Location` on create, `204` on delete.
- `400` malformed input, `401` missing or invalid session, `422` semantically
  invalid body, `429` with `Retry-After: 120` on OTP resend cooldown.
- **`404` — never `403` — for any attempt to read or modify another user's data.**
  A cross-user request is indistinguishable from a missing one.
- Sign-in failures are indistinguishable: the contract and the UI return the same
  code and the same calm white message for an unknown credential and a wrong
  password, so the contract does not reveal which accounts exist.
- Error envelope: `{ "error": { "code", "message", "details?", "requestId?" } }`.
- Success envelope: `{ "data": ... }`.
- All identifiers are opaque strings; all timestamps are ISO-8601 UTC strings.
- The authenticated user is derived from the server-side session only, never from a
  request body, query string, or path segment.

The ownership model of the schema is what makes this safe: row-level security is
enabled on every table, and the helper functions `is_world_owner`, `is_book_owner`,
and `is_entity_owner` gate every policy. Most queries therefore run under the
owner's session; the ownership helpers translate a denied row into a `404`.

Handlers are thin: parse the request, authenticate, call a service, map the result
to the contract, and funnel failures through one centralized error handler. Data
access lives behind per-aggregate repositories, and business rules live in service
functions, never inline in handlers. Multi-statement writes run inside a single
transaction, so a reorder that collides with the `unique(book_id, position)`
constraint is retried or reshaped, not half-applied.

## 5. Dependency graph

```
1 ──► 2 ──► 3 ──► 4 ──┬──► 5  world / book / chapters
                       ├──► 6  entities / custom sections / relationships / timelines
                       ├──► 7  auth: signup, OTP, signin, Google, forgot password
                       └──► 8  design foundation + 3D landing
                             └──► 9  frontend: auth + onboarding + account menu
                                   └──► 10  frontend: home
                                         └──► 11  frontend: book page
                                               └──► 12  frontend: world page + integration gate
```

Steps 5–8 are independent once Step 4 passes and may run in parallel.

## 6. Steps

### Step 1 — Project scaffold

**Document section:** Proposed Tech Stack.

Create the app from the stack in the document: Next.js 15 App Router, TypeScript,
Tailwind CSS, shadcn/ui, TipTap (`@tiptap/react`), React Flow, Zustand, TanStack
Query, and the Supabase client. Add Vitest for verification. Provide the scripts:

```
lint        typecheck        test        build
generate:api-types        test:contract
```

Initialize git. This is an empty directory with no package history and no remote,
so there is no rebase or conflict handling to plan.

Verification:

```
npm run lint
npm run typecheck
npm test
npm run build
```

Exit criteria: all four commands succeed on the empty scaffold.
Rollback: delete the generated directory and re-run.

### Step 2 — Database schema, applied verbatim

**Document section:** Proposed DB Schema.

Create `supabase/migrations/0001_pacific_aurora.sql` containing the schema from the
document exactly as written: the `pgcrypto` extension, the four enums, all tables in
the document order, composite unique keys, indexes, the `set_updated_at` function
and its triggers, the authorization helpers, the business-logic trigger functions
and triggers, all data-integrity validators, RLS enablement, and every policy.
No column, type, constraint, or policy is added, removed, or reworded.

Verification:

```
supabase db reset
supabase db lint
```

Plus a policy smoke test per table asserting that a second user's session cannot
read or write the first user's rows.

Exit criteria: `db reset` and `db lint` are clean, and every table's
select/insert/update/delete policy isolates by owner.
Rollback: `supabase db reset` restores any partially applied migration.

### Step 3 — Contract gate: OpenAPI artifact

**Document section:** the whole document.

Author `contracts/pacific-aurora.openapi.yaml`. It defines, for every surface above:
request and response schemas, required versus optional fields, nullability, enums,
the shared error envelope, the 404-for-cross-user rule, the OTP cooldown response,
the free-text status fields with their named presets, and the cap of ten custom
sections per world. Only the response and request bodies the frontend actually
observes are part of the contract; internal storage details are excluded.

Verification: `orval` (or the pinned generator) produces types without error, and
every resource in the document is present in the file.

Exit criteria: the artifact is complete, reviewed, and generates types.
This is the gate — Steps 5 through 12 do not begin until it passes.

### Step 4 — Shared kernel

**Document section:** Authorization.

Generate types from the contract. Add contract-derived runtime schemas used to
validate provider responses at the boundary. Create the shared error hierarchy
(`NotFoundError`, `ConflictError`, `UnauthorizedError`, `ValidationError`,
`RateLimitError`), the centralized error handler, the session-scoped data client,
the ownership→404 mapping, and the per-aggregate repository interfaces with their
service counterparts.

Verification:

```
npm run generate:api-types
npm run typecheck
npm run test:contract
```

Exit criteria: both backend and frontend compile against the same generated types.

### Step 5 — World, book, and chapter backend

**Document sections:** Worlds and Books, Conceptual Works, Timeline.

Implement world CRUD and rename/delete. Deleting a world deletes its entities,
items, custom sections, and linked books, with a confirmation that states the
books go too. Deleting a book deletes its text and chapters but leaves the world's
entities untouched, with a confirmation that states entities are kept.

Creating a book prompts for a new world or an existing one, because every book must
link to exactly one world. Touch `last_opened_at` on open. When a book has zero
chapters, creating it also creates one chapter named "Introduction" (the document's
trigger already enforces this; the API documents it). Chapter create/rename/delete,
up-down reorder, and per-chapter important points.

Verification: contract tests on every verb, plus a transaction test showing a
reorder that hits the position uniqueness constraint resolves cleanly.

### Step 6 — Entity backend

**Document sections:** World Entities, Relationships.

Characters (name, age, health, distinctions, traits, mutations, alive/dead status,
notes, and a per-book timeline when relevant), places (name, free-text status with
named presets, last chapter occurrence shown as "Book1: Chapter5"), items (name,
free-text status, power, wielder from an existing world character or a manual
name), and custom sections (user-defined class with typed attributes). Wielder
resolution: an existing character may be selected, or a manual name typed; on
character deletion the wielder becomes nothing. Deleting a character also deletes
their timeline and their relationship nodes; a permanent-deletion confirmation is
required. Relationships are per world, with the 0–100 love/hate slider and a free
text type with named presets. Character timelines cascade their points.

### Step 7 — Auth backend

**Document sections:** Sign Up, Sign In, Forgot Password, Google Authentication,
Authorization.

Sign up with email/password, verified by Supabase mail OTP, with a 2-minute
expiry and a 2-minute resend cooldown that triggers the same OTP generator.
Registration is complete only after the email is verified. Onboarding: non-unique
username, unique userid, and a flag that is set when the profile is incomplete and
cleared once userid is present; flagged profiles redirect to onboarding.

Sign in by email or userid plus password, or by Google. If a mail/password account
uses the same address that signs in via Google, refuse with an "account exists
already" response rather than merging. Forgot password: the user enters a mail,
existing accounts receive an OTP from the same verified generator, the OTP acts as
the entry token, and a fresh password replaces the stored one before the user is
let in. Sign in failures return one calm, uniform message.

### Step 8 — Design foundation and landing page

**Document section:** Landing Page.

Build the token set, the shadcn/ui theme, the 3D background scene, and the centered
app description with Sign Up / Sign In in the middle and at the top right. Loading,
empty, and error states are defined from the start. Reduced-motion and WebGL
fallbacks are part of "done", not an afterthought.

### Step 9 — Auth frontend

**Document sections:** Sign Up and Onboarding, Sign In and Forgot Password, Google
Authentication.

`/signup` with the OTP step (2-minute expiry countdown, resend appears after the
expiry timer and triggers the same generator, 2-minute cooldown with `Retry-After`).
`/signin` with the calm white inline "user not found, but don't worry you can try
again" style message in place of a red alert. Forgot password with the same OTP
mechanics. `/onboarding` collecting username and unique userid, redirecting to the
homepage once the flag clears. A post-registration profile-completion flag that
redirects any incomplete profile back to onboarding. Account menu with the
head-and-shoulder icon, username, userid in smaller type, edit-profile, and a log
out that ends the session and returns to the landing page.

### Step 10 — Homepage

**Document section:** Homepage.

Left vertical, scrollable navigation: BOOKS (each segmented, one entry per book)
with a create-book button, and WORLDS with a create-world button. Each entry has a
3-dots menu offering "Edit name" and "Delete". Deleting a book asks for
confirmation stating that entity data is kept but text is removed. Deleting a world
asks for confirmation stating that linked books are also deleted. Settings icon at
the left bottom. Top right, the account trigger.

Middle: when no world exists, the serene inline message "THE SCRATCHPAD IS EMPTY,
LETS CREATE SOMETHING ON IT!" blended into the theme, with a create-world button.
When worlds exist, the details of the world of the most recently opened book — a
quick-access surface showing characters, places, items, and custom sections as
separate vertical portions. A create-a-new-custom-section tile sits with the
sections, dotted-outline and low-opacity. At most 4 sections show on the home
screen, the most recently opened ones; as many as 10 custom sections are allowed.
Clicking an entity opens its linked book and that book's World section; when a
world has more than one book, the most recently opened one is used.

### Step 11 — Book page

**Document sections:** Book Page, World Entities, Relationships, Timeline.

Path follows the document's dynamic routing. A horizontal menu across the top —
WRITER (default), WORLD, RELATIONSHIPS, TIMELINE. A brand-new book opens with the
single "Introduction" chapter.

WRITER: a TipTap editor. Opening a chapter loads it into TipTap and creates a new
tab, leaving the previous tab's work visible.

WORLD: the world's entity sections, each with a `+NEW` button that opens the right
panel with that entity's fields. Every row carries a trash button that confirms a
permanent delete. Deleting a character notes that the timeline goes too; deleting
an item detaches it from any wielder.

RELATIONSHIPS: the characters list on the right; clicking a character creates a
draggable graph node on the left. With two nodes, clicking one and drawing to the
other opens the connection pop-up — a 0-to-100 love-or-hate slider and a free-text
type dropdown with the document's presets. Clicking a node or edge offers deletion.
Relationships belong to the world, not a book. Deleting a character in the world
view removes that character's nodes and edges.

TIMELINE: segmented chapter by chapter. Top: a create-chapter button and a
up-down sort. Each segment opens to "click to open the chapter" (loading it into
TipTap as a new tab) and "add important points" (a small text area where each
sentence prints as a bullet). The first segment is always "Introduction", covering
the first page through the prologue. Each row has a 3-dots menu for edit-name and
delete.

### Step 12 — World page and integration gate

**Document section:** World Page, Authorization.

`/dynamic-routing-for-worlds` shows the same shape as the home middle but contains
every entity, including all custom sections, in a scrollable layout. Clicking any
item opens the right panel with its editable details. Across the top, a horizontal
strip of the world's connected books; clicking one opens that book. Creation and
deletion mirror the book's World tab.

**Integration gate.** Both sides are verified against the single contract artifact,
the cross-user suite proves every dynamic route returns `404` for data the user
does not own, `npm run build` passes, and the pre-flight pass confirms contrast,
motion, and viewport fit. This is the adversarial review checkpoint: completeness,
dependency correctness, and faithfulness to the document are all re-checked and any
critical finding is fixed before the plan is declared done.

Verification:

```
npm run generate:api-types
npm run typecheck
npm run test:contract
npm run build
```

Exit criteria: both sides pass against the one artifact, the 404 suite is green,
and the build succeeds.

### Step 13 — Account deletion

**Document section:** Account Menu, Authorization, Proposed DB Schema.

Add `DELETE /api/auth/account` to the canonical OpenAPI contract. The request
requires the exact confirmation phrase `DELETE`; the server derives the target
solely from the validated bearer token and uses server-only Supabase admin
credentials to delete that Auth user. It never accepts an account id from the
client. Deleting `auth.users` relies on the existing database foreign-key cascade
from `profiles` to permanently remove all user-owned worlds, books, chapters,
entities, timelines, relationships, and custom data.

The account menu adds a clearly destructive Delete account action. Its accessible
confirmation dialog explains the full deletion scope, requires the exact phrase,
keeps Cancel available, shows in-progress and error states, clears the local token
after success, and returns to the landing page. The action is irreversible.

Verification: generate API types, validate the 204 contract response, cover the
confirmation UI in Playwright, and run a live temporary-account test proving the
server route deletes only its authenticated caller and the database cascade removes
the caller's data.

Exit criteria: the confirmation cannot submit without `DELETE`; an authenticated
caller can delete only itself; all associated test data is absent after deletion;
and no local session remains.

## 7. Fixed readings of the document

These resolve places where the document's prose and schema are left implicit. They
are the narrowest reading that stays inside the supplied schema.

1. **"Most recently accessed" sections.** The schema records `updated_at` only, so
   section recency on the home screen is ordered by `updated_at`. No new column is
   introduced.
2. **Settings icon.** The document names the icon and describes no settings
   surface. The icon is rendered; nothing is built behind it.
3. **Relationship node positions.** The schema stores no coordinates, so dragged
   node positions are held in local UI state, not persisted.
4. **Free-text statuses.** `places.status`, `items.status`, and
   `relationship_type` are text columns. The document's named options are offered
   as suggestions; manual entry is always available. Character status is the only
   true enum (`alive` / `dead`).
5. **No entity-to-book link in the schema.** An entity has no book foreign key, so
   "open the linked book" resolves to that world's most recently opened book and
   falls back to the world page.
6. **OTP expiry.** The two-minute expiry is an authentication setting rather than a
   schema object; it is configured in Step 7.
7. **Google sign-in must not merge.** If Google sign-in silently linked to an
   existing mail/password account, the document's "account exists already" path
   could never appear. The conflict is detected and refused.

## 8. Gates

- **Contract gate.** Steps 5 through 12 do not begin until Step 4 passes: types
  generate, fixtures validate, and both tracks compile against the same generated
  types.
- **Adversarial review gate.** Step 12 is re-checked against completeness,
  dependency correctness, and faithfulness to the document. All critical findings
  are fixed before completion.
- **Plan mutation protocol.** A step may be split, inserted, skipped, or abandoned
  only with a written reason recorded in this document.

## 9. Mutation log

- Step 2 — the live `supabase db reset` / `supabase db lint` / per-table policy
  smoke tests could not be executed because this host has no Docker, no local
  Postgres, and no `supabase` CLI. The schema was instead applied verbatim from
  the source document into `supabase/migrations/0001_pacific_aurora.sql`, and
  coverage was validated by `tests/db/migration.test.ts`, which counts every
  table, enum, policy, helper function, trigger, and RLS enablement. When a
  Supabase-enabled environment is available, re-run the step's original
  verification commands.
