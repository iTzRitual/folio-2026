# ADR 0012: Native mobile case-study scroll driver

- Status: Accepted
- Date: 2026-08-10

## Context

The desktop case-study scene locks the document and converts wheel input into an internal mutable scroll target. That input path does not handle touch. Reimplementing momentum and gesture cancellation with pointer movement would compete with browser scrolling behavior and create a fragile imitation of native physics.

## Decision

Mobile case studies use a full-viewport native scroll container as an input driver.

- The portfolio document remains locked at its current scroll position.
- The container accepts ordinary vertical touch panning and native momentum.
- Its `scrollTop` drives the shared WebGL case-study image and copy position.
- Horizontal browser navigation gestures are not intercepted.
- Closing restores the portfolio document and active project exactly where they were left.
- The existing desktop wheel driver may remain unchanged to reduce regression risk.

## Consequences

- The scroll container is a transparent control surface; visual content remains in WebGL with synchronized DOM accessibility content.
- The scroll range must be derived from the same measured case-study layout as the scene.
- Focused DOM twins inside the study must be scrolled into view by the native container.
- Direct URL entry needs the same container with a landed camera state.
- Mobile testing must cover iOS momentum, overscroll boundaries, Android Chrome, and browser back/forward restoration.
