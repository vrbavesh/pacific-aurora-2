# Pacific Aurora V2 Blueprint

Status: implementation and Step 8 local/preview gates complete on `codex/pacific-aurora-v2` as of 2026-10-17. Version 2.0.0 is not merged or deployed. Migrations 0003–0005 exist only on the isolated V2 preview project. Local Ollama was smoked; production Groq configuration and post-deploy smoke await the separate rollout decision. The deployed V1 project is unchanged.

## Authority and scope

The scope authority is `plans/Pacific Aurora — Project Specification - V2.pdf`,
especially its explicit **V2** section on pages 6-8. Pages 1-6 restate the
existing V1 product. Preserve that behavior unless the V2 section changes it.
The existing `plans/pacific-aurora-blueprint.md` remains the V1 build record;
this document is the additive V2 plan. `AGENTS.md` and `CLAUDE.md` define
repository conventions, not product scope.

Work only on `codex/pacific-aurora-v2`. Do not deploy, modify the live
Supabase project, or merge into `main` during implementation.

User-approved security amendment (2026-10-15): V2 accepts Supabase automatic
identity linking only for matching verified email addresses. This supersedes
the V1 Google no-merge/409 rule for V2. Confirm Email must be enabled in both
the preview and production Supabase projects before V2 release. Migration
`0004_auth_resend_limits.sql` adds durable OTP resend controls; apply and test
it in preview first, then apply it to production only as part of the V2 rollout.

### V2 outcomes

1. A more capable TipTap manuscript toolbar, including font family and size.
2. A bottom-left Settings control opening an in-page panel with persistent
   Light and Dark choices; the current dark appearance remains the default.
3. Automatic, pause-triggered AI suggestions from each new 500-word increment,
   globally limited to one request per user per five minutes. The model sees
   the 500-word text window, current world entities, relationships, chapter
   points, and character timeline points. JSON suggestions appear as cards at
   the lower right of Writer. Accept applies one validated change; Decline
   discards it; all unresolved cards disappear when the book/tab closes.
4. The same server integration works with local Ollama during development and
   Groq in production by configuration, without changing product code.

### Preservation invariants

- Keep all existing URLs, auth/onboarding behavior, legal pages, account
  deletion, book/world structure, and 404-on-cross-user authorization.
- Keep `contracts/pacific-aurora.openapi.yaml` as the sole HTTP contract;
  regenerate `src/lib/api/generated.ts` and `schemas.ts`, never hand-edit
  them. Continue the `{ data }` / `{ error }` envelopes and existing status
  meanings. A product major version does **not** imply an `/api/v2` path:
  these changes are additive to the existing internal API.
- Keep thin routes, `getContext`, RLS-scoped repositories, service-layer
  business rules, typed errors, and atomic multi-row writes where required.
  Never send the service-role key or the AI provider key to the browser.
- Keep explicit Save, Ctrl/Cmd+S, sessionStorage draft recovery, and
  unsaved-change warnings in Writer. AI analysis must not silently save or
  alter prose. Existing TipTap JSON must render unchanged.
- Keep one visual family: the current Pacific Aurora typography, navy/teal
  identity, Phosphor icons, motion restraint, and accessible workspace layout.
  Light mode is an alternate token palette, not a redesign.

## Research and design reading

Reading this as: an incremental update to a private authoring workspace for
fiction writers, with a serene, practical visual language. This is
**redesign-preserve**. The frontend taste skill's marketing-page rules apply
only if the landing page is touched; the dense Writer and Settings surfaces
need product-UI patterns, not a new marketing design system.

| Surface | Variance | Motion | Density | Direction |
|---|---:|---:|---:|---|
| Existing landing | 6 | 5 | 2 | Keep current centered 3D hero and copy |
| Writer/settings | 3 | 3 | 6 | Clear controls, stable manuscript focus |
| Suggestion cards | 3 | 3 | 5 | Calm hierarchy, explicit review actions |

