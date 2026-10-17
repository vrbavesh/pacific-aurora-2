# Security Review — Pacific Aurora (PA-2.0)

**Reviewer:** security-reviewer subagent
**Date:** 2026-10-10
**Mode:** static / code-only, read-only
**Scope:** `app/api/**` (38 routes), `src/server/**`, `src/lib/api/**`, `supabase/migrations/0001–0002`, `next.config.ts`, `package.json` / lock, workspace components.

---

## Severity summary

| Severity | Count | Notes |
|---|---|---|
| Critical | 0 | No confirmed pre-auth or cross-user data compromise |
| High | 2 | Google identity-conflict chain (config-dependent); unauthenticated OTP/resend flood + memory growth |
| Medium | 4 | No app-level auth rate limiting; production CSP `unsafe-inline`; unbounded field/body sizes; provider error passthrough (folded into Low) |
| Low | 4 | Enumeration (signup email, profile handle), raw Supabase messages, token in localStorage, DELETE-204 uniformity |
| Informational | — | Clean areas + runtime-verification list |

**No Critical confirmed.** The authorization / IDOR layer is clean — see "Clean areas" at the end for the evidence.

---

## HIGH

### H1. Google sign-in identity check runs *after* GoTrue has already established/linked the session — bypassable, and opens an email-squat / lockout chain

**Files:** `app/api/auth/google/route.ts:11-20`, `src/lib/api/session.ts:4-10`
**Status:** Confirmed in code; exploitability depends on two Supabase project settings (needs runtime verification).

**Issue.** The route exchanges the Google credential first, then rejects the result:

```ts
11: const { data, error } = await client.auth.signInWithIdToken({ provider: "google", token: credential });
15: if (error) throw new UnauthorizedError("Google sign-in failed");
17: const providers = (user.identities ?? []).map((i) => i.provider);
18: if (providers.includes("email")) throw new ConflictError(...);
```

The mere fact that this branch exists proves GoTrue **auto-links** identities in this project (a Google login on an address that already has an `email` identity returns the *existing* user, not an error). By the time the 409 is thrown, the linking side effect has already been committed server-side. And nothing protects the underlying GoTrue endpoint itself: the anon key is a public build-time constant (`NEXT_PUBLIC_SUPABASE_ANON_KEY`, per `README.md:104`), so an attacker can call `POST https://<project>.supabase.co/auth/v1/token?grant_type=id_token&provider=google` directly and never see the app's 409 check.

**Attack sketch (registration squat / lockout):**

1. Attacker calls `POST /api/auth/signup` with `{ "email": "victim@gmail.com", "password": "P" }` — an *unconfirmed* user record now exists for the victim's address.
2. Victim later tries `POST /api/auth/google` with their genuine Google credential. GoTrue links the Google identity onto the attacker-created record and returns a session; the app discards it with `409 "An account with this email already exists"`.
3. The victim can never use Google sign-in (their email is permanently shadowed), and the attacker holds the only confirmed-path credentials to that record.
4. If the project has **"Confirm email" disabled**, the attacker's record is auto-confirmed and step 2's link gives the attacker full password access via `POST /api/auth/signin` on the account the victim believes is theirs.

**Fix:**

- **Primary:** turn off automatic identity linking in Supabase (Authentication → Providers → *Manual linking* / "do not link accounts with the same email"), and require verified-email matching. This makes step 2 impossible rather than merely cosmetic.
- **Secondary, at the app layer:** refuse the exchange before GoTrue can link — e.g. use the admin client to look up the email's existing identities and reject *before* `signInWithIdToken`, or switch to a `signUpWithIdToken`-style flow that cannot merge. Also surface the conflict to the Google-victim as a recovery path ("this email already has an account — reset its password instead"), so squatted users aren't locked out.

---

### H2. `/api/auth/otp/resend` is the app's only anti-abuse control: in-memory `Map`, per-instance, no eviction, no IP scope

**Files:** `src/server/auth/resend-cooldown.ts:3-14`, `app/api/auth/otp/resend/route.ts:15-16`
**Status:** Confirmed in code.

**Issue (two defects in one):**

1. **The `Map` never deletes entries** (`checkResendCooldown` only `get`/`set`, `src/server/auth/resend-cooldown.ts:6-14`). Every distinct `type:email` key added is retained forever — there is no TTL sweep and no size cap. On a long-running self-hosted `next start` process this is unbounded heap growth driven by unauthenticated input.
2. **The key is attacker-chosen and per-instance.** The cooldown is scoped to a process's local memory, so on any multi-instance / serverless deploy it does not exist; and even in one process, distinct emails are distinct keys, so it throttles none of the actual flood vectors.

