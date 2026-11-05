---
name: Pacific Aurora — Manuscript Architecture
description: A white book becomes the entire experimental landing page, then reveals its world.
colors:
  ground: "#fafaf8"
  ink: "#272b2b"
  muted: "#626764"
  page-ink: "#313733"
  page-muted: "#606963"
  static-paper: "#f4f4ef"
  dark-ground: "#161a1a"
  dark-ink: "#f1f0eb"
  dark-muted: "#bfc5c1"
typography:
  display:
    fontFamily: "Geist, sans-serif"
    fontSize: "clamp(40px, 4.85vw, 70px)"
    fontWeight: 450
    lineHeight: 1.02
    letterSpacing: "-0.04em"
  side-heading:
    fontFamily: "Geist, sans-serif"
    fontSize: "clamp(36px, 4.7vw, 72px)"
    fontWeight: 400
    lineHeight: 1.03
    letterSpacing: "-0.04em"
  finale:
    fontFamily: "Geist, sans-serif"
    fontSize: "clamp(36px, 4.5vw, 70px)"
    fontWeight: 450
    lineHeight: 1.08
    letterSpacing: "-0.04em"
  body:
    fontFamily: "Geist, sans-serif"
    fontSize: "clamp(14px, 1.4vw, 17px)"
    lineHeight: 1.65
  page-heading:
    fontFamily: "Geist, sans-serif"
    fontSize: "32px"
    fontWeight: 450
    lineHeight: 1.05
    letterSpacing: "-0.035em"
  page-subheading:
    fontFamily: "Geist, sans-serif"
    fontSize: "19px"
    fontWeight: 450
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  page-body:
    fontFamily: "Geist, sans-serif"
    fontSize: "14px"
    lineHeight: 1.65
  page-definition:
    fontFamily: "Geist, sans-serif"
    fontSize: "13px"
    lineHeight: 1.6
  wordmark:
    fontFamily: "Geist, sans-serif"
    fontSize: "clamp(18px, 1.65vw, 24px)"
    fontWeight: 450
    letterSpacing: "-0.04em"
  action:
    fontFamily: "Geist, sans-serif"
    fontSize: "clamp(12px, 1.2vw, 14px)"
  chapter-label:
    fontFamily: "Geist, sans-serif"
    fontSize: "12px"
  navigation:
    fontFamily: "Geist, sans-serif"
    fontSize: "clamp(12px, 1vw, 14px)"
rounded:
  pill: "999px"
  circle: "50%"
spacing:
  compact: "8px"
  small: "12px"
  medium: "20px"
  large: "24px"
  page: "28px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
    typography: "{typography.action}"
    rounded: "{rounded.pill}"
    padding: "12px 24px"
  physical-page:
    backgroundColor: "transparent"
    textColor: "{colors.page-ink}"
    padding: "22px 20px"
    width: "300px"
  static-page:
    backgroundColor: "{colors.static-paper}"
    textColor: "{colors.page-ink}"
    padding: "28px"
    width: "100%"
  chapter-button:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.chapter-label}"
    padding: "10px"
  motion-control:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    rounded: "{rounded.circle}"
    height: "42px"
    width: "42px"
---

# Design System: Pacific Aurora — Manuscript Architecture

## Overview

**Creative North Star: "Manuscript Architecture"**

Version 2.4.3 refines the complete white-book landing at / on codex/frontend-design-testing with the owner's approved Cinematic Orbit direction. A dimensional white volume rests on a beveled board, rises through a wider camera arc beside restrained copy, and opens into readable product pages. The opening page block rotates with the cover. Both reading pages rest normally, with no raised foreground leaf. Each spread fades its content in and out before the seven bending leaves turn; the camera pulls back around the castle before a centered invitation appears outside the book. FAQ and a minimal legal footer remain the only sections after the journey.

The owner's explicit correction, recorded in .impeccable/landing-direction.md, supersedes both earlier static compositions and the 2.3.0 hero followed by separate product sections. The visual world is now white on white, charcoal text, soft dimensional shadows, and restrained dark actions, with the castle providing the final color release. The former sculpture row, editable sample, world split, relationship graph, and separate closing scene are removed, not retained as component patterns.

The approved three-frame reference is animation-plans/book-refinement/.impeccable/mocks/03-cinematic-orbit.png. It governs the closed book, readable spread, and castle keyframes as one motion/material contract, not three separate sections. The owner's latest 2026-11-05 correction removes the raised foreground sheet and makes the sequence strictly open, fade in, fade out, then turn. It supersedes the previous overlapping-fade choreography without establishing that any historical reproduction gate passed.

