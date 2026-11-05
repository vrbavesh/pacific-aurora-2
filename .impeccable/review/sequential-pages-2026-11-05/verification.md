# Normal resting pages and sequential fades, 2.4.3

Scope: the owner's screenshot and explicit latest flow on
`codex/frontend-design-testing`. No deployment, API, auth or database change.

## Implementation

- Removed the dedicated index-minus-one foreground leaf and its cylindrical curl
  code. Both resting sides now use the same shallow page-block geometry, mirrored
  about the binding. Corrected the mirrored left texture's printed orientation.
- Opening still rotates the page block with the front cover.
- Fade start/peak/end: Writing .355/.37/.43, Worlds .535/.55/.61,
  Connections .695/.71/.77. Each spread is fully open before fade-in begins.
- Page turns: .43–.495, .46–.535, .61–.665, .63–.695, .77–.815,
  .79–.84, .815–.86. No content is visible while any leaf is turning;
  the next fade waits for all its leaves to land.
- Camera stays still during the fades and sweeps only during blank-page turns.
  Pause, reverse scrubbing, keyboard destinations, reduced motion and WebGL
  fallback remain intact. No dependency was added.

## Verification

- Lint, typecheck, optimized isolated build and91 unit tests pass.21 opt-in
  live tests skipped. A new property check samples10,001 timeline positions and
  rejects either visible text on a turning page or text before the book opens.
- Focused landing Chromium suite11/11 passed before the final printed-texture
  orientation adjustment; the final complete suite is recorded below.
- Final Chromium run against the optimized2.4.3 build:40/40 passed, including
  desktop/mobile sequential fades, reverse scrubbing and workspace regressions.
- Eight final desktop/mobile captures completed with no page errors. Peak
  opacity is approximately1, fading opacity .335 with every leaf at rest, and
  turning opacity exactly0. Reverse scrubbing restores the same open spread.
- Version, design narrative/JSON consistency, raised-leaf removal and whitespace
  checks pass. Existing unrelated working files and historical reviews preserved.

Real-device motion smoothness, Safari and Firefox are not checked. Earlier
whole-scene material-fidelity findings are outside this narrow correction; no
new whole-page approval, performance score or production readiness is claimed.
