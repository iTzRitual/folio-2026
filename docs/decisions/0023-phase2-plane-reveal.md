# ADR 0023: 4:3 plane reveal after About me

- Status: Accepted
- Date: 2026-08-19

## Context

Phase 2 must not change the existing portfolio composition during the initial
view. The current close framing should remain visually identical through the
Hero, Details, and About me stages. Only after the viewer scrolls below About
me should the scene reveal that the portfolio is displayed inside a larger
surface.

The revealed surface has a fixed 4:3 aspect ratio, while the user's viewport
may have any aspect ratio. The viewport-sized portfolio therefore needs to fit
inside the plane, leaving temporary black areas until the future virtual
desktop occupies them.

## Decision

- The close portfolio view remains unchanged through the end of About me.
- The reveal begins below About me by moving the camera away from the existing
  portfolio surface.
- The plane always uses a 4:3 aspect ratio.
- The plane uses a lightly convex physical surface curved in both axes.
- Its subdivisions preserve the 4:3 topology ratio, with a production-sized
  grid such as 32 by 24 rather than a coarse 4 by 3 grid.
- The current viewport composition is fitted inside the plane without changing
  its close-view behavior.
- Black areas revealed around the portfolio are temporary surface content.
- A future macOS-like virtual desktop will replace those black areas.
- Safari UI is hidden in the close view and is the first new layer revealed
  after the camera begins pulling away.
- The future virtual desktop is revealed only after the Safari-wrapped page is
  already established.
- Once the viewer reaches the end of About me, the portfolio document is
  clamped at that position and further scroll advances only the camera reveal.
- Safari and the live portfolio form one browser window whose aspect ratio
  follows the current viewport plus its browser chrome.
- That browser window uses contain fitting inside the 4:3 plane: it is centered,
  maximized within the available surface, and never cropped.
- On coarse or narrow viewports, the browser window preserves the device's
  portrait aspect ratio and the page keeps its narrow responsive composition.
- Mobile does not switch to a desktop page layout just because it is displayed
  inside the 4:3 plane.
- At the reveal boundary, the portfolio is rendered continuously into a GPU
  texture while its document scroll remains clamped at the end of About me.
  Safari chrome and the temporary black plane area are rendered on the same
  physical plane.
- The texture is mapped onto the physical plane, so the page and Safari chrome
  share its CRT curvature rather than sitting in separate depth layers.
- The curvature starts flat and grows only as the camera pulls away, preserving
  the close portfolio composition.
- Safari chrome is composed above the live portfolio content inside the plane
  texture. It increases the outer browser window's height instead of causing
  the page to reflow or shrink to make room for the toolbar.
- Safari controls are visual-only in this phase. The revealed browser is a
  non-interactive browser surface with live rendered content.
- The first implementation milestone stops at the Safari-wrapped page on a
  black plane. It excludes the macOS-like virtual desktop, CRT post-processing,
  and any additional physical monitor housing.
- The first camera path is a centered dolly along the Z axis with no rotation
  or lateral translation.

## Consequences

- No responsive layout change may leak into the portfolio before the reveal
  starts.
- The reveal needs an independently controlled camera progress value rather
  than stretching the existing Hero-to-Details timeline.
- Plane dimensions and content fitting must be derived from the same viewport
  and depth-aware layout system used by the current WebGL scene.
- The geometry's curvature is part of the plane contract; CRT scanlines,
  noise, and optical distortion remain separate screen effects.
- The black surface remains part of the plane texture so it can later be
  replaced by virtual-desktop content without changing the camera contract.
- Reveal timing must preserve the order: close page, Safari-wrapped page, then
  virtual desktop.
- Any unused plane area around the contained Safari window remains available for
  the temporary black surface and later virtual desktop.
- Narrow devices will naturally produce larger horizontal unused areas inside
  the plane; this is an intentional consequence of contain fitting.
- The browser-window contract must preserve the portfolio content rectangle and
  position the toolbar relative to it.
- The live plane texture avoids depth seams between the Safari chrome and the
  page while keeping the whole browser window inside the plane bounds.
- This milestone is intentionally a composition and continuity test before
  adding desktop content or physical screen treatment.
- Keeping the camera path one-dimensional makes screen fitting and reveal
  regressions independently measurable before workstation composition is added.
- Reversing the reveal must restore the close framing without advancing the
  portfolio beyond the About me boundary.
