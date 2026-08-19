# ADR 0019: Native main-page scroll for coarse pointers

- Status: Accepted
- Date: 2026-08-10

## Context

Touch platforms already provide momentum, overscroll, and dynamic browser-chrome behavior. Applying desktop-oriented smooth scrolling on top of coarse-pointer input can make the page feel delayed and can interfere with platform expectations.

The shared WebGL timeline only requires a reliable scroll position; it does not require Lenis to own touch input.

## Decision

- Coarse-pointer input uses native document scrolling.
- Fine-pointer input retains Lenis smoothing.
- Reduced-motion mode always uses native scrolling.
- ScrollTrigger maps either source onto the same WebGL transition refs.
- Mobile case studies continue to use their separate native internal scroll driver while open.

## Consequences

- Scroll source is selected from input capability and motion preference rather than layout mode.
- Scroll-linked scene transforms must remain correct without Lenis RAF updates.
- Dynamic mobile browser chrome and native momentum become part of the supported behavior.
- Verification covers switching pointer capabilities and reduced-motion preference without changing the scene's semantic stage.
