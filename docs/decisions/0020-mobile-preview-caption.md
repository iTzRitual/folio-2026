# ADR 0020: Captionless non-interactive mobile preview

- Status: Accepted
- Date: 2026-08-10

## Context

The desktop preview caption explains `Click for case study` and `Hold for live site`. Mobile project rows open the case study directly, external navigation lives inside the study, and the scroll-driven preview plate is not a separate touch target.

Keeping or rewriting the caption would either communicate false behavior or imply that the image itself must be tapped.

## Decision

- The mobile preview plate has no interaction caption.
- The plate does not receive pointer or touch events.
- The active project row remains the sole case-study trigger.

## Consequences

- Mobile caption uniforms and their texture work can be skipped for the preview state.
- The active row needs a clear visual relationship with the displayed image.
- The landed case-study image may independently contain the accepted external project action.
