# ADR 0002: Mobile project interaction

- Status: Accepted
- Date: 2026-08-10

## Context

On desktop, hovering a project row displays its preview plate, clicking opens the case study, and holding opens the external project URL. Touch input has no stable hover state, while long-press competes with scrolling and native browser gestures.

Removing previews would weaken the project discovery experience. Requiring a first tap to preview and a second tap to open would make the primary action ambiguous.

## Decision

On touch-oriented mobile layouts:

- Tapping a project row opens its case study directly.
- The external project URL is available from an explicit button placed on the case-study image.
- The preview plate appears automatically for the project that crosses a viewport activation line while the user scrolls.
- The preview must not capture the vertical scroll gesture.
- The exact relationship between the active row and its preview plate will be decided as a separate composition decision.

## Consequences

- Mobile does not use long-press as a required interaction.
- Project selection during scrolling becomes deterministic and independent of pointer hover.
- Only one project may own the preview plate at a time.
- Activation needs hysteresis or an equivalent stability rule so the preview does not flicker near boundaries between rows.
- The case-study image needs a scroll-safe external-link target of at least 44 by 44 CSS pixels.
