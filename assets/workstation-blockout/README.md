# Workstation reference blockout

The current pass follows the supplied workstation reference: window and music cabinet on the left, CRT at the center, horizontal skateboard above, taped photos between window and monitor, and a large band poster with an upright floor plant on the right. The desk stays frontal. The settled lens is 42 degrees, with a close crop of the desktop and partial legs.

The existing CRT, keyboard, and open-lid turntable GLBs are unchanged. The existing mouse and controller proxies are reused. The desk slab is reused at a 1.30 by 0.82 m footprint. The monitor remains 5.5 cm right of desk center with a -6 degree yaw.

## Editable props

The cabinet sits immediately left of the desk, 6.5 cm below its top and farther back to keep its turntable and LP display readable. A shelf holds stored 31.5 cm sleeves and a front-facing Massive Attack placeholder. The horizontal skateboard deck measures 80.5 by 20.32 cm, with simple trucks and wheels.

The window opening, exterior, sill plant, books, lamp, pencil cup, polaroids, poster, skateboard, record storage, and pole-trained monstera are procedural blockouts. Graphics are solid shapes and placeholder typography. The floor plant uses one shared, low-resolution split-leaf geometry. No new asset downloads, textures, or dependencies were added.

The next art pass should refine leaf curvature and grouping, lamp shape, wall art, and the warm/cool lighting balance. The composition approximates the reference; it does not reproduce its photographic lighting or detailed silhouettes.

## Authoring

Open `/debug` and expand Leva:

- **Workstation** adjusts monitor placement, furniture and prop positions, keyboard and turntable transforms. Turntable position is relative to the cabinet; other heights are relative to the desktop support plane.
- **3D scene framing** adjusts final camera position, target, final FOV, and curve shaping. Camera coordinates use workstation meters.
- **Environment lighting** switches day/night and adjusts window, lamp, and fill strength. Night is the default and uses a simple dusk exterior. This is independent of the portfolio theme.

Persist values in `CONFIG.workstation` in `src/config/constants.ts`. Geometry lives in `WorkstationBlockout.tsx`, `WorkstationPersonalProps.tsx`, and `WorkstationPrimitives.tsx`.

## Reveal and layout

The workstation-to-screen transform preserves a single reference frame for the CRT housing, display, controls, and pointer mapping. The monitor remains stationary relative to its desk. Scroll first reveals the desktop and physical monitor, then introduces the existing modest camera curve toward the frontal desk view. Reverse scrolling samples the same path.

The lens narrows smoothly only during the physical camera reveal. The initial portfolio and its capture camera retain the original FOV. `HeroLayoutProvider` derives its viewport from that original projection, so resizing in the workstation cannot change the portfolio's world-space scale. Narrow screens prioritize the CRT instead of fitting the decorative scene.

Desktop contact shadows include the pencil cup, lamp, mouse, controller, keyboard, and correctly transformed monitor. The cabinet has a separate turntable contact capture. Captures update on placement changes rather than continuously.

## Verification

- Lint, TypeScript, all existing tests, and the production build passed.
- The workstation check covers physical support, keyboard/cabinet fit, open-lid clearance, monitor/display alignment, horizontal desk framing, camera collision samples, and exact reverse paths at laptop, wide, and mobile aspect ratios. It projects the final frame with the new settled FOV.
- Browser inspection covered 1440 by 810, 1440 by 900, 1920 by 1080, and 390 by 844, plus initial/reverse endpoints, intermediate reveal, day/night previews, and resizing with the workstation visible. No browser console errors were reported.
- `reference-*.png` are application captures from this pass. Older captures in this directory document the earlier composition. The browser screenshot surface clips images wider than 1500 pixels, so the full 16:9 capture uses 1440 by 810.

The props and light pools remain intentionally simple. Day/night use inexpensive local lighting and cached contact shadows, not a physically accurate room simulation. Responsive inspection used a desktop browser at mobile dimensions.
