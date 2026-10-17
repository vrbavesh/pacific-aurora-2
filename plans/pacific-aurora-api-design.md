# Pacific Aurora — API Design

Conventions, resource map, and error model for the Pacific Aurora API. This is the
human-readable companion to `contracts/pacific-aurora.openapi.yaml`; when the two
ever disagree, the OpenAPI artifact wins.

## 1. Resources and URL structure

Nouns, plural, lowercase, no verbs in the path. The authenticated user is implied
by the session, so there is no `/users/{id}` prefix on owned resources.

| Resource | Base path |
|---|---|
| Profile | `/api/profiles/me` |
| Worlds | `/api/worlds` |
| Books | `/api/worlds/{worldId}/books`, `/api/books/{bookId}` |
| Chapters | `/api/books/{bookId}/chapters` |
| Chapter points | `/api/books/{bookId}/chapters/{chapterId}/important-points` |
| Characters | `/api/worlds/{worldId}/characters`, `/api/characters/{entityId}` |
| Places | `/api/worlds/{worldId}/places`, `/api/places/{entityId}` |
| Items | `/api/worlds/{worldId}/items`, `/api/items/{entityId}` |
| Custom section types | `/api/worlds/{worldId}/custom-entity-types`, `/api/custom-entity-types/{typeId}` |
| Custom entities | `/api/worlds/{worldId}/custom-entities`, `/api/custom-entities/{entityId}` |
| Relationships | `/api/worlds/{worldId}/relationships`, `/api/relationships/{relationshipId}` |
| Character timelines | `/api/characters/{entityId}/timelines` |
| Auth | `/api/auth/...` |

Verbs appear only where an action is not a plain CRUD operation:

- `POST /api/auth/otp/resend`
- `POST /api/auth/password/reset`
- `POST /api/auth/forgot-password`
- `POST /api/auth/google`

V2 security amendment: Google ID-token sign-in accepts Supabase's automatic
linking for matching verified email addresses (no application-level 409 after
Supabase has linked). Confirm Email must remain enabled in Supabase. OTP resend
uses a database-backed, atomic two-minute per-email limit and a five-minute
per-IP limit on Vercel. Requests over 2 MiB return 413 before JSON parsing.
- `POST /api/worlds/{worldId}/open`
- `POST /api/books/{bookId}/open`
- `POST /api/books/{bookId}/chapters/{chapterId}/move`

## 2. Methods and status codes

| Case | Code |
|---|---|
| Success (read/update) | 200 |
| Created | 201 + `Location` |
| Deleted / signed out | 204 |
| Malformed JSON or invalid field | 400 |
| Missing/invalid session, or OTP mismatch | 401 |
| Attempt to access another user's resource | **404** (never 403) |
| Duplicate (e.g. existing address, taken userid, 10 custom types reached) | 409 |
| Valid JSON, invalid semantics | 422 |
| OTP resend within 2 minutes | 429 + `Retry-After: 120` |

A cross-user request is deliberately identical to a missing one. Sign-in failures
return one uniform message so the endpoint cannot be probed for which accounts
exist.

## 3. Envelope

Success: `{ "data": ... }`. Collections return `{ "data": [ ... ] }`. Lists of a
user's own data are returned newest-first (`last_opened_at` desc where applicable),
or in explicit `position` order for chapters and custom definitions.

Error: `{ "error": { "code", "message", "details?", "requestId?" } }`.
`details` carries per-field validation errors as
`[{ field, message, code }]`.

## 4. Pagination

The resource sets here are small and user-scoped, so endpoints return the full
collection. If a world grows large, cursor pagination (`?cursor=&limit=`) is added
rather than offset paging; the contract reserves `meta.has_next` and
`meta.next_cursor` fields for that future.

## 5. Filtering and sorting

- `?kind=character|place|item|custom` filters the world entity listing.
- `?sort=name|created_at|updated_at` with a `-` prefix for descending.
- No full-text search is specified by the document, so none is designed in.

## 6. Validation rules worth calling out

- `username` may be absent during onboarding but, once present, must be non-empty
  and is **not** unique. `userId` is **unique** and is what completes onboarding.
- `character_status` is `alive | dead`. `places.status`, `items.status`, and
  `relationship_type` are free text; the UI offers presets but always allows manual
  entry.
- `sentiment` is an integer from 0 to 100, default 50.
- `position` is a non-negative integer and the reorder operation swaps adjacent
  values inside one transaction.
- `wielderEntityId` and `manualWielderName` are mutually exclusive; an item's
  wielder must be an existing character in the same world, and deleting that
  character nulls the wielder.
- A world may define at most 10 custom entity types; the 11th returns 409.

## 7. Authentication and authorization

Sessions are bearer tokens issued on verify/sign-in. Every resource route requires
a session except the auth endpoints. Authorization is ownership-based and enforced
identically by the RLS policies and the `is_world_owner` / `is_book_owner` /
`is_entity_owner` helpers, so the API and the database cannot drift apart. A
denial surfaces as 404, not 403.

## 8. Rate limiting

The OTP resend endpoint is the only throttled surface in the contract: one resend
per 2 minutes, `429` with `Retry-After: 120`. Other endpoints are session-scoped
and small; if abuse emerges, per-session limits are added and reflected in this
document before they ship.

## 9. Versioning

