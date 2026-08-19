# ADR 0017: Compact-height responsive layout

- Status: Accepted
- Date: 2026-08-10

## Context

Landscape phones and constrained browser panes can be wide enough to appear eligible for the wide composition while lacking enough vertical space for the Header, subtitle, model, profession labels, opening title, and preview zone.

Requiring portrait orientation would make the responsive WebGL scene conditional on device posture and would leave the future workstation reveal with the same unresolved problem.

## Decision

- Both portrait and landscape orientations are supported.
- A `compactHeight` modifier is derived from vertical content fit within the layout axis.
- It reduces vertical spacing, model scale, model-interlude height, and preview-zone dimensions.
- It uses dynamic viewport units and safe-area insets.
- It does not remove content, projects, case studies, or primary actions.
- Width alone cannot promote a short landscape phone into a wide composition.
- No rotate-device interstitial is shown.

## Consequences

- Layout selection evaluates both width and height constraints.
- Hero collision tests need short landscape fixtures.
- Preview activation and placement need separate compact-height tuning.
- Browser UI expansion and collapse must not cause abrupt stage or breakpoint changes.
