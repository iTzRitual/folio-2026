# Production profile baseline

Recorded on 2026-10-04 from production revision a243997. The full interaction profile passed twice after adding native orbit-drag ownership and settled workstation/editor phases.

Environment: Windows, Chrome 154 headless, AMD Radeon RX 6700 XT through ANGLE/D3D11, 1440 × 900 viewport, browser cache disabled. Adaptive drawing-buffer sizes changed from 1440 × 900 to 2160 × 1350, returned to 1440 × 900 during editor opening, then rose again during reverse reveal.

These are instrumented RAF intervals and main-page WebGL2 calls. They are not GPU timer queries, a physical-phone profile, a before/after comparison or a guarantee of display FPS. Probe overhead and the adaptive quality policy are described in [quality-verification.md](quality-verification.md).

| Phase | Frame p95 (ms) | Longest interval (ms) | Long tasks | Mean draws/frame | Fragment compute draws | Live textures at end |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| cold-start | 18.3 | 1539.3 | 12 | 29.0 | 0 | 37 |
| hero-idle | 6.2 | 30.4 | 0 | 75.0 | 1318 | 39 |
| hero-drag | 6.1 | 6.2 | 0 | 75.0 | 1484 | 39 |
| hero-to-details | 6.1 | 12.2 | 0 | 124.6 | 2068 | 40 |
| details-idle | 6.1 | 6.2 | 0 | 139.0 | 0 | 40 |
| case-study | 6.1 | 60.6 | 1 | 51.7 | 0 | 42 |
| workstation-reveal | 6.2 | 981.8 | 6 | 333.6 | 0 | 58 |
| workstation-idle | 6.2 | 12.2 | 0 | 587.0 | 0 | 58 |
| editor-open | 36.4 | 66.6 | 1 | 532.3 | 0 | 57 |
| editor-idle | 6.1 | 12.2 | 0 | 526.0 | 0 | 57 |
| reverse-reveal | 6.2 | 30.3 | 0 | 111.7 | 1622 | 61 |

Details and workstation at rest issue zero fragment compute draws. Active hero physics and the visible transition continue computing. Native orbit dragging acquires and releases the grabbing cursor; the editor phase draws the actual VS Code canvas texture after a native dock click.

The explicit listener balance is 212 before the study, 214 during it and 212 after return. Media are paused throughout Details, study and workstation; one orbit video resumes on returning to the hero. The first reveal allocates desktop, CRT and scene resources, so its texture count cannot be compared directly with the cold hero as a leak test. The GPU ownership suites separately verify teardown against equivalent baselines.

Startup and first reveal contain substantial isolated stalls in this instrumented run. Editor opening also has a 36.4 ms p95; settled editor frames return to approximately 6.1 ms after the adaptive quality change. These transition costs remain visible in the baseline and should guide a separately measured preparation or shader-compilation change. No performance improvement percentage is inferred from these results.

Raw frame samples and phase screenshots are in the ignored plans/production-profile directory. The reusable profiler retains timestamped JSON reports. Repeat under controlled device and thermal conditions before setting acceptance budgets; validate sustained behavior on a physical phone separately.
