# ADR 0018: Minimum mobile layout surface

- Status: Accepted
- Date: 2026-08-10

## Context

Responsive calculations need explicit worst-case fixtures. Without a lower design bound, type sizing, wrapping, touch targets, Hero collision rules, and preview placement cannot have deterministic acceptance criteria.

## Decision

- The minimum supported portrait design surface is 320 by 568 CSS pixels.
- The minimum supported landscape design surface is 568 by 320 CSS pixels.
- Larger phones and tablets use the same responsive rules rather than device-specific layouts.
- Below those bounds, content and primary actions must remain reachable, but pixel-perfect composition is not guaranteed.

## Consequences

- Both minimum surfaces become mandatory visual and numerical regression fixtures.
- Font floors and 44-pixel touch targets cannot be reduced to make the composition fit.
- Compact-height clamping is tuned against the 568-by-320 fixture.
- Overflow below the supported surface must fail safely through scrolling rather than clipping required actions.