This document governs only app/page.tsx and src/components/landing/. Auth, home, Writer, worlds, and other workspaces retain their existing global systems. The landing uses the plain-text Pacific Aurora wordmark and the existing shared browser theme preference. Existing logo and raster assets elsewhere in the repository are unaffected; the current landing ships no raster imagery.

**Key Characteristics:**

- One continuous, reversible white-book journey uses cinematic transitions and scroll-linked content fades.
- Semantic Writing, Worlds, and Connections content sits on physical page planes.
- Quiet neutral interface colors let the dimensional book and final castle carry the scene.
- Curved layered paper and seeded cloth/fiber relief give the live geometry its material detail.
- Pause preserves the current scene; reduced motion and WebGL failure expose all reading pages in a shorter layout.

## Colors

The interface is neutral and material-led. Frontmatter values are normative for this landing only.

### Primary

- **Charcoal Ink** (ink): text and signup fills in Light mode. Buttons reverse the ground and ink roles rather than introducing a separate accent.

### Neutral

- **Studio Ground** (ground): the continuous near-white landing backdrop around the white board and book.
- **Quiet Gray** (muted): introductory prose, FAQ answers, and secondary details.
- **Page Ink** (page-ink) and **Page Gray** (page-muted): semantic page content remains dark on the light physical leaves in either theme.
- **Flat Paper** (static-paper): the solid reading surfaces used when reduced motion is requested or WebGL fails.
- **Night Studio** (dark-ground), **Pale Ink** (dark-ink), and **Soft Pale Gray** (dark-muted): the corresponding Dark interface roles. They do not recolor the white book, board, or its reading pages.

**The Material Contrast Rule.** Swap the interface ground and ink together, including the signup fill and text. Preserve dark page text on the light physical book and flat reading pages. In Dark mode, keep a full-width interface ground beneath the centered finale's text, action, and focus outlines while the book and board remain white.

## Typography

**Interface Font:** Geist from the existing next/font configuration, with a sans-serif fallback. Navigation, outside copy, and semantic page content share this family. There is no editable manuscript sample or Times New Roman landing role in this revision. Root fonts used elsewhere in the application remain outside this document.

The book cover's procedural CanvasTexture uses the platform's Georgia face for printed decoration. This lettering is part of the 3D material, not the product's body-copy font or a new font dependency.

### Hierarchy

- **Display:** the display role introduces the book. Mobile uses (clamp(36px, 10vw, 52px)).
- **Side heading:** the side-heading role flanks the lifting volume. Mobile uses (clamp(25px, 7vw, 36px)).
- **Finale:** the finale role centers the invitation beneath the castle; mobile uses (36px). The static finale uses (40px).
- **Body:** the fluid body role accompanies the introduction; mobile uses (14px). Side copy uses (15px) with leading (1.7), or (11px) with leading (1.55) on mobile. Finale copy uses (16px), or (13px) on mobile.
- **Page hierarchy:** page-heading names Writing, Worlds, or Connections; page-subheading introduces the explanation; page-body and page-definition carry product details. Definition terms use weight (550). The page foot uses (9px), while decorative left-page titles use (43px).
- **Wordmark and navigation:** the fluid wordmark role uses (20px) on mobile. Header links use the fluid navigation role, with an explicit mobile size of (12px). Chapter buttons use chapter-label.
- **Action:** the action role reduces to (13px) on mobile. It is the same signup style in the introduction and finale.

## Layout

The journey occupies (1100svh) on desktop and (1200svh) at the (767px) mobile breakpoint. A sticky stage fills (100svh), with a minimum height of (620px) on mobile. Introductory copy begins at (21%) from the top and (5%) from the left, occupying (36%) of the stage. The header shares those side gutters and uses a fluid height of (clamp(64px, 8.2vh, 84px)). During the lift, two side-copy regions flank the volume. The finale centers outside the book at the bottom of the stage.

The camera moves into the spread, stays still while content fades, and follows the turning leaves only after their content is gone, followed by a lower pullback around the castle. No idle scroll interval is inserted between content fades and page turns. Closed-book scale responds to aspect ratio, while the narrow camera below (1000px) follows the right page rather than shrinking both pages into one view. The page projection factor responds to aspect ratio, clamped between (1.6) and (2.5). At (767px) and below, intro copy centers with (24px) side gutters, while lift copy uses two narrow columns.

Reduced motion or WebGL failure removes the long pinned layout. A relative introductory stage is (650px) tall on desktop and (520px) on mobile. The three flat reading pages follow in a grid with a maximum width of (1100px), becoming one column on mobile, then a centered static finale. No image fallback is used.

