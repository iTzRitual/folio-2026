# Antialiasing evaluation

Measured on 2026-10-04 against `ee94b58`, using the installed Three.js 0.183.2 and postprocessing 6.38.3.

## Revised decision after screenshot review

The initial SMAA-only workstation solution was insufficient. The user screenshot showed stepped monitor, skateboard and keyboard contours; the former low tier also upscaled a DPR 0.75 canvas. The earlier high-contrast regression test proved that filtering ran, but did not cover the low-contrast gray silhouettes visible in the scene.

Use up to four supported MSAA samples on workstation geometry, and keep the preferred two samples for the portfolio. On hardware offering only four samples, use four for the portfolio too, instead of applying SMAA to already-antialiased SDF text. SMAA High is now the fallback only when neither buffer format supports a multisample count within the four-sample budget.

The adaptive DPR floor is now 1, with the existing high tier at 1.5. The low tier still reduces other effects and render-target budgets. This deliberately trades some performance on weak GPUs for a usable edge-quality floor. DPR 1 still renders below physical resolution on Retina displays; it does not guarantee native-resolution detail.

Only the composer's input buffer, which receives scene geometry, is multisampled. Its output buffer remains single-sampled for fullscreen effects. The existing pass order writes geometry to input, header composition to output, and aberration/fallback AA to screen; if this order changes, revisit that allocation policy. The workstation bypasses the aberration pass because its pointer and scroll inputs are already zero there. Sample changes are guarded, so steady frames do not reallocate buffers.

Negotiate samples from the intersection supported by RGBA16F and DEPTH_COMPONENT24. Renderer-level AA remains off because geometry is rendered into composer buffers.

## Follow-up comparison

Retested at 1374 × 959 CSS pixels with device DPR 2 (2748 × 1918 screenshots, matching the supplied screenshot dimensions), Chrome/ANGLE Metal on Intel Iris Plus. Fixed balanced quality, camera and canvas DPR per variant; the same 180-frame GPU-query methodology as below. The SMAA reference retains the old neutral aberration pass; the revised workstation mode removes it. Comparisons were performed after fixing viewport emulation to stay attached for the entire benchmark.

| Method | Canvas DPR | Median composer GPU time | Median frame interval |
| --- | ---: | ---: | ---: |
| Previous SMAA High, low-resolution tier | 0.75 | 15.16 ms | 25.4 ms |
| SMAA High | 1 | 25.11 ms | 35.9 ms |
| Revised geometry MSAA 4× | 1 | 31.59 ms | 43.7 ms |
| Revised geometry MSAA 4× | 1.5 | 65.92 ms | 79.9 ms |

Matching monitor crops confirm smoother low-contrast outlines with MSAA 4× at DPR 1. Its measured cost exceeds SMAA; the new policy prioritizes correcting the visible defect rather than presenting the previous cheaper filter as sufficient. The DPR 1.5 result rules out forcing that resolution on all devices. These are development-build results on one integrated GPU, not production FPS guarantees.

## Initial hardware comparison (superseded decision)

Chrome 154 headless, ANGLE Metal on Intel Iris Plus Graphics, macOS, 1440 × 900 CSS pixels. The fully revealed workstation used a fixed camera, balanced quality tier and manually fixed DPR per variant. GPU queries confirmed hardware rendering, not SwiftShader. Both relevant framebuffer formats supported 2, 4 and 8 samples.

After 2.5 seconds of warmup per variant, collect 180 frames and asynchronous `EXT_disjoint_timer_query_webgl2` queries around `composer.render`. Discard disjoint results and outstanding queries; 176 completed GPU samples and 179 frame intervals remained per variant. Alternative AA passes were attached only for their respective variant. Capture screenshots after each measurement. The scene's existing animated shaders remained active.

GPU times below cover the main composer, not the earlier CRT/page captures or simulation work. Frame intervals cover the running page. These are sequential development-build measurements on one GPU; they are comparative evidence, not production FPS guarantees or mobile benchmarks.

| Method | DPR | Median composer GPU time | Median frame interval |
| --- | ---: | ---: | ---: |
| No AA | 1 | 23.69 ms | 33.2 ms |
| MSAA 2× | 1 | 29.79 ms | 39.2 ms |
| MSAA 4× | 1 | 37.04 ms | 48.0 ms |
| FXAA | 1 | 24.38 ms | 34.4 ms |
| SMAA High | 1 | 25.04 ms | 35.7 ms |
| No AA | 1.5 | 48.12 ms | 62.4 ms |
| MSAA 4× | 1.5 | 77.28 ms | 92.6 ms |
| SMAA High | 0.75 | 15.16 ms | 23.1 ms |

In the initial comparison, at DPR 1, SMAA added about 1.35 ms (+5.7%) of composer GPU time. MSAA 2× added about 6.10 ms, and MSAA 4× about 13.35 ms. Raising DPR to 1.5 without AA approximately doubled the composer cost. SMAA at DPR 0.75 remained available as the existing adaptive quality system reduced resolution.

A second hero comparison at DPR 1, with the lower quality tier held fixed, measured 3.78 ms without AA, 9.15 ms with MSAA 2× and 5.37 ms with SMAA. All three retained approximately 16.7 ms median frame intervals (60 Hz). MSAA 2× preserved the smooth SDF lettering; SMAA altered it. This supports spending the extra MSAA work in the lighter portfolio stage, not throughout the workstation.

## Regression coverage

`npm run test:browser` exercises real rendering through the production pipeline. It checks diagonal edge coverage at DPR 0.75, 1 and 1.5 in all three pipeline modes, with aberration enabled and disabled; constant-color preservation; the last-pass screen-output contract; repeated mode changes and resizes; no buffer reallocations for unchanged modes; and release of framebuffer and SMAA lookup textures across remounts. It also checks three intermediate coverage levels on low-contrast gray edges where four-sample MSAA is supported, verifies that the output buffer stays single-sampled, and covers four-sample-only negotiation. Hardware without a supported count exercises the SMAA fallback when MSAA is requested. DPR 0.75 remains a pipeline robustness case, but is no longer a production quality tier.

The normal browser command uses SwiftShader for correctness. Performance numbers above came from a separate hardware-backed Chrome session with temporary instrumentation, removed before committing.

The library's [antialiasing guidance](https://github.com/pmndrs/postprocessing/wiki/Antialiasing) explains why renderer-level AA does not replace composer antialiasing. Its [EffectComposer implementation](https://pmndrs.github.io/postprocessing/public/docs/file/src/core/EffectComposer.js.html) also shows why repeatedly assigning a positive sample count reallocates the buffers.
