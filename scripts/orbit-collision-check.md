# Browser GPU regression checks

Run `npm run test:browser` from the project root. The runner starts an isolated Next.js development server and a headless Chromium browser, runs `/lab/regression`, reports failures with a nonzero exit code, and cleans up both processes and its temporary browser profile. It requires Node.js 22 and Chrome or Edge. Set `BROWSER_BINARY` when the browser is installed outside the usual paths.

To reuse a running development server, run `npm run test:browser -- http://localhost:3000`. For interactive inspection, open `/lab/regression` on that server. The route returns 404 in production. `/lab/regression?fixture=portfolio` mounts the production scene with its loader already complete for DOM mirror and keyboard checks; `input=coarse` and `bio=facts` select those fixture variants.

The suite runs the production GPU collision and fragment shaders. It checks fast impacts, overlapping starts, size-dependent gaps, rounded corners, moving cards, spring return, zero-scale startup, entrance momentum at 30/60/120 Hz, reduced motion, pixel-exact seamless settling and paused simulation work. The postprocessing suite checks stable pass ownership across toggles/resizes, neutral output, cleanup after remount, and shared state restoration after a render failure. WebGL or floating-point target failures fail the suite explicitly.

The layout contract runs across ten viewport sizes and all Bio variants, with estimated metrics in `npm test` and loaded browser fonts in this suite. It checks section clearance, model interludes, Bio separation and complete scroll extents. Scene DOM mirror measurements are a separate integration check.

Run `npm run test:portfolio -- http://localhost:3000` for mounted scene checks. The suite uses native keyboard input at mobile fine/coarse and desktop sizes to verify Enter/Space, Tab/Shift+Tab, focus on entry and return, PageDown reading, and the separate external project link. Reduced motion is emulated and verified against the actual DOM mirror across frames; fine-pointer resize must clamp the reading position without another scroll event. Screenshots are saved under `plans/browser-regressions/` for visual inspection.

The automated browser uses SwiftShader for reproducible shader correctness. Its timing does not represent a physical GPU or mobile device. Production performance must be measured on hardware separately.
