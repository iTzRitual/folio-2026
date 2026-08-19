# ADR 0016: Orthogonal responsive capability model

- Status: Accepted
- Date: 2026-08-10

## Context

The current `isMobile` flag combines three unrelated concerns behind a width threshold: scene composition, pointer interaction, and rendering cost. That misclassifies narrow desktop windows, touch laptops, tablets, and landscape phones.

A shared scene needs each concern to change independently without mounting a separate product.

## Decision

Responsive behavior is modeled on three independent axes:

- `layoutMode`: wide or narrow, selected when measured content fits or breaks.
- `inputMode`: fine or coarse, selected from pointer and hover capabilities.
- `qualityTier`: adaptive rendering cost selected from sustained performance signals.

The existing `isMobile` boolean will not gate the main render path. Layout thresholds are derived from content fit rather than retaining an arbitrary 768-pixel device breakpoint.

## Consequences

- A narrow desktop window may use the narrow composition while keeping fine-pointer interactions.
- A wide tablet may use the wide composition while disabling drag interactions that conflict with touch.
- Performance degradation does not change content or layout semantics.
- Providers and components receive the smallest relevant capability instead of a global device label.
- Verification uses a matrix of layout mode, input mode, and quality tier rather than a single mobile/desktop pair.
