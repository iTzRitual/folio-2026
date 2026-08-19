# ADR 0010: Scroll-driven mobile aberration

- Status: Accepted
- Date: 2026-08-10

## Context

The custom chromatic aberration and grid distortion currently derive their energy from fine-pointer velocity. Touch layouts have no equivalent hover pointer stream, but removing the effect entirely would discard part of the shared scene's visual behavior.

The effect is decorative and GPU-intensive. It must not compromise scroll responsiveness or ignore reduced-motion preferences.

## Decision

- Fine pointers continue to drive aberration from pointer velocity.
- Coarse-pointer mobile layouts drive a lower-intensity variant from smoothed scroll velocity.
- The effect is disabled when `prefers-reduced-motion: reduce` is active.
- Mobile uses a lower initial quality budget.
- Sustained performance pressure first reduces effect quality and may then disable the effect before degrading content, curl behavior, or case-study functionality.

## Consequences

- The aberration controller needs an input adapter independent of the shader implementation.
- Scroll velocity must be written through mutable frame data rather than React state.
- Quality tier changes must avoid visible oscillation and need hysteresis.
- Verification includes reduced-motion emulation and profiling on a representative mid-range phone.
