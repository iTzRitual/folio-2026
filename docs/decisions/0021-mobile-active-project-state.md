# ADR 0021: Mobile active-project state

- Status: Accepted
- Date: 2026-08-10

## Context

Scroll position selects the project shown in the mobile preview zone. Changing only the image would provide a weak visual connection between the plate and the row that owns it, especially while several project names remain visible.

Changing font weight or row scale would alter measured text bounds and could destabilize the activation geometry.

## Decision

The active mobile project row uses two visual signals:

- Its text and arrow use the existing hover theme role.
- Its arrow performs the existing desktop nudge.

Font weight, row scale, and layout metrics do not change. Activation remains independent of focus and pressed states, which retain their own accessible behavior.

## Consequences

- The project row component needs an externally driven active state in addition to pointer hover.
- Color is not the only visual signal connecting the row to the preview.
- Active-state transitions do not invalidate details layout measurements.
- Keyboard focus remains distinguishable from scroll activation.