FAQ follows the journey in a centered column with a maximum width of (880px), desktop padding (130px 32px 110px), and mobile padding (90px 24px). The legal footer wraps naturally. The focus-revealed skip link jumps directly to FAQ. Eight keyboard chapter controls stay outside the visible composition until focused.

## Elevation & Depth

Real Three.js geometry supplies the book, hinged cover, board, seven turning leaves, and castle with its bridge, trees, rocks, and water. RoundedBox geometry bevels the cover and board. Two instanced PaperStacks each contain (48) curved sheets, forming approximately (.28) of stack thickness in scene units; the left stack reverses its curve toward the binding. The closed cover hinge sits at (.35) and lowers to (.015) as it opens, while both semantic page planes share height (.38). A textured bound spine replaces metal bands.

Procedural CanvasTextures provide color separately from cloth and fiber relief maps, with bump scales of (.006) and (.004) respectively. Relief maps remain in the data color space, while color maps use sRGB; all are disposed with the scene. Grain positions use a deterministic linear congruential generator seeded with (1979), distinct from the original direction provenance in .impeccable/landing-seed.json. These are procedural materials on live geometry, not photographic assets or a claim of photoreal reproduction. The decorative curled foreground leaf is removed; both resting stacks share the same shallow bound-page shape. Turning leaves retain a corner-led twist. Each leaf has separate front and back surfaces sharing its bent geometry. The reverse texture is cloned with horizontal repeat (-1) and offset (1), keeping reverse printing readable. There are no dust particles or raster substitutes.

The resting left page uses a separate color-texture clone rotated by pi around its center, keeping its decorative footer upright after mirroring the stack. The clone is disposed with the other scene textures.

One demand-rendered React Three Fiber canvas owns geometry, camera, and the effective rendered pose. Motion supplies a target value; the scene damps toward it and publishes the effective value before mesh and camera updates at frame priority (-1). The outside DOM transforms and semantic page visibility consume that same value. BookJourney synchronously bridges only discrete chapter and accessibility changes to React state.

Drei Html transform anchors semantic BookSpread articles to the physical left and right page planes. Both Html instances share a dedicated DOM portal host that is a sibling of Canvas, positioned across the scene with pointer events disabled; this keeps their cleanup independent of Canvas's DOM when runtime reduced motion removes the scene. All three articles remain mounted within each page plane; their wrappers' opacity and hidden state update synchronously from the effective pose, avoiding a race with Html's separate React root. Hidden applies only when a fade reaches zero. These are actual HTML headings, paragraphs, and definition lists, not text baked into a screenshot. The animation systems never write the same property.

Depth comes from neutral studio lighting: ambient intensity (.4), hemisphere intensity (.6), key directional intensity (2.8), and fill directional intensity (.8), with PCSS soft shadows (24 samples, size 12, focus .3). The board casts and receives shadow, and the floor uses a translucent shadow material with opacity (.13). The island sits above the paper at scene height (.43). Its water is a rippled ring mesh with (160) angular and (28) radial segments, framed by (36) shore rocks. The (46) trees each have three foliage tiers, using (138) instanced cones. White castle molding and bridge parapets add architectural relief. Interface surfaces and flat reading pages have no decorative elevation.

In Dark mode, the finale adds a non-interactive ground behind the outside invitation. Its pseudo-element extends beyond the text region with inset (-80px -20px -120px) and a top-to-bottom gradient from transparent to the interface ground at (60px), becoming solid (20px) above the headline. This grounds the full invitation and its keyboard focus without recoloring the white book or board.

**The Legible Still Rule.** Pause freezes the effective pose and preserves the current mounted canvas and page content. Hidden-tab and offscreen handling also stop target updates and damping; demand rendering sleeps when no frame is needed. Reduced motion or WebGL failure instead exposes all three semantic reading pages in the shorter layout, with no image dependency.

## Shapes

The physical volume has a restrained rectangular silhouette, subtly beveled cover and board, and a hinged binding. Layered sheet edges make the resting pages dimensional without lifting their outer edges into a foreground curl. Turning leaves bend and twist from the corner only while content is hidden; page content follows the book's world transforms. Flat fallback pages are square-edged reading surfaces. Signup links are pills, and appearance controls are circles. FAQ and footer use thin neutral separators instead of containers. The castle's organic coast and architectural silhouettes belong to the finale, not to a new interface shape library.

## Components

### Signup Links

