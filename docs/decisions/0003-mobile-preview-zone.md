# ADR 0003: Viewport-owned mobile preview zone

- Status: Accepted
- Date: 2026-08-10

## Context

The mobile project preview needs a stable visual relationship with the project selected by scroll. Placing it over the row would obscure the text being read. Inserting it into the active row would cause layout shifts, while reserving image space under every row would make the project section unnecessarily long.

## Decision

Mobile uses one viewport-owned preview zone below the active project row.

- A project becomes active near 35–40% of the visible viewport height.
- The preview is centered provisionally near 68–72% of the visible viewport height.
- The preview uses approximately 82–86% of the available viewport width and aligns to the right safe margin.
- It retains the 1.6:1 project-preview aspect ratio and is height-clamped in compact-height layouts.
- Replacing the active preview does not change document height or row positions.
- Text passing behind the preview zone is masked or faded to preserve legibility.
- The preview surface does not receive scroll gestures.

Exact constants remain tunable during implementation, but the viewport ownership, lower placement, right alignment, inset width, and no-layout-shift behavior are final composition constraints.

## Consequences

- Preview state belongs to the viewport composition rather than to an individual row's layout box.
- Switching projects can reuse the existing single preview plate and texture pipeline.
- The mobile details composition needs a dedicated occlusion or fade treatment around the preview zone.
- Verification must include short and tall phone viewports; percentages alone are not sufficient for landscape or constrained-height screens.
- The case-study camera flight expands the inset plate into the wider landed image.