The contract is versioned as a document, not in the URL. A breaking change
(removing/renaming a field, changing a type, changing a URL shape, or changing
semantics behind an existing field) updates the artifact's version and is reviewed
before either side moves. Additive, backward-compatible changes (new optional
fields, new endpoints, new optional query params) do not require a new version.

## 10. V2 additive AI boundary (contract 1.1.0)

The product's V2 specification adds automatic Writer suggestions. The HTTP
contract keeps existing `/api` paths and envelopes; the three new operations
are additive. `contracts/pacific-aurora.openapi.yaml` alone owns their wire
shapes, required fields, nullability, and enum values. This section records
behavioral decisions and does not supersede that artifact.

| Consumer job | Operation | Result |
|---|---|---|
| Reconcile a reload, restored draft, or another tab | `GET /api/books/{bookId}/chapters/{chapterId}/ai-suggestions/eligibility` | Last completed 500-word count, next eligible time, checkpoint version |
| Analyze the latest 500 words after a pause and every five minutes | `POST /api/books/{bookId}/chapters/{chapterId}/ai-suggestions` | Zero to eight typed cards for facts missing from the current world, plus updated eligibility |
| Accept one visible card | `POST /api/books/{bookId}/chapters/{chapterId}/ai-suggestions/apply` | A typed resource kind and opaque ID for query invalidation |
| Remember a declined card across devices | `POST /api/books/{bookId}/chapters/{chapterId}/ai-suggestions/decline` | Chapter-scoped decline confirmation; no world write |

- The analysis body carries plain text, current chapter word count, milestone,
  and checkpoint version. The server fetches the PDF-specified world JSON
  under RLS, including all world entities and custom definitions, named
  relationship endpoints, and chapter and character timeline points **for the
  active book**. Browser-supplied world JSON was removed in Step 7 because the
  server never trusted or used it.
- A 500-word *total-count milestone* is completed only after a valid provider
  response. The text sent at that milestone is the latest 500 words in the
  active chapter. Existing saved manuscripts establish a baseline on first
  V2 open. Deletions do not reduce the checkpoint. This is not an edit-aware
  prose diff. The server verifies the bounded text window and monotonic
  milestone, but cannot prove the count of unsaved prose it has not seen.
- One actual provider dispatch per authenticated user per 300 seconds,
  across books and server instances. Failed dispatches consume the cooldown
  but do not advance the milestone. Invalid requests or oversized full
  context rejected before dispatch do not consume it. A cooldown response
  uses 429 and a dynamic integer `Retry-After` (1-300 seconds). A stale
  checkpoint or duplicate milestone uses 409; the consumer then re-reads
  eligibility. Provider failure is 502/503 with a calm error envelope.
- The model output is data. Each card is one of six typed kinds:
  character, place, item, custom entity, chapter point, or character
  timeline point. Entity cards can create or update; point cards only add.
  An entity create requires a name and null target/version; an update
  requires a target ID and its expected `updatedAt`. The server validates
  these conditional rules even though some existing `*Input` component
  schemas make individual change fields optional. The card shows the exact
  proposed values. Unrecognized fields, invalid target IDs, and malformed
  provider JSON are never passed to the consumer as valid suggestions.
- Apply requires explicit user action. The server re-checks ownership,
  chapter/world membership, field allowlists, current target version, and
  custom attributes. An accepted card is an atomic write with a consumed
  suggestion-ID receipt. Reusing an ID in the same chapter and kind returns
  the original result without a second write; another chapter or kind is 409.
  A stale entity update returns 409 rather than overwriting a later manual
  edit. No card content is persisted; unresolved cards remain in book-session
  UI memory only.
- Cross-user access remains 404, not 403. The request cannot set owner ID,
  provider URL, model, or credential. Ollama and Groq share the server's
  chat-completions adapter; `AI_BASE_URL`, `AI_MODEL`, and `AI_API_KEY`
  are server-only configuration. The browser never talks to the model.
- Complete canonical context is required. If its serialized size exceeds
  128 KiB, return a 422
  `context_too_large` before dispatch. Never silently truncate the world
  or drop a point category.

The Writer formatting expansion needs no new HTTP operation: the existing
chapter `content` remains TipTap JSON. The Step 1 control set is font family,
font size, heading level, ordered list, underline, strike, alignment, link,
text color, and highlight, in addition to Bold, Italic, Bullet List, Undo,
and Save. Use a constrained font/size/color menu. Existing chapter JSON must
round-trip without losing marks.

The pinned `@tiptap/starter-kit@3.31.4` already includes headings,
ordered lists, underline, strike, and links (verified in its installed
`dist/index.js`). Step 2 needs matching-version
`@tiptap/extension-text-style` for TextStyleKit's font family, font
size, color, and background color; `@tiptap/extension-text-align` for
paragraph/heading alignment. Prefer TextStyleKit's background color
over another highlight mark so the toolbar has one color styling model.
The proposed font menu is Newsreader, Geist, Georgia, Arial, and Courier
New; the size menu is 14, 16, 18, 20, 24, and 30 px. Alignments are
left, center, and right. Do not offer unrestricted CSS, arbitrary font
URLs, or pasted `javascript:` links.

References:
[TipTap TextStyleKit](https://tiptap.dev/docs/editor/extensions/functionality/text-style-kit),
[TipTap text alignment](https://tiptap.dev/docs/editor/extensions/functionality/textalign),
[Ollama compatibility](https://docs.ollama.com/api/openai-compatibility),
[Groq compatibility](https://console.groq.com/docs/openai).
