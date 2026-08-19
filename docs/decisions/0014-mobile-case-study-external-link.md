# ADR 0014: External project link on the case-study image

- Status: Accepted
- Date: 2026-08-10

## Context

Desktop project rows distinguish a case-study click from a long hold that opens the external project. Long-press is not used on mobile, so the external destination needs an explicit, discoverable control inside the case study.

An icon-only control would not clearly communicate that it leaves the study or opens a new browser context.

## Decision

- The opening case-study image contains a bottom-right `View project ↗` control.
- It opens the project's external URL in a new tab.
- It uses a contrasting plate consistent with the existing reveal and curl visual language.
- Its hit area is at least 44 by 44 CSS pixels.
- It scrolls with the opening image and is not a second sticky action.
- Its accessible name identifies it as an external destination that opens in a new tab.

## Consequences

- Mobile project rows only need one primary action: open the case study.
- The case-study image needs a synchronized WebGL control and semantic DOM anchor.
- Contrast must be verified against every project preview in both themes.
- The external action remains available on direct case-study URL entry.
