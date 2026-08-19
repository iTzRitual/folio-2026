# Mobile WebGL domain glossary

## Shared scene

The single React Three Fiber scene that owns the visual experience on desktop and mobile. It includes the model, interface text, details, projects, case studies, theme transition, and future workstation reveal.

## Responsive composition

A viewport-dependent arrangement of objects within the shared scene. It may change columns, scale, spacing, and placement without creating a separate content or rendering path.

## Opening title

The large title arrangement shown in the Hero before scrolling. On mobile it uses an explicit two-line composition.

## Model safe region

The responsive central Hero area kept clear enough for the 3D model between the subtitle, profession labels, and opening title.

## Model interlude

The reserved mobile Details space between Skills and Projects where the Hero model settles without obscuring text or competing with the preview zone.

## Settled title

The compact, single-line form of the Hero title that remains sticky above the Details and Bio stages.

## Scroll stage

One semantic part of the shared scroll narrative: Hero, Details, or Bio. A responsive composition may change internal layout without changing the stage's purpose.

## Bio stage

The distinct final scroll stage containing About me, the portrait, and biography copy. On mobile its visual and reading order is heading, image, then text.

## Content breakpoint

A layout transition triggered when measured content no longer fits its available space. It is preferred over a device-name breakpoint for responsive scene composition.

## Feature parity

The same content, primary actions, navigation states, and narrative stages are available across desktop and mobile. Feature parity does not require identical input mechanics or identical GPU cost.

## Primary functionality

Content and actions required to understand the portfolio and complete its main journeys, including project discovery, case studies, contact, theme selection, and navigation. Low-priority ambient metadata may differ between responsive compositions.

## Input adaptation

A platform-appropriate replacement or removal of an interaction whose desktop gesture conflicts with touch behavior. An adaptation may disable model dragging on coarse pointers, but it may not make content or a primary action unreachable.

## Pointer capability

The input properties reported by hover and pointer media queries. They determine whether direct manipulation is safe independently of viewport width.

## Layout mode

The wide or narrow scene composition selected by content fit. It does not imply a specific device or input type.

## Compact-height modifier

A layout-axis modifier for viewports that cannot fit the normal vertical composition. It compresses spatial values without removing content or changing input behavior.

## Minimum design surface

The smallest viewport for which the full visual composition is an acceptance requirement: 320 by 568 CSS pixels in portrait and 568 by 320 in landscape.

## Input mode

The fine- or coarse-pointer behavior used by interactive scene elements. It is independent from layout mode.

## Quality tier

The adaptive GPU-cost profile for optional rendering work. It may change without changing layout or input semantics.

## Effect quality tier

The current rendering-cost level for decorative post-processing. It may decrease under sustained frame pressure without removing content or primary actions.

## Scroll-safe interaction

An interaction that does not capture or reinterpret an ordinary vertical swipe intended to scroll the page.

## Active project

The single project whose row currently owns the mobile preview plate. It is selected by scroll position rather than hover.

## Active-project state

The non-layout-shifting row treatment that links a project to the mobile preview: hover-role color plus an arrow nudge.

## Activation line

A horizontal line within the visible viewport used to select the active project as rows cross it. Selection remains stable around the line to prevent rapid switching between adjacent rows.

## Preview plate

The WebGL image surface associated with the active project. On desktop it follows hover; on mobile it is driven by the activation line and never captures the scroll gesture.

## Project trigger

The project text row that opens its case study. On mobile it is the only interactive target associated with the scroll-driven preview plate.

## Preview zone

The stable lower-viewport region that displays the active mobile project preview without changing the layout of project rows. Content behind this zone is visually suppressed to keep both the row and preview legible.

## Landed case study

The case-study state after the camera has completed its flight into the preview plate and the image and copy form the reading surface.

## Case-study scroll driver

The input surface whose scroll offset positions the WebGL case-study content. On mobile it is a native full-viewport scroll container while the underlying portfolio document remains locked.

## Scroll source

The mechanism producing the main timeline position. Fine pointers may use Lenis, while coarse pointers and reduced-motion users use native document scrolling.

## Return mark

The `Natan Mokrzycki` control that closes a case study and restores the originating project context. It is sticky in the mobile case-study composition.

## External project action

The explicit `View project ↗` link placed on the case-study opening image. It replaces the desktop hold gesture on touch layouts.

## Temporary mobile path

The current DOM-only `MobileHero` and `MobileContent` branch. It is transitional architecture and is not the target mobile experience.
