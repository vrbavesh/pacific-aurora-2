# Implementation status

Last reviewed: 2026-10-09.

Scope authority: `C:/pacificaurora/Pacific Aurora — Project Specification.md`.
Implementation order: `plans/pacific-aurora-blueprint.md`.

## Live environment

Verified directly against the live Supabase project on 2026-10-09.

- All 15 tables from `supabase/migrations/0001_pacific_aurora.sql` exist and hold
  real records (profiles, worlds, books, chapters, world_entities, characters,
  custom_entity_types, entity_relationships are populated). The migration is
  fully applied.
- `NEXT_PUBLIC_SUPABASE_URL` is the bare project URL; every auth and data call
  reaches GoTrue and PostgREST.
- `SUPABASE_SERVICE_ROLE_KEY` is configured and used only server-side, for
  sign-in by userid. It lives in `.env.local`, which `.gitignore` covers, and no
  env file is tracked in git.
- Email and password sign-up, sign-in, and the OTP-recovery flow have been
  verified against the live project, and stored records confirm normal operation.

## Current implementation

- Step 10: home navigation now reaches book and world routes. Incomplete profiles redirect to onboarding. Navigation is available on mobile.
- Step 11: `/books/[bookId]` provides Writer, World, Relationships, and Timeline views. TipTap chapter tabs preserve drafts and offer explicit Save, with save-error feedback and tab-scoped draft recovery. Chapter controls cover creation, rename, deletion, reordering, and important points. The relationship canvas uses React Flow with local node positions and stored relationship type/sentiment.
- Step 12 UI: `/worlds/[worldId]` lists every entity section, provides editable detail panels, and links connected books in new tabs. Entity forms cover characters, places, items, custom types/typed fields, and per-book character timeline points. Character deletion warns about timeline/relationship removal and clearing wielded items.
- Supporting API corrections: nested routes check visible parents and matching parent IDs before operations; explicit null values clear nullable fields; invalid JSON returns 400; fractional integer values are rejected.

## Verification boundaries

- Unit tests cover hidden-resource 404 behavior and parent matching with simulated RLS-visible rows. They do not prove the deployed database policies.
- Browser tests cover normal and failed writer saves, draft recovery, chapter navigation, item wielder clearing, onboarding gating, mobile layout, and graph node creation using mocked API responses.
- Live sign-up, sign-in, recovery, onboarding, and normal CRUD have been verified against the real project. Live cross-user route behavior and the two-user RLS tests have not.

## Still pending before blueprint completion

1. **Google authentication.** Supabase still reports `"google": false` and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is empty. Needs a Google OAuth Web client (Client ID plus Secret, Authorized JavaScript origins for the local and deployed hosts, test users on the consent screen), the provider enabled in the Supabase dashboard, and the Client ID placed in `.env.local`. The application side is complete: GIS button, ID-token exchange, the 409 for an email that already owns a password account, and a new identity landing on onboarding with its username prefilled. The conflict rule has not been proven against a real Google identity.
2. Step 2's and Step 12's live two-user RLS suite: every dynamic route returns 404 for data the user does not own, executed against real policies rather than simulated rows.
3. Steps 3-4's runtime response validation. `src/lib/api/schemas.ts` is generated but never imported, so route responses are still only structurally typed, not validated.
4. Step 5's atomic chapter reorder and real database transaction tests. The existing repository still performs multiple updates in two statements per chapter; concurrent reorders can collide on position.
5. Step 6's live cascade verification, atomic multi-statement entity writes, and authoritative custom-attribute validation.
6. Step 7's Supabase OTP expiry configuration, and a distributed resend cooldown. The current cooldown is an in-memory map that resets on every deploy.
7. Step 9's server `Retry-After` handling, and live Google verification.
8. Step 10's documented resolution of section recency: the specification requests recently opened sections; current browser-local access timestamps follow that behavior, while the blueprint's fixed reading says `updated_at`. Do not silently replace access recency with edit recency.
9. Step 12's production performance and accessibility review, and the final adversarial integration gate, including the contrast, motion, and viewport pre-flight on `/books` and `/worlds`.
10. Landing-page scope reconciliation with the specification. The existing landing design has not been replaced as part of workspace implementation.

The presence of the Step 11/12 screens does not close these earlier gates.
