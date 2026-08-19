# ADR 0001: Shared responsive WebGL scene

- Status: Accepted
- Date: 2026-08-10

## Context

The current desktop experience renders the interface inside one React Three Fiber scene. The temporary mobile path replaces most of that scene with separate DOM components and keeps only the 3D model in the canvas. This removes the header, WebGL hero and details, project previews, case studies, curl treatment, and post-processing from mobile.

Phase 2 will reveal that the flat interface is displayed on a monitor inside a larger workstation scene. Maintaining a separate DOM mobile experience would prevent both viewport classes from sharing that reveal and would create two products that can drift independently.

## Decision

Desktop and mobile will use the same R3F/WebGL scene, content model, scroll stages, and case-study system.

Responsive behavior will be expressed through shared layout calculations with viewport-specific composition where necessary. Mobile is not a fallback render path.

Input behavior may differ when literal desktop interaction would conflict with touch scrolling. In particular, model grab, drag, and throw may be disabled for coarse pointers or narrow touch viewports. These adaptations must preserve access to content and primary actions.

## Consequences

- The temporary `MobileHero` and `MobileContent` path will be retired from the JavaScript experience.
- Mobile layout rules must live alongside the shared WebGL layout system rather than duplicate content in DOM-only components.
- Header, hero, details, projects, case studies, themes, and the future Phase 2 transition remain one product across viewport sizes.
- Pointer capabilities, not screen width alone, determine whether drag-dependent interactions are safe.
- Mobile performance may use lower-cost quality settings, provided that content and primary functionality remain available.
