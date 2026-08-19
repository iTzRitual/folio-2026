# ADR 0006: Reduced mobile Header

- Status: Accepted
- Date: 2026-08-10

## Context

The wide Header has five slots: coordinates, availability, theme controls, local time, and contact. Keeping all five on a narrow viewport would either force unreadably small text or consume two rows with oversized touch regions.

Coordinates and local time are low-priority contextual metadata. Availability, theme selection, and contact support the user's primary understanding and actions.

## Decision

Mobile uses one WebGL Header row containing:

- Availability on the left.
- A theme icon and Contact on the right.

Coordinates and local time are omitted from the narrow composition. The theme control uses a sun/moon icon reflecting the current theme, with an accessible label describing the resulting action. Theme and Contact retain hit areas of at least 44 by 44 CSS pixels.

## Consequences

- Header content is responsive even though the Header remains part of the shared scene.
- The layout system must reserve top safe-area space without forcing the hero into a second header row.
- The accessible DOM twin must expose the theme action in text even when the visible WebGL control is icon-only.
- Coordinates and time remain available in the wide composition and no longer constrain narrow typography.
