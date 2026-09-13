# Workstation reference blockout

The current pass follows the supplied workstation reference: window and music cabinet on the left, CRT at the center, horizontal skateboard above, taped photos between window and monitor, and a large band poster with an upright floor plant on the right. The desk stays frontal. The settled lens is 42 degrees, with a close crop of the desktop and partial legs.

The existing CRT, keyboard, and open-lid turntable GLBs are unchanged. The existing mouse and controller proxies are reused. The desk slab is reused at a 1.30 by 0.82 m footprint. The monitor remains 5.5 cm right of desk center with a -6 degree yaw.

## Editable props

The cabinet sits immediately left of the desk and is 98.25 cm tall, 1.5 times its previous height. Its top is 26.25 cm above the desktop, with the base still on the floor. Two rows of divided storage hold 31.5 cm sleeves. The featured Massive Attack sleeve now rests on the left side of the desktop and leans toward the cabinet. The horizontal skateboard deck measures 80.5 by 20.32 cm, with simple trucks and wheels.

The window opening, exterior, sill plant, books, lamp, Monster Energy can, compact speakers, polaroids, poster, skateboard, record storage, and pole-trained monstera are procedural blockouts. Graphics are solid shapes and placeholder typography. The floor plant uses one shared, low-resolution split-leaf geometry. No new asset downloads, textures, or dependencies were added.

The speakers use simple wood-sided boxes with exposed driver discs inspired by the Edifier R1280DB, angled inward by 12 degrees. The left speaker is inset to keep it visible beside the featured sleeve. The can uses a black cylinder, green claw marks, and placeholder lettering; its center is over 23 cm from the mouse. Both speaker positions, the can, and the sleeve have dedicated placement controls. Camera settings and CRT placement are unchanged in this refinement.

The next art pass should refine leaf curvature and grouping, lamp shape, wall art, and the warm/cool lighting balance. The composition approximates the reference; it does not reproduce its photographic lighting or detailed silhouettes.

## Authoring

Open `/debug` and expand Leva:

- **Workstation** adjusts monitor placement, furniture and prop positions, keyboard and turntable transforms. Turntable position is relative to the cabinet; other heights are relative to the desktop support plane.
- **3D scene framing** adjusts final camera position, target, final FOV, and curve shaping. Camera coordinates use workstation meters.
- **Environment lighting** switches day/night and adjusts window, lamp, and fill strength. Night is the default and uses a simple dusk exterior. This is independent of the portfolio theme.

Persist values in `CONFIG.workstation` in `src/config/constants.ts`. Geometry lives in `WorkstationBlockout.tsx`, `WorkstationDeskProps.tsx`, `WorkstationPersonalProps.tsx`, and `WorkstationPrimitives.tsx`.

## Reveal and layout

The workstation-to-screen transform preserves a single reference frame for the CRT housing, display, controls, and pointer mapping. The monitor remains stationary relative to its desk. Scroll first reveals the desktop and physical monitor, then introduces the existing modest camera curve toward the frontal desk view. Reverse scrolling samples the same path.

The lens narrows smoothly only during the physical camera reveal. The initial portfolio and its capture camera retain the original FOV. `HeroLayoutProvider` derives its viewport from that original projection, so resizing in the workstation cannot change the portfolio's world-space scale. Narrow screens prioritize the CRT instead of fitting the decorative scene.

Desktop contact shadows include the can, speakers, featured sleeve, lamp, mouse, controller, keyboard, and correctly transformed monitor. The cabinet has a separate turntable contact capture. Captures update on placement changes rather than continuously.

## Verification

- Lint, TypeScript, all existing tests, and the production build passed.
- The workstation check covers physical support, grounded cabinet, speaker/monitor clearances, mouse/can spacing, keyboard/cabinet fit, open-lid clearance, monitor/display alignment, horizontal desk framing, camera collision samples, and exact reverse paths at laptop, wide, and mobile aspect ratios. It projects the final frame with the new settled FOV.
- Browser inspection covered 1440 by 810, 1440 by 900, 1920 by 1080, and 390 by 844, plus initial/reverse endpoints, intermediate reveal, day/night previews, and resizing with the workstation visible. No browser console errors were reported.
- `refinement-*.png` document the taller cabinet, desk sleeve, speakers, and can. `reference-*.png` and the older captures document previous composition passes. The browser screenshot surface clips images wider than 1500 pixels, so the full 16:9 capture uses 1440 by 810.

The props and light pools remain intentionally simple. Day/night use inexpensive local lighting and cached contact shadows, not a physically accurate room simulation. Responsive inspection used a desktop browser at mobile dimensions.
