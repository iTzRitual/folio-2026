# ADR 0004: Mobile scroll stages

- Status: Accepted
- Date: 2026-08-10

## Context

Desktop uses a three-stage scroll narrative: a one-viewport hero, a content-driven details sheet, and a bio stage that begins one viewport after the details content finishes. Details uses two columns on wide viewports, with Skills occupying the right column.

A narrow viewport cannot preserve that column relationship without making the type and interaction targets too small.

## Decision

Mobile preserves the same three semantic stages and shared scroll machinery:

1. Hero occupies the opening viewport.
2. Details becomes a single-column scrolling composition.
3. Bio remains a distinct final stage.

The sticky title and curl treatment remain part of the mobile scene. The mobile sequence is:

1. Experience
2. Skills
3. Projects
4. Education
5. Courses
6. Bio

## Consequences

- Mobile and desktop continue to share the hero-to-details progress range and the content-driven overflow model.
- The details layout calculator needs a narrow-composition branch rather than a second page implementation.
- Skills can no longer rely on a persistent right column and needs a compact mobile layout between Experience and Projects.
- Bio spacing remains a stage boundary rather than ordinary section spacing.
