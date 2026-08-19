# ADR 0015: Mobile Details model interlude

- Status: Accepted
- Date: 2026-08-10

## Context

The wide Details composition gives the model a gap between its left and right columns. The mobile composition has one content column, and placing the model over that column would obscure selectable text. The project preview zone also needs an uncontested lower-viewport region.

Removing the model after Hero would discard its desktop Details return and weaken continuity across the shared scene.

## Decision

Mobile reserves a model interlude between Skills and Projects.

- The provisional interlude height is 30–35 dynamic viewport height units.
- During the hero-to-details transition, the model scales and settles into this reserved region.
- The model then travels with the Details content.
- The project preview zone takes over visual priority after the interlude leaves the active viewport region.

## Consequences

- The details layout calculator includes the interlude as explicit measured vertical space.
- Model anchoring uses the shared viewport-fraction contract so depth parallax remains correct.
- The interlude is included in the derived page height and reveal ordering.
- Short-height landscape layouts need a clamped interlude size rather than an unbounded viewport percentage.
