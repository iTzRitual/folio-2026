# Portfolio quality verification

Run the architecture and numerical contracts with `npm test`, then `npm run lint`, `npm run typecheck` and `npm run build`. The Quality workflow runs these gates on Ubuntu and Windows after every push to master, using Node 22 and pinned action revisions.

## Mounted browser checks

Use Node 22 or newer and an installed Chrome or Edge. Set `BROWSER_BINARY` when the executable is elsewhere. Each command creates an isolated browser profile and removes it after the run. A positional URL reuses a development server, for example `npm run test:layout -- http://localhost:3000`; without it, the runner starts and stops its own server.

| Command | Contract |
| --- | --- |
| `npm run test:browser` | Production GPU startup, collision, entrance, seams, resting simulation, effect ownership and capture resource cleanup |
| `npm run test:model` | Mounted model topology, compiled transmission samples, simulation activity and video lifecycle through quality and visibility changes |
| `npm run test:layout` | Font-ready DOM mirrors at ten viewports, three Bio variants and fine/coarse input; complete copy, projection, row pitch, horizontal clearance, scroll extent and final Bio reachability |
| `npm run test:portfolio` | Keyboard study entry/reading/return, native focus, responsive reflow and complete history camera handoff |
| `npm run test:scrollbar` | Native capture, outside release, cancellation, resize and subsequent click |
| `npm run test:desktop` | Interrupted app switches and independent return snapshots through native controls |
| `npm run test:recovery` | Missing WebGL, blocked critical model, native context loss during a study lock and disabled JavaScript |

The regression route returns 404 in production. The correctness runner deliberately uses SwiftShader; its timings do not represent GPU performance. Document visibility in the model fixture is simulated. Fine/coarse modes verify input contracts independently of screen size and do not substitute for a physical touchscreen.

## Production profile

After `npm run build`, run `npm run profile:portfolio`. The runner starts a production server automatically; a positional URL can reuse an existing production server. It requires `/lab/regression` to return 404, disables the browser cache and exercises the real root route and loader without fixture state or source edits.

The phases are cold start, settled hero, native orbit-card drag with confirmed pointer ownership, hero-to-details, details at rest, keyboard case study, workstation reveal and rest, native editor dock click and rest, and reverse reveal. Frame samples, long tasks, draw calls, fragment compute draws, framebuffer bindings, WebGL texture/framebuffer/renderbuffer allocation balance, video state and explicit listener registration balance are written to `plans/production-profile/production-profile.json` and a timestamped JSON file. Screenshots record the visible interaction phases. The editor click is projected through the actual CRT mesh and camera; observing its canvas texture in a GPU draw proves that the editor opened.

The profiler uses the browser's default graphics backend and records its reported renderer, drawing-buffer size, viewport and revision. A software fallback must be treated as a software diagnostic. The renderer label alone does not establish display cadence, physical device identity or thermal behavior.

Measurements include probe overhead: WebGL call wrappers, program classification during linking, one sampling RAF and a long-task observer. Frame intervals measure RAF scheduling rather than GPU execution time. Resource counters describe live main-page WebGL2 objects, not VRAM bytes or Three.js render-target instances; worker contexts are outside the probe. Listener balance excludes registrations declared with `once` or an abort signal and does not count property handlers or browser-internal listeners. Geometry readback and screenshots run between measured phases.

Keep the raw JSON when comparing revisions. Repeat on the same device, browser, viewport, power mode and thermal conditions. Establish separate budgets for startup, interaction and settled frames from repeated runs; an average FPS alone cannot describe stalls. No before/after performance gain should be claimed without a comparable baseline.

A physical phone profile remains a separate acceptance step: use remote browser inspection, record device/browser versions and the same interaction phases, and include sustained runs after warming the device. Viewport and pointer emulation verify layout and behavior only.
