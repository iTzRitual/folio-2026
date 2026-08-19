# ADR 0011: Mobile case-study camera entry

- Status: Accepted
- Date: 2026-08-10

## Context

Desktop opens a case study by flying the camera into the hovered preview plate until that surface becomes the study's opening image. Replacing this with unrelated mobile navigation would remove a defining piece of continuity from the shared WebGL scene.

Mobile previews are selected by scroll rather than hover, so the tapped project must explicitly own the plate before the transition begins.

## Decision

- Tapping a mobile project row assigns that project's texture to the preview plate.
- The camera flies from the current scene into that plate.
- The plate resolves into the full-width opening image of the narrow case-study composition.
- Case-study copy is arranged as one column below the image.
- Mobile uses a shorter timing than the wide composition while preserving the same spatial continuity.
- Under reduced motion, the spatial flight is replaced by an immediate state change with a short crossfade.

## Consequences

- The preview plate must have a deterministic mobile pose even when the tapped row was not previously active.
- Opening state cannot depend on hover state.
- Direct `/projects/[slug]` entry still needs an instant landed state on mobile.
- The returned project-list state must restore the original document scroll position and active preview.