One ink-filled pill appears in the introduction and the centered finale. It uses button-primary, an inline arrow (18px), and a minimum height of (44px). The intro's action starts (18px) below its copy; the finale uses (24px). Mobile uses a minimum height of (46px), padding (13px 23px), and smaller action text. Fine-pointer hover lifts it (2px); active state scales to (.97). Landing focus uses an ink outline (2px) with an offset of (5px).

### Physical Reading Pages

BookSpread renders a decorative left title page and a semantic right page for Writing, Worlds, or Connections. The right page is an article with an accessible name, h2, h3, product summary, definition list, and quiet page foot. The left decoration is hidden from assistive technology. During the scroll-linked fades, Drei Html places the two articles on the actual book planes. The flat layout reuses the same right-page content with a solid paper background; it is not a different summary or an editable field.

### Book Journey

The timeline is reversible and derived from normalized scroll. Lift runs at (.07–.20), opening at (.235–.355), settling at (.805–.88), and castle growth at (.875–.975). The opening page block rotates by the cover angle minus pi, translating vertically by (.31 times (1 minus open)) instead of growing sideways. Content opacity follows linear start/peak/end envelopes: Writing (.355/.37/.43), Worlds (.535/.55/.61), Connections (.695/.71/.77). Fade-in begins only after the spread is open; each peak begins fading out on the next scroll increment, with no plateau. Seven page turns run over (.43–.495), (.46–.535), (.61–.665), (.63–.695), (.77–.815), (.79–.84), and (.815–.86). Content opacity is zero throughout every physical page turn, and the next content waits until the final leaf lands. Stopping scroll or pausing retains the current pose and opacity; keyboard chapter jumps snap directly to each content peak.

The final outside invitation fades in at (.92–.975). Intro content stays operable while the effective pose is below (.12), and the finale stays operable above (.92), including their visible fade windows. Their inert and accessible states track those visibility windows rather than coarse chapter boundaries. Side copy follows its own window (.075–.30). Canvas drawing is aria-hidden; semantic page articles remain accessible. Device motion preference is tracked live through one matchMedia listener.

### Navigation and Controls

The header contains the plain-text home wordmark, Questions, and Sign in, with fluid link gaps of (clamp(24px, 2.4vw, 34px)). Mobile uses (22px) gaps, retains Sign in, and hides Questions. Signup remains in the book introduction and finale. Eight native chapter buttons, named Begin, Lift, Open, Writing, Worlds, Connections, Reveal, and Your world, jump to fixed scroll positions and expose the current step. A jump snaps both target and effective pose to the destination before scrolling, keeping page content and camera together. Their wrapped panel is hidden above the viewport until keyboard focus enters it.

Two fixed appearance controls sit at the bottom right. The motion button pauses or resumes the current score and is disabled when the device requests reduced motion. ThemeSettings compact reuses the existing cross-route preference. Both controls are (42px) circles.

### Questions and Footer

Native details and summary elements provide FAQ disclosure behavior, with a plus icon rotating (45deg) when open. Questions use generous vertical spacing and thin separators; answers are limited to (65ch). The footer contains the text wordmark, Privacy Policy, Terms and Conditions, and copyright, with no additional product section.

## Do's and Don'ts

### Do:

- **Do** keep the whole landing inside the white-book journey, followed only by FAQ and the minimal legal footer.
- **Do** anchor readable semantic content to the physical pages and retain the same content in the flat layout.
- **Do** preserve continuous fades, reversible page turns, mobile right-page framing, and the centered castle finale.
- **Do** drive geometry, outside text, and page opacity/visibility from the same effective pose.
- **Do** preserve the current scene when paused and expose all three reading pages for reduced motion or WebGL failure.
- **Do** retain the shared theme preference, visible keyboard focus, eight chapter destinations, skip-to-FAQ path, signup, Sign in, and legal links.
- **Do** keep these visual rules scoped to the experimental landing; other application surfaces and assets retain their existing systems.

### Don't:

- **Don't** restore the retired sculpture row, editable manuscript sample, world split, relationship graph, or separate closing section as current landing patterns.
- **Don't** treat previous static comps or the 2.3.0 section structure as the fidelity target for the owner's 2.4.0 correction.
- **Don't** turn the three-frame Cinematic Orbit reference into three independent sections or restore stale scroll holds.
- **Don't** replace the semantic page articles with rasterized text or rely on canvas pixels as the only product explanation.
- **Don't** turn pause into scene removal or substitute an image for the flat reading fallback.
- **Don't** carry the retired blue-and-lime palette into this white-on-white landing.