- Use the current token layer in `app/globals.css`; add semantic light values
  under one root theme attribute and replace hard-coded dark colors only on
  affected app surfaces. Test both themes, mobile, focus, contrast, and
  reduced-motion. The Settings control stays anchored at the bottom-left of
  the home navigation and opens a small window in the same tab.
- Follow Apple's response, predictability, and agency principles: immediate
  button feedback, spatially anchored Settings panel, no input lock while a
  transition finishes, and no surprise AI writes. Card acceptance has
  confirmation through the resulting data state; declining is reversible only
  until dismissal. Avoid gratuitous spring or glass effects in dense UI.
- TipTap research: its TextStyleKit bundles font-family and font-size
  extensions. Use a constrained font menu and size scale, not arbitrary CSS
  strings from user/AI input. Survey the already-installed StarterKit features
  and add high-value Word/Docs-like controls (headings, lists, underline,
  strike, alignment, link, text color/highlight if compatible) without
  promising full Word parity, pagination, DOCX, or collaboration.
- Ollama and Groq both expose an OpenAI-style chat-completions endpoint:
  local Ollama uses `http://localhost:11434/v1/chat/completions`, while
  Groq uses `https://api.groq.com/openai/v1/chat/completions`. Configure
  a complete base URL (including the provider's path prefix) and append
  only `/chat/completions`. Freeze and test the common request-field subset
  before implementation. The common request/response adapter is
  code-stable, but **URL alone cannot be the only changing value**: model ID
  and Groq credential must also be configured. Use server-only
  `AI_BASE_URL`, `AI_MODEL`, and `AI_API_KEY` (optional for local Ollama).
  No provider-specific branch in application behavior. Validate the returned
  JSON regardless of provider-side structured-output guarantees.

Primary research references:
[TipTap TextStyleKit](https://tiptap.dev/docs/editor/extensions/functionality/text-style-kit),
[TipTap FontFamily](https://tiptap.dev/docs/editor/extensions/functionality/fontfamily),
[TipTap FontSize](https://tiptap.dev/docs/editor/extensions/functionality/fontsize),
[Ollama OpenAI compatibility](https://docs.ollama.com/api/openai-compatibility),
[Groq OpenAI compatibility](https://console.groq.com/docs/openai).

## Contract-first API delta (proposal, not yet edited into OpenAPI)

Consumer: the Writer suggestion panel. Provider: the authenticated Next.js
route backed by an AI service and RLS repositories. The existing OpenAPI file
owns all wire shapes; this table is a review sketch, not a second authority.
The first implementation step must reconcile it with the OpenAPI artifact
**before** provider or consumer code.

| Operation | Input / output | Errors and ownership |
|---|---|---|
| `GET /api/books/{bookId}/chapters/{chapterId}/ai-suggestions/eligibility` | `{ data: { completedMilestone, nextEligibleAt, checkpointVersion } }` | Bearer required; 404 missing/foreign book/chapter; bootstrap on book open/reload and after lost responses |
| `POST /api/books/{bookId}/chapters/{chapterId}/ai-suggestions` | `{ text, wordCount, milestone, checkpointVersion }` -> `{ data: { suggestions: Suggestion[], completedMilestone, nextEligibleAt, checkpointVersion } }` | Bearer required; server reads canonical world context under RLS; 400/422 invalid text or shape, 404 missing/foreign book/chapter/world, 409 duplicate/stale checkpoint (client refetches eligibility), 429 cooldown + `Retry-After`, 502/503 provider failure |
| `POST /api/books/{bookId}/chapters/{chapterId}/ai-suggestions/apply` | `{ suggestion: Suggestion }` -> `{ data: { suggestionId, kind, resourceId } }` | Bearer required; 400/422 unsafe fields, 404 missing/foreign targets, 409 duplicate/stale target; one card, one server-side service action |

`Suggestion` is a **discriminated union**, not an unbounded
`Record<string, unknown>`: target kind (character, place, item, custom
entity, chapter point, character timeline point), action (create/update/add
point), optional opaque target ID, stable server-issued `suggestionId`,
expected target version on updates, and a type-specific allowlisted value
object. The card must show the exact proposed field/value changes; a short
source excerpt may help a writer judge evidence but cannot substitute for
the diff. The model returns proposed data only; the server constructs the
review envelope. IDs remain strings; absent, empty, and null are
distinct. Define max card count, text lengths, and enums in the contract.
The model never receives a direct database-write capability.

The browser sends the V2-specified context JSON, but the server does **not**
trust it as authority: it re-reads canonical world/relationship/point data
through the caller's RLS client before constructing the provider request.
The unsaved 500-word manuscript window is supplied by the browser, bounded and
validated. The server verifies chapter -> book -> world ownership and rejects
mismatches. No arbitrary provider URL comes from the request.

For each analysis response, the provider output is parsed and schema-checked,
target IDs checked against the same world/book, and invalid or unsupported
suggestions omitted. Applying a card revalidates authorization, current
target existence, field allowlists, and custom-section schema; route to
existing services/repositories instead of writing generic JSON into tables.
Each accepted card is atomic. A consumed-ID receipt (ID/result only, no card
content) is recorded in the same transaction as the write, so a lost response
cannot duplicate a create or point. An update uses a compare-and-set
`expectedTargetUpdatedAt` precondition; stale cards return 409 instead of
overwriting a manual edit. Existing CRUD endpoints remain available.

The analysis endpoint does not persist cards. They live only in the open
book's in-memory React state and are discarded on page/tab close or book
navigation. No localStorage/sessionStorage cache for cards.

## Data and runtime boundary

- Existing `chapters.content jsonb` holds TipTap style marks; no conversion of
  old documents. Validate supported document structure, length, size, and
  style values at the API boundary before storing.
- Add a small V2 migration after `0002_atomic_writes.sql` for a durable
  per-user dispatch timestamp, per-chapter analysis checkpoint, and
  consumed-suggestion receipt. It must enforce the five-minute limit across
  serverless instances and prevent duplicate 500-word milestones under
  concurrent requests. RLS must be enabled, but authenticated clients get
  **no direct insert/update/delete grant** on quota/checkpoint/receipt state.
  User-callable routines derive owner from `auth.uid()` and use database
  time and lease tokens. Finalization is service-role-only after the server
  validates the provider response; its owner ID comes from the authenticated
  request context. Both paths are tested against direct REST/RPC bypass. Do
  not reuse the V1 in-memory OTP cooldown pattern. Validation failure before
  provider dispatch consumes no cooldown. Any attempted provider dispatch,
  including timeout or malformed response, consumes the full five minutes;
  only a valid response advances the completed milestone. No automatic
  retry inside the window.
- Count words with one deterministic function shared by the UI trigger and
  server validation. At each new 500-word **total-count milestone** reached
  after a pause, submit the latest 500 words of the current chapter. This is
  a milestone policy, not edit-aware prose diffing: insertions before an old
  boundary can change which words are sent. Deletions never move the
  completed milestone backward. On the first V2 open of an existing chapter,
  initialize its baseline from the saved manuscript's completed 500-word
  milestones; a restored unsaved draft can then cross the next milestone.
  If several milestones accumulate during cooldown, process one eligible
  window per five minutes, not a burst. The server bounds the supplied
  500-word window but cannot independently prove unsaved whole-chapter
  `wordCount`; its durable milestone gate enforces once-per-milestone.
- Include **all** current-book chapter points and current-book character
  timeline points, plus the world entities, custom-section definitions and
  attribute schemas, and named relationship endpoints/values. Gather the
  canonical data with complete paginated/batched reads under RLS. If the
  full snapshot exceeds a documented byte/token budget, return a clear
  context-too-large response **before dispatch** without consuming cooldown;
  never silently truncate or omit one category.
- Cap request bytes, output tokens/cards, and model timeout. Treat
  manuscript and world data as
  untrusted prompt content, isolated from instructions. Redact it from logs.
  Provider failures must not affect saving/writing.
- The new outbound destination must be a server-configured allowlisted
  Ollama/Groq origin to avoid SSRF. Groq credentials stay server-only.
  Review CSP and privacy disclosures before cloud mode: the current policy
  predates sending manuscript/world data to a third party.
- A short, theme-blended message appears in the suggestions panel when a new
  book has only a paragraph under 500 words and the writer pauses. It is
  informational, not an error; do not show it while typing or on every render.

## Dependency graph and one-PR-sized steps

```text
1 Contract and research gate
   ├── 2 Writer formatting
   ├── 3 Theme and Settings
   └── 4 AI checkpoint migration
        └── 5 Provider and analysis service
             └── 6 Apply service
                  └── 7 Writer suggestion UI
2 + 3 + 7 ──> 8 Integration, security, docs, release gate
```

Steps 2 and 3 can proceed independently after Step 1. Steps 4-7 are
sequential because they share AI wire shape, persistence, and apply semantics.
Each step is independently reviewable; all work stays on the same V2 branch.

### Step 1. Contract and compatibility gate

**Context:** Source: V2 PDF pages 6-8. Current contract:
`contracts/pacific-aurora.openapi.yaml`; generation:
`npm run generate:api-types`. Existing Writer:
`src/components/workspace/Writer.tsx`. Strongest reasoning tier.

**Work:** Audit TipTap extensions against pinned package versions and current
StarterKit commands. Decide the bounded toolbar set. Write the three AI
operations (eligibility, analysis, apply), discriminated suggestion schemas,
checkpoint/version and idempotency fields, error responses, and examples
into the OpenAPI contract. Update `plans/pacific-aurora-api-design.md` with
the additive resource, cooldown, and provider-neutral rules. Generate types,
inspect generated diff, and add contract fixtures for success, empty
suggestions, malformed model output, eligibility bootstrap, stale checkpoint,
404, 409, 429, and 503. Freeze one
schema before frontend/backend code moves.

**Verify:** `npm run generate:api-types`,
`npm run test:contract`, `npm run typecheck`, and a reviewed contract
diff. No old path/field removed. **Exit:** both consumer and provider can
type against the same artifact; exact feature matrix and word-count
semantics are recorded.

**Rollback:** Revert this step's additive contract/doc changes before
consumer/provider implementation; never hand-edit generated files.

### Step 2. Rich-text formatting in Writer

**Context:** `Writer.tsx` currently offers Bold, Italic, Bullet List,
Undo, Save; TipTap JSON is already persisted in `chapters.content`.
Default reasoning tier. Depends on 1.

**Work:** Add scoped TipTap extensions and a responsive toolbar with font
family, font size, and the approved formatting controls. Use semantic
labels/pressed states, keyboard access, selection-preserving commands, and
allowlisted fonts/sizes. Keep draft recovery and save semantics. Add
rendering styles for new marks in both themes, plus old-document load tests.
Do not add Word-like features that need a document model change without
explicitly splitting this step.

**Verify:** Writer unit/browser tests for formatting round-trip, mixed
marks, keyboard navigation, draft recovery, Save/Ctrl+S, and old content.
`npm run lint`, `npm run typecheck`, `npm test`. **Exit:** controls
format selected text, persist, reload, and do not regress prose editing.

**Rollback:** Disable new toolbar controls if necessary, but retain
read/write support for every V2 mark already stored. Removing extensions
after users save formatted content could silently strip marks on the
next edit, so test rollback round-trips before removing any schema support.

### Step 3. Light theme and Settings panel

**Context:** Dark tokens are in `app/globals.css`; home navigation is
`src/components/home/SidebarNav.tsx`. Some home classes hard-code dark
colors. Default reasoning tier. Depends on 1.

**Work:** Add bottom-left Settings trigger and accessible in-tab
dialog/popover with Light/Dark choice. Persist preference per browser and
apply it before first paint where feasible. Define semantic light tokens and
replace only relevant hard-coded dark surfaces on home, workspaces, auth,
landing, and legal pages. Keep dark mode's existing character and single
teal accent. Ensure WebGL aurora/background and editor paper remain legible
in both themes. No new account-settings API or table is specified.

**Verify:** Playwright light/dark persistence, keyboard focus/escape,
cross-route theme, mobile overflow, contrast, and reduced-motion; lint,
typecheck, tests, build. **Exit:** every existing route remains usable in
either mode with no theme flash or unreadable surface.

**Rollback:** Default back to dark; retain non-breaking token additions
if necessary.

### Step 4. Durable AI eligibility state

**Context:** V2 page 7 requires each 500-word increment and one request
per five minutes. V1 uses Supabase RLS and SQL migrations.
Strongest reasoning tier. Depends on 1.

**Work:** Add `0003_ai_analysis_state.sql` with owner/chapter foreign
keys, RLS, restricted grants, indexes, cascade behavior, and atomic
reservation/finalization routines. Include consumed-suggestion receipts,
compare-and-set update support, and atomic ensure-timeline-and-add-point
support needed by Step 6. Define exact behavior for existing manuscripts,
new chapters, edits, concurrent tabs, failed calls, time drift, and account
deletion. Keep suggestion contents ephemeral.
Add repository interface, Supabase implementation, and in-memory test
double. Do not apply the migration to live Supabase yet.

**Verify:** migration tests for RLS, denied direct state writes and forged
RPC owner/timestamps, concurrency/idempotency, cooldown, failed-dispatch
accounting, rollback, and cascade; `npm test`. **Exit:** no two
simultaneous tabs or direct Supabase calls can exceed the
one-per-five-minutes rule.

**Rollback:** Roll back only the new V2 state after confirming no V2
traffic; V1 tables and writer content are untouched.

### Step 5. Provider-neutral analysis backend

**Context:** V2 page 7 specifies text and structured world context to
Ollama locally, Groq in production. Current request path is route ->
`getContext` -> service -> RLS repo. Strongest reasoning tier. Depends on 4.

**Work:** Implement the thin authenticated eligibility/analysis routes,
bounded request validation, canonical RLS context builder,
provider-neutral chat-completions adapter, and strict JSON parser. Use
config-only `AI_BASE_URL`,
`AI_MODEL`, `AI_API_KEY`; timeouts and safe error envelopes. Distinguish
ineligible (under 500 words), duplicate, cooldown, and provider failure.
Verify input/context size limits; never log novel text. Keep all
model text untrusted. No browser-to-provider calls.

**Verify:** service tests with mocked Ollama- and Groq-shaped responses,
truncated/malformed/oversized JSON, fake foreign IDs, timeout, cooldown,
and contract-validated serialization; `npm test`, typecheck. **Exit:**
one eligible request yields zero or more safe, typed cards without writing
world data.

**Rollback:** Disable AI route/config only; Writer and V1 services remain
functional.

### Step 6. Suggestion acceptance backend

**Context:** V2 page 7 says Accept adds the proposed entity detail or
important point; Decline never writes. Existing world/entity/point services
and RLS are in `src/server/services` and `repositories`. Strongest
reasoning tier. Depends on 5.

**Work:** Implement the apply route as a typed action dispatcher into
existing services. Revalidate IDs, world/book/chapter membership,
allowlisted fields, and custom-section attribute schema at acceptance
time. Create or update exactly the resource named on the card, one card
per request. Use a stable suggestion ID, transactional consumed-ID
receipt, and compare-and-set version for updates. Character timeline
points need an atomic ensure-timeline-and-add-point operation when no
timeline exists yet; ordinary separate create/add calls are not enough.
Return the typed resource kind and ID for TanStack Query invalidation. Duplicate
apply returns a documented 409 or the original result, never a second
write. Never apply arbitrary model-supplied SQL/patch paths.

**Verify:** unit/contract tests for every suggestion kind, stale target,
cross-user 404, custom attribute rejection, duplicate apply, and no
partial write. Add an opt-in live RLS test with temporary users before
merge. **Exit:** only explicit Accept can mutate owned data, with the
same validation as ordinary CRUD.

**Rollback:** Disable apply route first. If 0005 was applied only to an idle
preview project, its apply function and four version triggers can be removed
in reverse order; after V2 traffic, use a forward migration and preserve
receipt/history state.

### Step 7. Pause-driven suggestion panel

**Context:** `Writer.tsx` has one editor per open chapter; BookWorkspace
lazy-loads Writer. Cards must appear lower-right, pile up during the
book session, and vanish when the book/tab closes. Default reasoning
tier. Depends on 2, 5, 6.

**Work:** Add a debounced pause observer using the shared word counter,
500-word milestones, eligibility bootstrap/reconciliation, durable
checkpoint response, and cooldown display. After reload, a lost response,
a second tab, or draft restoration, re-read the authoritative
eligibility state before dispatch rather than guessing from local state.
Create a compact right-bottom suggestions panel with clear evidence,
Accept/Decline, loading, empty, error, and under-500-word gentle states.
Keep cards in book-session component memory above individual chapter
editors; do not persist them. Use a brief, playful under-500 message
such as "Keep writing. The ideas need a little more to work with."
On Accept,
call the apply endpoint then invalidate the affected world/timeline
queries; on Decline, remove only that card. Avoid covering the manuscript
or mobile Save controls. AI activity never blocks typing or saving.

**Verify:** browser tests for first 499/500 words, pause timing, repeat
increment, five-minute cooldown, multiple open chapters/tabs, accept,
decline, close/discard, provider outage, and mobile layout; lint,
typecheck, tests, build. **Exit:** suggestions are useful but entirely
writer-controlled, and unattended cards vanish on close.

**Rollback:** Hide/remove panel and trigger without altering saved
manuscripts or world data.

### Step 8. Integration, privacy, security, and release gate

**Context:** Existing CI runs lint, typecheck, Vitest, build, Playwright.
The deployed V1 site and live database must stay unchanged until
reviewed. Strongest reasoning tier. Depends on 2, 3, 7.

**Work:** Run full local gates; inspect generated, migration, and
dependency diffs; exercise local Ollama and a configured Groq test
environment with the same fixtures. Measure prompt/context size and
latency. Test two-user live authorization **only in a safe test project
or with disposable accounts**, not the production data path. Review
privacy/terms for third-party manuscript transmission and obtain
approval before changing consent copy. Update README, .env.example,
AGENTS/current-state docs, deployment checklist, and `package.json`
in lockstep under the repository's versioning rule. The V2 feature set
starts the 2.0.0 line; later separate change sets must bump one part
each. Document V2 migration ordering and
rollback. Keep V1.3 live until the V2 branch passes all gates and is
explicitly approved for merge/deploy.

**Verify:** `npm run lint`, `npm run typecheck`, `npm test`,
`npm run build`, `npm run test:e2e`; contract drift check;
dependency audit; light/dark and reduced-motion accessibility; AI
provider smoke; migration RLS/live suites. **Exit:** complete V2
feature matrix, green gates, reviewed privacy disclosure, and a
separate deployment decision.

**Rollback:** Keep the V2 branch unmerged; if a preview environment
was used, disable its AI config and revert only V2 migration after
verifying no live V2 state needs preservation.

## Fixed readings and approval points

1. `once per 500` means a new 500-word total-count milestone after a
   pause, measured per chapter; the latest 500 words form the analysis
   window. It is not an edit-aware diff. The five-minute cap is **per
   user across all books**, consumed by an attempted provider dispatch
   even when that provider fails. No request for a new paragraph under
   500 words. The informational copy is shown only in the new-book case.
2. The client can send the context JSON named by the PDF, but server
   RLS data wins if it disagrees. This prevents a forged client from
   feeding or applying another user's resource.
3. `Accept` is the only write trigger. Suggestions are session-only,
   while eligibility/cooldown checkpoints persist.
4. `URL-only` provider switching is read as **no code change** when
   moving from Ollama to Groq. Environment configuration necessarily
   also changes the model ID and adds a server-only Groq API key.
5. Light/Dark preference is browser-local, because the PDF asks for a
   setting but does not require cross-device sync. No new profile
   property or settings API is added.
6. V2's editor request is a bounded formatting expansion, not a full
   MS Word/Google Docs clone. A precise control list is frozen in
   Step 1 after extension compatibility research.
7. Cloud analysis transmits private manuscript and world data to a
   third party. Privacy/consent language is a release gate and needs
   human review before Groq mode is enabled.
8. Existing security-review findings (notably auth identity linking
   and OTP abuse) are independent V1 risks. Do not silently conflate
   them with V2; reassess them at the release gate.

## Plan mutation protocol

If implementation reveals a spec ambiguity or incompatible provider
behavior, record the decision here before code changes. Split a step
when it no longer fits one reviewable PR. Do not silently drop a PDF
requirement, weaken RLS, persist suggestion cards, or add autonomous
AI writes. Every changed contract shape is reviewed first, followed
by generated types, provider tests, consumer tests, and one end-to-end
path. Keep a dated mutation log below.

### Mutation log

- 2026-10-12: Initial V2 proposal drafted on
  `codex/pacific-aurora-v2`; awaiting approval before Step 1.
- 2026-10-13: User approved implementation. Step 1 began. The apply
  response was narrowed to `suggestionId`, `kind`, and `resourceId`
  rather than a weakly typed union of existing resource schemas; the
  client refetches the authoritative resource after acceptance.
- 2026-10-13: Step 1 completed. Added the additive three-operation AI
  contract, examples, generated client/schemas, response validation,
  contract fixtures, and the bounded Writer feature matrix. No old
  contract path or field was removed.
- 2026-10-13: Step 2 completed. Added the bounded TipTap text-style and
  alignment extensions, responsive accessible Writer controls, an
  HTTP(S)-only link entry, and old-document formatting round-trip
  coverage. The browser test caught and fixed uppercase Ctrl/Cmd+S
  handling. Unit tests, lint, typecheck, build, and the focused Writer
  browser test pass. Light-theme mark contrast is part of Step 3.
- 2026-10-13: Step 3 completed. Added a bottom-left Settings dialog with
  persistent Light/Dark preference, keyboard dismissal and focus return,
  a pre-paint theme bootstrap, semantic light tokens across public and
  workspace routes, and theme-aware Writer marks, graph, and aurora.
  Browser checks cover persistence, reduced motion, mobile layout, and
  WCAG AA contrast across routes. No settings API, migration, or live
  deployment was added. Step 4 is next.
- 2026-10-15: Step 4 implementation added on the V2 branch only. Migration
  `0003_ai_analysis_state.sql` introduces per-user dispatch and per-chapter
  checkpoint rows, ID-only apply receipts, RLS with no direct client table
  grants, and narrow RPCs using database time and row locks. Reservation
  derives owner from `auth.uid()`; finalization is service-role-only and uses
  the server-authenticated owner ID plus its lease token, so direct user RPCs
  cannot falsely mark a provider response valid.
  A saved chapter's first eligibility read is read-only and derives its
  baseline from saved TipTap text. Reservations require the next sequential
  500-word milestone; failed provider calls retain the five-minute cooldown,
  while only server-validated finalization advances the checkpoint. A two-minute
  lease handles abandoned calls, and a receipt-backed timeline-point RPC
  creates its timeline and point in one transaction. Supabase and in-memory
  repositories plus local tests are included. No migration was applied to the
  deployed V1 project.
- 2026-10-15: Step 4 preview verification passed: three guarded live tests covered
  denied direct state access, forged RPC arguments, cross-user isolation, concurrent
  reservation, global cooldown, service-role finalization, idempotent receipt writes,
  and account-deletion cascade on a separate V2 Supabase project. The test uses
  publishable and secret keys. Apply migration 0003 to the deployed project only in
  the approved V2 rollout, before deploying V2 code.
- 2026-10-15: Step 5 completed on the V2 branch. Added authenticated eligibility
  and analysis routes, a complete paged RLS context snapshot capped at 128 KiB,
  and one chat-completions adapter for allowlisted local Ollama and Groq URLs.
  A 20-second timeout, bounded provider response, server-issued card IDs,
  generated-schema card validation, and owned target/version checks keep model
  output untrusted. Failed provider dispatches retain the durable cooldown;
  only usable JSON finalizes a milestone. Local unit/contract/database tests,
  lint, typecheck, and isolated production build pass. Provider smoke and
  preview-project end-to-end analysis remain release checks. Step 6 is next.
- 2026-10-15: Step 6 implementation added on the V2 branch. A strict one-card
  apply service revalidates RLS-scoped context, target versions, custom
  attribute IDs/values, and owned references. Migration 0005 adds one
  receipt-backed transaction for entity and chapter-point cards, reuses the
  existing atomic create/update routines, and advances entity versions for
  subtype-only manual edits. The 0003 timeline-point RPC handles that card
  kind. Same-ID/chapter/kind replays return the original resource ID; conflicting reuse is
  409. Local tests and a guarded preview suite are present. Apply 0005 only
  to the isolated V2 preview project, then run `RUN_PREVIEW_AI_APPLY=1` with
  `PA_AI_PREVIEW_CONFIRM=ISOLATED_V2_PREVIEW` and the existing preview keys
  before marking Step 6 complete or beginning Step 7.
- 2026-10-15: Step 6 preview verification complete. Parenthesized the SQL
  `CASE` expression after Supabase's PL/pgSQL parser rejected the original
  condition. Applied corrected 0005 only to `pa-newbranchtest` through the
  connected Supabase migration tool; its function and all four triggers are
  present. The guarded apply and AI-state suites passed (5 live tests), and
  no temporary users remain. The deployed V1 project remains unchanged.
- 2026-10-17: Step 7 completed on the V2 branch. The Writer now observes
  paused editor text, dispatches sequential 500-word milestones after
  authoritative eligibility reads, and displays in-memory suggestion cards
  with explicit Accept/Decline. Cards persist while the book's chapter tabs
  remain open and disappear on close; cooldown, under-500, empty, loading,
  and provider-error states never block writing or Save. The analysis request
  no longer accepts redundant client world JSON because the server already
  loads canonical context under RLS. Contract types were regenerated. Focused
  browser tests and local lint, typecheck, unit/contract tests, and build pass.
  Provider smoke, preview end-to-end analysis, privacy review, and release
  checks remain in Step 8; deployed V1 is unchanged.
- 2026-10-17: Step 8 local and isolated-preview gates completed. The provider
  prompt now includes the active chapter ID and requests JSON; a 60-second
  timeout is used for local Ollama while cloud requests retain 20 seconds.
  A warm Ollama run produced three valid cards from a 4,867-byte prompt in
  8.7–13.5 seconds. The route-to-provider-to-apply preview test, five AI
  state/apply preview tests, and six two-user authorization groups (54 route
  handlers) pass with disposable users removed. Contract generation is stable;
  lint, typecheck, 73 default tests, build, and 24 browser tests pass.
  Approved legal copy discloses AI processing. README, package, AGENTS, and
  deployment records use the 2.0.0 branch version. Production dependencies
  audit clean; five high dev-tool advisories remain without an upstream
  patched `braces` release. Groq and production rollout were not exercised
  by direction. No V2 change was applied to deployed V1.