**Attack sketch:**

```
for i in 1..10_000_000: POST /api/auth/otp/resend {"email":"rand-$i@x.com","type":"signup"}
```

Each request mutates a fresh Map entry (memory growth, DoS), and every request also pushes a send through Supabase's mailer — an email-bombing / quota-exhaustion primitive that can also starve a *victim's* legitimate codes if Supabase's per-address send quota is consumed by the attacker.

**Fix:**

- Replace the in-process `Map` with a shared store (Upstash/Redis `SET key 1 EX 120 NX`), keyed on `type:hash(email)` **and** the client IP, with hard eviction.
- Add a global per-IP rate limit on *all* auth routes (see M1); cap `Map` size / add a sweeper if any in-memory store is retained.
- Respect `Retry-After` semantics so genuine clients back off rather than retry-loop.

---

## MEDIUM

### M1. No application-level rate limiting or brute-force protection on any auth endpoint

**Files:** `app/api/auth/signin/route.ts:32-35`, `app/api/auth/otp/verify/route.ts:16-20`, `app/api/auth/password/reset/route.ts:14-18`, `app/api/auth/signup/route.ts:18`, `app/api/auth/forgot-password/route.ts:11`
**Status:** Confirmed in code that zero limits exist; residual risk depends on Supabase project rate-limit settings (needs runtime verification).

**Issue.** Every credential-bearing route is unthrottled at the app. The most exposed are:

- **OTP verify** — 6-digit code (`app/signup/page.tsx:264`), attempted with no per-account or per-IP counter. GoTrue's default OTP validity is long (commonly 24 h) and its per-IP `rate_limit_verify` default is order 15–30 per 5 min per IP; from a small proxy pool the 10^6 space is brute-forceable well inside validity.
- **Password sign-in** — unlimited attempts per account (behind a uniform 401, which is good for silent enumeration but provides no lockout).
- **Reset flow** — same 6-digit OTP surface via `verifyOtp({ type: "recovery" })`.

**Attack sketch:** `POST /api/auth/otp/verify {"email":"victim@x.com","otp":"000000"}` walked over the code space via rotating source IPs.

**Fix:** Per-account + per-IP attempt counters (e.g. 5 OTP attempts, 10 password attempts, then exponential backoff / lockout), implemented in shared storage so it survives instance boundaries; verify the Supabase project's `rate_limit_verify`, `rate_limit_token_refresh`, and `mailer_otp_exp` values and tighten as a second layer.

---

### M2. Production CSP ships `script-src 'unsafe-inline'`, which disables the CSP as an XSS mitigation

**File:** `next.config.ts:18`
**Status:** Confirmed in code.

