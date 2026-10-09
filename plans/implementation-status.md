# Implementation status

Last reviewed: 2026-10-09.

Scope authority: `C:/pacificaurora/Pacific Aurora — Project Specification.md`.
Implementation order: `plans/pacific-aurora-blueprint.md`.

## Current implementation

- Step 10: home navigation now reaches book and world routes. Incomplete profiles redirect to onboarding. Navigation is available on mobile; the specified settings icon is present with no settings surface, as the blueprint directs.
- Step 11: `/books/[bookId]` provides Writer, World, Relationships, and Timeline views. TipTap chapter tabs preserve drafts and offer explicit Save, with save-error feedback and tab-scoped draft recovery. Chapter controls cover creation, rename, deletion, reordering, and important points. The relationship canvas uses React Flow with local node positions and stored relationship type/sentiment.
- Step 12 UI: `/worlds/[worldId]` lists every entity section, provides editable detail panels, and links connected books in new tabs. Entity forms cover characters, places, items, custom types/typed fields, and per-book character timeline points. Character deletion warns about timeline/relationship removal and clearing wielded items.
- Supporting API corrections: nested routes check visible parents and matching parent IDs before operations; explicit null values clear nullable fields; invalid JSON returns 400; fractional integer values are rejected.

## Verification boundaries

- Unit tests cover hidden-resource 404 behavior and parent matching with simulated RLS-visible rows. They do not prove the deployed database policies.
- Browser tests cover normal and failed writer saves, draft recovery, chapter navigation, item wielder clearing, onboarding gating, mobile layout, and graph node creation using mocked API responses.
- Both new workspaces require a real configured Supabase project for ordinary use. No auth bypass or demo data is added to the application.

## Still pending before blueprint completion

1. Step 2's live migration reset/lint and two-user tests for every table.
2. Steps 3-4's contract-derived runtime response validation and full HTTP verb conformance suite.
3. Step 5's atomic chapter reorder and real database transaction/concurrency tests. The existing repository still performs multiple updates; the UI exposes it but does not make that implementation atomic.
4. Step 6's complete live CRUD/cascade verification, atomic multi-statement entity writes, and authoritative custom attribute validation.
5. Step 7's Supabase OTP expiration configuration, distributed resend cooldown, and proof that Google authentication refuses email-account conflicts before linking.
6. Step 9's server Retry-After handling and live signup/recovery/Google verification.
7. Step 10's documented resolution of section recency: the specification requests recently opened sections; current browser-local access timestamps follow that behavior, while the blueprint's fixed reading says `updated_at`. Do not silently replace access recency with edit recency.
8. Step 12's live cross-user route suite, production performance/accessibility review, and final adversarial integration gate.
9. Landing-page scope reconciliation with the specification. Existing landing design has not been replaced as part of workspace implementation.

The presence of the Step 11/12 screens does not close these earlier gates.
