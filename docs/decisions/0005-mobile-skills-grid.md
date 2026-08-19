# ADR 0005: Compact mobile Skills grid

- Status: Accepted
- Date: 2026-08-10

## Context

Skills moves between Experience and Projects in the mobile Details sequence. Rendering all thirteen skills as one vertical list would delay the project work and weaken the intended information hierarchy.

Introducing chips, cards, or a carousel would add a new visual language that does not exist in the flat typographic WebGL interface.

## Decision

Mobile Skills uses a compact, left-aligned two-column typographic grid.

The grid collapses to one column only when measured content no longer fits at the available type size and gap. This is a content breakpoint, not a device-class breakpoint.

## Consequences

- The details layout model needs a grid-aware height calculation for Skills.
- The WebGL text and DOM accessibility twins must share the same column assignment and positions.
- The project section remains close to the top of the mobile Details stage.
- No new chip, card, or horizontal-scrolling interaction is introduced.
