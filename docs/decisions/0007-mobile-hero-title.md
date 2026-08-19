# ADR 0007: Mobile Hero title transformation

- Status: Accepted
- Date: 2026-08-10

## Context

The wide Hero presents the name as a large single line and later compacts it into the sticky title used above Details. On a narrow viewport, scaling the same line down would weaken the primary visual element, while allowing incidental wrapping would make the composition and transition unpredictable.

## Decision

The mobile Hero deliberately renders the opening title as two lines:

```text
Natan
Mokrzycki
```

It is anchored near the bottom of the Hero stage. During the hero-to-details transition it compacts into a single-line `Natan Mokrzycki` sticky title.

The line break is authored as part of the narrow composition rather than delegated to automatic Troika or browser wrapping.

## Consequences

- The title transition needs distinct opening and settled bounds for narrow layouts.
- The WebGL title and selectable DOM twin must receive the same explicit line structure.
- The settled one-line size must be calculated from the available width and not inherited from the opening two-line size.
- The Details fold and sticky-title clearance must use the settled mobile title bounds.
