# Project Instructions

## Product

Pacific Aurora is a full-stack authoring and world-building application. The current product surface includes authentication, onboarding, worlds, books, chapters, entities, relationships, and character timelines.

## Tech Stack

- Next.js 15 App Router, React 19, and strict TypeScript 5
- Supabase Auth and PostgreSQL through `@supabase/supabase-js`
- OpenAPI 3.1 as the API contract; Orval generates fetch types and Zod schemas
- Tailwind CSS 4, Framer Motion/Motion, React Three Fiber, Zustand, and TanStack Query
- Vitest for contract, migration, and service tests

## Build and Verification

- Development: `npm run dev`
- Lint: `npm run lint`
- Type-check: `npm run typecheck`
- Tests: `npm test`
- Production build: `npm run build`
- Regenerate API artifacts: `npm run generate:api-types`

Before handing off a change, run lint, type-check, tests, and a production build when the change can affect routing or bundling.

## Project Structure

- `app/` — App Router pages, layout, styles, and HTTP route handlers
- `src/components/` — shared and feature-oriented client UI
- `src/lib/api/` — auth/session helpers, API client, errors, and generated artifacts
- `src/server/` — request helpers, service layer, ownership checks, and repositories
- `contracts/pacific-aurora.openapi.yaml` — API source of truth
- `supabase/migrations/` — PostgreSQL schema, triggers, validators, and RLS policies
- `tests/` — Vitest contract, migration, and service suites
- `plans/` — product architecture and API design notes

## Code Conventions

- Use PascalCase for React component files and kebab-case for route segments.
- Prefer the `@/` alias for project-root imports.
- Route handlers should remain thin: build request context, validate input, call a service/repository, and return the standard `{ data }` or `{ error }` envelope.
- Convert expected failures to the typed errors in `src/lib/api/errors.ts`; pass all route exceptions through `errorResponse`.
- Enforce ownership through the authenticated Supabase request client and database RLS. Preserve the deliberate 404 response for inaccessible owned resources.
- Keep persistence behind the repository interfaces in `src/server/repositories/types.ts` so service logic remains testable with in-memory repositories.
- Use async/await. Avoid adding unstructured logging beyond the centralized unexpected-error path.
- Do not manually edit `src/lib/api/generated.ts` or `src/lib/api/schemas.ts`; update the OpenAPI contract and regenerate them.

## Testing

- Test files use `tests/**/*.test.ts` and Vitest.
- Add service behavior tests with the in-memory repositories in `tests/helpers/in-memory.ts`.
- Keep contract and migration guard tests in their existing suites.
- Browser tests use Playwright in `tests/e2e/*.spec.ts`: run `npm run test:e2e` after `npx playwright install chromium`. Their API fixtures test UI behavior, not live Supabase/RLS behavior.

## Environment and Security

- Copy `.env.example` to `.env.local` for local configuration.
- Never expose or commit `SUPABASE_SERVICE_ROLE_KEY`.
- Browser API calls use a bearer token stored under `pacific_aurora_token`; authenticated route handlers validate it with Supabase.
- Keep RLS enabled for every application table and add ownership policies with schema changes.

## Git

- The repository currently uses short, descriptive, implementation-oriented commit subjects.
- `.github/workflows/verify.yml` runs lint, type-check, unit tests, build, and fixture-backed browser tests on pushes and pull requests.
