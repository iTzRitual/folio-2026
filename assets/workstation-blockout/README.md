# Workstation composition blockout

The existing CRT, keyboard, and open-lid turntable GLBs are unchanged. The desktop slab is reused at a practical 1.30 × 0.82 m footprint. Legs, cabinet, LP sleeves, window opening, exterior, plant, poster, skateboard, controller, mouse, and lamp are temporary procedural proxies.

## Composition

The desk faces the final camera. The monitor sits 5.5 cm right of the desk center (4.2% of its width) with a -6° yaw. The keyboard retains its original scale, with a separate mouse area on its right and the controller to its left. The 53 cm square cabinet sits just left of the desk with its top 6.5 cm lower. Its footprint accommodates the turntable’s open lid and leaves rear clearance. This arrangement keeps the main desktop open; a rear-left desktop placement would put the music controls behind the working area and compress the monitor silhouette.

## Authoring

Open `/debug` and expand the Leva panel:

- **Workstation**: monitor position/yaw, keyboard and turntable transforms, desk dimensions, cabinet and prop positions. Turntable position is relative to the cabinet top; other object heights are relative to the desktop support plane.
- **3D scene framing**: final camera position, viewing target, curve offset, and the point at which lateral/elevation movement begins. Camera coordinates use workstation meters; camera Y values are above the original support plane. The initial pose is deliberately derived from the display frame to preserve the full-screen portfolio.
- **Environment lighting**: explicit day/night preview, window strength, lamp strength, and fill. This does not change the portfolio theme.

Persist selected values in `CONFIG.workstation` in `src/config/constants.ts`. Cabinet/window dimensions, small prop yaw, and light offsets also live there. Proxy geometry is in `src/components/WorkstationBlockout.tsx`.

## Reference frame and reveal

`src/lib/workstationFrame.ts` maps workstation coordinates through the inverse monitor placement into screen-local space. Consequently the housing, glass/display shaders, control geometry, and pointer mesh retain one common reference frame. The monitor has no scroll-dependent position or rotation relative to its desk.

The existing portfolio capture, browser reveal, CRT morph, and surface-fit sequence are retained. The camera first retreats along the display normal, then smoothly introduces a small lateral/elevation curve and a separately controlled viewing target. It finishes with the camera and target sharing the same workstation X coordinate, so the desk front edge remains horizontal. FOV stays unchanged. The capture camera explicitly resets rotation, preserving the flat page rendered inside the CRT.

The path is a pure function of reveal progress. Narrow aspect ratios smoothly recenter framing on the CRT. Reduced motion retains the existing direct transition to the final scene. Static contact shadows are captured once per placement change: one for the desk, one for the cabinet top.

## Verification

- `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` passed.
- `scripts/check-workstation.mjs` checks monitor/display reference alignment, actual GLB support contact, keyboard and open-lid clearances, desk/cabinet footprints, horizontal desk framing, sampled camera/asset collisions, and exact forward/reverse poses at 1440×900, 1920×1080, and 390×844.
- The running application was inspected at all three viewport sizes, with actual screenshots stored here. Early browser context, physical CRT, camera arc, final day/night, and return to portfolio were inspected.
- CRT power off/on, the VS Code dock target, and reverse-scroll restoration from VS Code were exercised through the browser. The initial portfolio composition and actual DOM heading bounds were inspected.
- Production visitor view was smoke-tested on port 3001 with no console errors.
- No asset files were replaced, no loader bypass remains, and no new dependency was introduced.

Screenshots are application captures, not generated artwork. They document a spatial blockout rather than finished modeling. Lighting uses inexpensive unshadowed local lights plus cached vertical contact shadows; it is not a physically accurate room-lighting simulation. Browser checks used the desktop browser at mobile dimensions, not a physical phone. Reduced motion is covered by the existing code path and deterministic pose checks, not an OS-level browser preference test.
