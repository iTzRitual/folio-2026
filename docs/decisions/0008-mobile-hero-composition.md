# ADR 0008: Mobile Hero composition

- Status: Accepted
- Date: 2026-08-10

## Context

The temporary mobile Hero groups the title and professions as ordinary DOM copy. The wide WebGL Hero instead uses the subtitle, profession rules, model, and title as one spatial composition.

Replacing that structure with a stacked text block would reduce the model to a background decoration and weaken continuity with the shared scene and future workstation reveal.

## Decision

The narrow Hero keeps the wide composition's semantic arrangement:

- The subtitle sits below the Header, centered and wrapped to at most two or three lines.
- Frontend Engineer is left-aligned above the model.
- Creative Technologist is right-aligned below the model.
- Both professions retain their thin rule treatments.
- The model remains the central visual focus.
- The two-line opening title anchors the bottom of the Hero.

All positions are derived from the responsive layout model and visible viewport bounds.

## Consequences

- Mobile mounts the shared `HeroText` components rather than `MobileHero`.
- Subtitle wrapping must be synchronized between WebGL and its DOM twin.
- The profession labels need narrow-layout anchors that leave a safe central region for the model.
- Short-height viewports need a compressed composition mode to avoid collisions between Header, subtitle, professions, model, and title.