**Issue.** `"script-src 'self' 'unsafe-inline' ..."` — in production this permits any injected inline script or inline event handler to execute, so the CSP cannot act as a containment layer for a future HTML-injection bug. (The rest of the policy is solid: `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, `form-action 'self'`, scoped `connect-src`.) Next.js App Router *can* support nonce-based CSP — `'unsafe-inline'` is a trade-off, not a requirement. `style-src 'unsafe-inline'` is also present (CSS-exfiltration defense only).

**Fix:** Serve a per-request nonce and use `'nonce-<r>' 'strict-dynamic'` for `script-src` (drop `'unsafe-inline'` in production reads of the header); keep `'unsafe-inline'` for `style-src` only. This also matters because the access token lives in `localStorage` (L4) — the CSP is the only barrier between an injected script and full session theft.

---

### M3. No server-side size/shape limits on user-controlled text or JSON bodies

**Files:** `src/server/http.ts:3-11` (`readJson` — unbounded read of the whole body), `app/api/profiles/me/route.ts:23-28` (username: only `typeof string` + non-empty), `app/api/worlds/route.ts:21` etc. (names), `app/api/books/[bookId]/chapters/[chapterId]/route.ts:27-34` (chapter `content` — any JSON object, any depth/size), `app/api/books/[bookId]/chapters/[chapterId]/important-points/route.ts:26-29` (point text)
**Status:** Confirmed in code. The only limits are client-side HTML attributes (`app/onboarding/page.tsx:134` `maxLength={50}`), which are trivially bypassed.

**Issue.** `profiles.username` has no DB length cap either (`supabase/migrations/0001_pacific_aurora.sql:36-50` only constrains non-empty). A user can `PATCH /api/profiles/me {"username":"<10 MB>"}` and persist it; names, point text, and chapter documents have the same unbounded shape. Combined with per-row response payloads, this is storage amplification and render-path cost on every subsequent load (e.g. `AccountMenu.tsx:145` re-renders the username on each header render).

**Fix:** Enforce limits at the boundary: `Content-Length` cap / `req.text()` length check in `readJson`; `requireString(body, f, { max })`-style validators; DB `check (length(username) <= 50)` and equivalents for names/points; a JSON depth/size validator for `content` (e.g. reject > 1 MB / depth > 32, optionally validate against the TipTap schema).

---

### M4. DELETE endpoints return `204` even when RLS deleted nothing (asymmetric with the rest of the API's 404 contract)

**Files:** `src/server/services/index.ts:168-170` (`removeEntity` has no `owned()` pre-check), `src/server/repositories/supabase-entities.ts:480-486`, `src/server/repositories/supabase.ts:260-266` (`removePoint`)
**Status:** Confirmed in code. Not a data-exposure oracle (a genuinely absent id also yields 204), but it is the one place the app's otherwise-consistent "hidden = 404" surface breaks. Listed Medium for contract-consistency / robustness of future changes, not for data loss — e.g. the client at `WorldEntities.tsx:254-261` assumes success.

**Fix:** Mirror the `ownedOr404` pattern used elsewhere: `await owned(repo.getEntity(entityId)); await repo.removeEntity(entityId)` for custom entities (and an equivalent existence check for point deletion), so the route uniformly returns 404 for non-owned ids.

---

## LOW

### L1. Email-account enumeration via `/api/auth/signup` 409

**File:** `app/api/auth/signup/route.ts:21-23`

`{"email":"victim@x.com","password":"x"} → 409 "An account with this email already exists"` vs. `201` for unknown addresses. The other auth routes are carefully uniform (signin `app/api/auth/signin/route.ts:30`, forgot-password `app/api/auth/forgot-password/route.ts:16-18`), so this one leaks.

**Fix:** always return 201 + generic "verification code sent" (Supabase still sends nothing for existing confirmed users, or send a "someone tried to register your email" notice), i.e. make signup response-indistinguishable.

### L2. Authenticated user-handle enumeration via `/api/profiles/me` 409

**File:** `src/server/repositories/supabase-profile.ts:52-53`

Any signed-in user can test candidate handles by PATCHing `{"userId":"alice"}` and observing `409 That userId is already taken`. Handles are the sign-in identifier, so this enumerates valid login names (password still required).

**Fix:** rate-limit profile updates, and return a uniform `validation_error` ("handle unavailable") without implying which other value collided — or make handles non-guessable / minted.

### L3. Raw provider error text passed to clients

**Files:** `app/api/auth/signup/route.ts:26`, `app/api/auth/otp/resend/route.ts:20,25`, `app/api/auth/password/reset/route.ts:27`, `app/api/auth/otp/verify/route.ts:29`

`ApiError(status, "…", m)` forwards Supabase's raw `error.message` after only the already-existing / rate-limit cases are special-cased. Messages such as `Unable to validate email address: Invalid format` / DB-flavored 5xx text diagnose the backend for an attacker. Internal failures are correctly masked by `errorResponse` (`src/lib/api/errors.ts:66-68`), so this is the remaining thin slice.

**Fix:** whitelist client-safe messages; return a generic code + log the original server-side.

### L4. Session token persisted in `localStorage`

**File:** `src/lib/api/client.ts:3-16`

The Supabase access token is stored in `window.localStorage` (`pacific_aurora_token`), readable by any script that ever runs on the origin. No HttpOnly-cookie / session alternative exists (confirmed: no `cookies()` / `next/headers` usage anywhere). This raises the value of M2.

**Fix (if acceptable):** move the token to an HttpOnly, Secure, SameSite=Lax cookie set by the route handlers on sign-in; otherwise document the trade-off and keep the nonce-based CSP.

---

## Informational

- **Dependencies:** `npm audit` (live registry) reports the runtime dependency set clean — `next 15.5.27`, `react`/`react-dom 19.1.0`, `@supabase/* 2.117.2`, `zod 4.6.5`, `three` 0.186.1 (0.170.0 present transitively via drei), `framer-motion`/`motion` 14, `@xyflow/react` 12.12.0`, `@tiptap/*` 3.31.4 all have no known advisories. The one advisory (`braces` stack-exhaustion DoS, GHSA-vfj7-8cjw-p6xm) is **dev-only** via `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces` and is not reachable from request handling; bump when convenient.
- **Password policy:** `/api/auth/signup` accepts any non-empty password (`app/api/auth/signup/route.ts:16`) and relies on the Supabase project minimum (default 6) while the UI enforces 8. Align explicitly (pass `options.password_length`-independent check or verify project min ≥ 8).
- **10-section cap race:** `customEntityTypeService.create` (`src/server/services/index.ts:133-137`) enforces the cap via a read-then-insert; concurrent requests can overshoot. Business-logic only.
- **Chapter positions race:** `ChapterRepositoryImpl.create` computes `position = existing.length` (`src/server/repositories/supabase.ts:205-210`) without the atomic RPC used for moves — concurrent creations collide on `unique(book_id, position)` → 500. Not security.

---

## Clean areas (verified, one line each)

- **Authorization / IDOR (all 38 routes): clean.** Every data route runs `getContext` → `requireUser` (JWT verified via `auth.getUser()`) → `authorizeResourcePath`; every repository query is RLS-scoped (`src/lib/api/session.ts:12-23` forwards the user token). Each path parameter (books, chapters, chapter points, world entities, timelines, timeline points, important points, relationships, custom types/attributes) was traced through `src/server/resource-scope.ts:5-54` + `ownedOr404`: parent relations (chapter→book, point→timeline, timeline→character) are all verified, and the raw-`req.url` vs. decoded-`ctx.params` mismatch (percent-encoded / `%2F` segments) was checked — the mismatch fails *closed* (404), never open. `adminClient` is used only in signin handle resolution and `auth.admin.deleteUser` (identity taken from the verified JWT, never the request body). No cross-user read/write found, code-confirmed.
- **SQL injection: clean.** No string-built SQL anywhere; all access is PostgREST parameterized calls; the three RPCs accept typed args only (`supabase/migrations/0002_atomic_writes.sql`).
- **Mass assignment: clean.** Every PATCH route builds an explicit field whitelist before calling the service/repo; `owner_id`/`world_id`/`entity_type_id`/`id` are never client-settable, and RLS `with check` policies back this up.
- **XSS: clean (confirmed sinks).** No `dangerouslySetInnerHTML`/`innerHTML` anywhere; TipTap renders ProseMirror nodes (and its Link mark sanitizes hrefs via `isAllowedUri`, verified in `node_modules/@tiptap/extension-link/dist/index.cjs:313,462`); React Flow labels are text/SVG; all other user text renders through JSX text nodes.
- **Prototype pollution / SSRF / open redirect / command injection: clean** — `JSON.parse` semantics nullify `__proto__` payloads, there are no outbound requests built from user input, and all redirects are static paths.
- **Secrets: clean.** Service-role key is server-only (`src/lib/api/admin.ts:5`, no `NEXT_PUBLIC_` prefix), `.env*` gitignored, nothing sensitive in git history, and `handle_new_user` only trusts `raw_user_meta_data.name` (length-capped by the profile CHECK; rendered via escaped JSX).
- **RLS & `security definer` hardening: clean.** Every one of the 15 tables has select/insert/update/delete policies consistent with the verbs the app uses; all definer functions (`is_world_owner`, `is_book_owner`, `is_entity_owner`, `handle_new_user`) set `search_path = public`; trigger functions run `security invoker` where they touch user data; the `unique(id, owner_id)` composite-key ownership trick is applied consistently; `update_world_entity_atomic` restricts patch keys to a fixed set, and the custom-attribute validator enforces key/type/option integrity.
- **Error disclosure:** `errorResponse` (`src/lib/api/errors.ts:50-69`) returns `internal_error` with no internals for unmapped exceptions (only `console.error`), which is correct — the L3 passthroughs are the sole exception.

---

## Needs runtime verification (no server available)

1. Supabase project settings that decide H1's blast radius: **Confirm email** on/off, and **automatic identity linking**.
2. Supabase auth rate limits and OTP lifetime (`rate_limit_verify`, `mailer_otp_exp`, per-IP signup/token limits) — decides whether M1's brute-force surface is practical.
3. Whether `custom_entities.attributes` / `custom_entity_attributes.options` GIN-indexed payloads add measurable amplification in practice once M3's size caps land.
4. Deployment topology for H2 (single long-running process vs. serverless) — determines real-world impact of the `Map` growth, and whether nonce-based CSP is drop-in (App Router streaming) for M2.
