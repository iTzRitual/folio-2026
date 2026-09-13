# Workstation reference blockout

The current pass follows the supplied workstation reference: window and music cabinet on the left, CRT at the center, horizontal skateboard above, taped photos between window and monitor, and a large band poster with an upright floor plant on the right. The desk stays frontal. The settled lens is 42 degrees, with a close crop of the desktop and partial legs.

The existing CRT, keyboard, and open-lid turntable GLBs are unchanged. The existing mouse and controller proxies are reused. The desk slab is reused at a 1.30 by 0.82 m footprint. The monitor remains 5.5 cm right of desk center with a -6 degree yaw.

## Editable props

The cabinet is a 2x2 LP unit with four 40.5 cm square openings, 24 mm panels, and a recessed plinth. Its 94.5 cm height is slightly below the preceding 98.25 cm version and above the original 65.5 cm unit. Its base stays on the floor and its top is 22.5 cm above the desktop. Separate dividers sit inside each row, behind uninterrupted horizontal shelves, instead of one full-height central slab. The turntable remains on top and retains its original scale.

The featured sleeve has a backward lean derived from the cabinet-top height. Its entire bottom edge rests on the desk; the top back edge contacts the cabinet's front-right corner. A diagonal orientation keeps the artwork readable and exposes the rear-left speaker. Its placement is checked against the cabinet volume and tabletop bounds. The horizontal skateboard remains 80.5 by 20.32 cm.

The window opening, exterior, sill plant, books, lamp, Monster Energy can, compact speakers, polaroids, poster, skateboard, record storage, and pole-trained monstera are procedural blockouts. Graphics are solid shapes and placeholder typography. The floor plant uses one shared, low-resolution split-leaf geometry. No new asset downloads, textures, or dependencies were added.

The speakers use simple wood-sided boxes with exposed driver discs inspired by the Edifier R1280DB, angled inward by 12 degrees. The left speaker now sits 12 cm farther left than in the preceding pass. The can remains over 23 cm from the mouse. The poster moved 12 cm right, with a projected gap from the unchanged skateboard. The floor plant moved toward the right corner, with shorter lateral reach and smaller leaves while retaining its height and support pole. Camera settings, CRT placement, keyboard, mouse, controller, window, polaroids, and lamp placement are unchanged in this correction pass.

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
- The workstation check covers physical support, grounded cabinet, square LP cubbies, full record-bottom support, record-top contact and cabinet-volume clearance, projected skateboard/poster separation, speaker/monitor clearances, mouse/can spacing, keyboard/cabinet fit, open-lid clearance, monitor/display alignment, horizontal desk framing, camera collision samples, and exact reverse paths at laptop, wide, and mobile aspect ratios. It projects the final frame with the new settled FOV.
- Browser inspection covered 1440 by 810, 1440 by 900, 1920 by 1080, and 390 by 844, plus initial/reverse endpoints, intermediate reveal, day/night previews, and resizing with the workstation visible. No browser console errors were reported.
- `correction-*.png` document the corrected cabinet, supported record, separated wall art, and narrower plant. `refinement-*.png` document the preceding taller cabinet, desk sleeve, speakers, and can. `reference-*.png` and the older captures document previous composition passes. The browser screenshot surface clips images wider than 1500 pixels, so the full 16:9 capture uses 1440 by 810.

The props and light pools remain intentionally simple. Day/night use inexpensive local lighting and cached contact shadows, not a physically accurate room simulation. Responsive inspection used a desktop browser at mobile dimensions.
