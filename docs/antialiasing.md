# Antialiasing evaluation

Measured on 2026-10-04 against `ee94b58`, using the installed Three.js 0.183.2 and postprocessing 6.38.3.

## Decision

Use MSAA with up to two supported samples for the portfolio's hero, details and bio. Switch to SMAA High when the workstation surface becomes active. Keep the existing adaptive DPR (0.75 / 1 / 1.5), with antialiasing independent of reduced motion and the optional aberration effect.

SMAA gives the best measured quality/cost balance in the dense workstation scene, including thin monitor and keyboard edges. FXAA costs slightly less but visibly softens the small CRT interface. MSAA preserves the existing SDF text better: close crops showed SMAA introducing roughness into the large, already-antialiased hero lettering. Using different methods across the two render stages avoids that tradeoff where the large text is visible.

The renderer's default framebuffer remains unmultisampled; MSAA must act on the composer's scene buffers. Negotiate samples from the intersection supported by RGBA16F and DEPTH_COMPONENT24, capped by the configured budget. If neither format supports a suitable count, use SMAA. On such devices the text filtering compromise remains. Do not allocate new buffers when the requested mode has not changed. Do not combine both AA methods in a frame.

## Hardware comparison

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

At DPR 1, SMAA added about 1.35 ms (+5.7%) of composer GPU time. MSAA 2× added about 6.10 ms, and MSAA 4× about 13.35 ms. Raising DPR to 1.5 without AA approximately doubled the composer cost. SMAA at DPR 0.75 remained available as the existing adaptive quality system reduced resolution.

A second hero comparison at DPR 1, with the lower quality tier held fixed, measured 3.78 ms without AA, 9.15 ms with MSAA 2× and 5.37 ms with SMAA. All three retained approximately 16.7 ms median frame intervals (60 Hz). MSAA 2× preserved the smooth SDF lettering; SMAA altered it. This supports spending the extra MSAA work in the lighter portfolio stage, not throughout the workstation.

## Regression coverage

`npm run test:browser` exercises real rendering through the production pipeline. It checks diagonal edge coverage at DPR 0.75, 1 and 1.5 in both modes, with aberration enabled and disabled; constant-color preservation; the last-pass screen-output contract; repeated mode changes and resizes; no buffer reallocations for unchanged modes; and release of framebuffer and SMAA lookup textures across remounts. Hardware without a supported count exercises the SMAA fallback when MSAA is requested.

The normal browser command uses SwiftShader for correctness. Performance numbers above came from a separate hardware-backed Chrome session with temporary instrumentation, removed before committing.

The library's [antialiasing guidance](https://github.com/pmndrs/postprocessing/wiki/Antialiasing) explains why renderer-level AA does not replace composer antialiasing. Its [EffectComposer implementation](https://pmndrs.github.io/postprocessing/public/docs/file/src/core/EffectComposer.js.html) also shows why repeatedly assigning a positive sample count reallocates the buffers.
