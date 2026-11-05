# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Pacific Aurora is for solo fiction writers working on long-form manuscripts with detailed fictional worlds. They need to draft books while keeping characters, places, items, relationships, timelines, and custom world concepts consistent and close at hand.

## Product Purpose

Pacific Aurora is a private authoring and worldbuilding workspace that keeps each manuscript connected to a persistent world. Success means writers can stay in the act of writing, retrieve relevant world knowledge, and deliberately carry new facts from prose into that world without surrendering control of either.

## Positioning

The product joins manuscript writing and structured world management in one workspace. Its manuscript-aware AI compares recent prose with the current world, proposes missing facts as evidence-backed cards, and changes world data only after the author explicitly accepts a suggestion. It never rewrites the manuscript.

## Operating Context

Writers organize work by worlds, books, and chapters. They draft and format prose in the Writer, manage world entities and character histories, map character relationships, and record chapter-level timeline points. Work is authenticated and private to the account. Light and Dark themes are selected per browser.

## Capabilities and Constraints

- A world can contain books, characters, places, items, relationships, and user-defined entity types.
- Manuscripts support chapter organization, explicit saving, keyboard saving, and session draft recovery.
- AI reviews the latest 500 words after a pause and periodically while the Writer remains open. Suggestions are optional, session-only cards; Accept applies one typed change and Decline persists for that chapter.
- AI reads canonical world context on the server, never edits manuscript prose, and must not block writing or saving when unavailable.
- Authentication supports email verification, password recovery, and Google sign-in. Incomplete profiles return to onboarding.
- Ownership is enforced through row-level security. Cross-user resource access is indistinguishable from a missing resource.
- Account deletion is deliberate and permanently cascades through the account's worlds, books, chapters, and related data.
- Product copy stays calm and direct. Failure states do not use alarming treatment.

## Brand Commitments

- Product name: Pacific Aurora.
- The experience is serene, private, atmospheric, and author-centered.
- Preserve the existing Pacific Aurora logos at `public/pacific-aurora-logo.svg`, `public/pacific-aurora-logo-light.svg`, and `public/PA-Logo.jpg` unless the owner explicitly approves a replacement.
- Preserve Light and Dark support and the existing preference across routes.
- Do not introduce decorative emoji or em dashes in product surfaces.

## Evidence on Hand

- The implemented product, OpenAPI contract, migrations, and automated tests are the primary evidence for current capabilities.
- The V2 specification at `plans/Pacific Aurora — Project Specification - V2.pdf` governs V2 scope, while `C:/pacificaurora/Pacific Aurora — Project Specification.md` remains the overall scope authority.
- `README.md`, `plans/implementation-status.md`, and `plans/deployment-checklist.md` record implementation and release state.
- No approved testimonials, customer logos, press claims, usage benchmarks, or pricing evidence are present; future work must not fabricate them.

## Product Principles

1. Keep the writer in control of prose and world changes.
2. Make the fictional world persistent, connected, and useful while writing.
3. Protect private work through explicit ownership and secure server boundaries.
4. Let failures remain calm and non-blocking wherever writing can safely continue.
5. Prefer focused authoring workflows over added complexity.

## Accessibility & Inclusion

WCAG 2.2 AA is the product target. Core workflows must remain keyboard accessible, visibly focused, responsive on mobile web, and usable with reduced motion. Theme variants must retain readable contrast, and meaning must not depend on motion or color alone.
