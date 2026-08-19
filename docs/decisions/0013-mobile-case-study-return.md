# ADR 0013: Sticky branded mobile case-study return

- Status: Accepted
- Date: 2026-08-10

## Context

Desktop case studies use the `Natan Mokrzycki` mark as the return action and show an Escape-key hint beside it. Touch layouts need a persistent exit without keyboard-specific copy. A generic close icon would discard the existing branded navigation cue.

## Decision

- `Natan Mokrzycki` remains the mobile case-study return control.
- It is pinned to the top-left safe area and remains visible through internal case-study scrolling.
- Its tap target is at least 44 CSS pixels high.
- Activating it closes the study and restores the originating project state.
- The Escape hint is omitted on the mobile composition.

## Consequences

- The return mark is positioned in viewport space rather than scrolling with the case-study masthead on mobile.
- The accessible DOM twin must be a real button with an explicit return label and focus treatment.
- The opening image and copy need top clearance for the sticky return control.
