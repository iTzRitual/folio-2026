# ADR 0009: Scroll-safe mobile model input

- Status: Accepted
- Date: 2026-08-10

## Context

The Hero model supports grab, drag, and throw physics on desktop. A direct manipulation surface covering the central mobile Hero competes with the primary vertical swipe gesture and can make the page feel stuck.

Screen width alone is not a reliable description of input capability: narrow windows may still have a mouse, and larger touch devices may still use a coarse primary pointer.

## Decision

When the primary input is coarse and does not support hover:

- Grab, drag, and throw are disabled.
- Idle rotation remains active.
- Scroll-driven position, scale, and stage transitions remain active.
- No replacement tap or horizontal-drag gesture is introduced.
- The canvas preserves vertical browser panning behavior.

Direct model manipulation remains available for fine pointers even in a narrow viewport when it does not compete with touch scrolling.

## Consequences

- Model interaction capability is derived from pointer media features rather than `isMobile` alone.
- Pointer handlers and grab hit areas must not capture coarse-pointer gestures.
- Visual animation remains shared; only the direct input adapter changes.
- Automated verification must confirm that swiping from the model area scrolls the page on touch emulation.
