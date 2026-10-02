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
- `POST /api/auth/signin/resolve` *(client format check; uniform result)*
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
