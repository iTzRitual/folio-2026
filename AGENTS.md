# AGENTS.md

This file provides guidance to Codex when working with code in this repository.

## Commands

- `npm run dev` — start the Next.js dev server
- `npm run build` — production build
- `npm run lint` — ESLint (flat config, `eslint.config.mjs`)

There is no test suite.

## Code style

Do not add explanatory comments to the code. No comments justifying why a line is written a certain way, no comments restating what the code does, no JSDoc unless it already exists on the surrounding API. The code should stand on its own; put the explanation in the commit message or the chat response instead. Leave existing comments alone.

## Commits & PRs

Never append any footer, trailer, or attribution mentioning AI assistance in commit messages, PR descriptions, or anywhere else.

Commits are written entirely in English: a gitmoji title line (e.g. "✨ Add non-JS fallback content"), optionally followed by an English body explaining the change. Push directly to master — do not open pull requests.

## What this project is

An interactive portfolio (Next.js 16 App Router, React 19, TypeScript, Tailwind 4) whose entire desktop Hero/Details UI is rendered inside a WebGL canvas via React Three Fiber, while intentionally looking like a normal flat website. Phase 1 (flat WebGL UI) is done; Phase 2 (camera zoom-out revealing the "website" was a monitor in a 3D workstation scene) is planned — the R3F foundation exists to support that.

## Architecture

Three parallel render paths live in `src/app/page.tsx` (a single client component):

1. **Desktop (WebGL)** — `Scene.tsx` mounts an R3F `<Canvas>` (dynamically imported, `ssr: false`) fixed behind the page. `HeroText`, `Details`, and post-processing effects render *inside the canvas*; the DOM `<main>` is just a scroll spacer driving scroll-linked animation. Its height is `TIMELINE_VIEWPORTS + overflowViewports`, where the overflow is derived from the content — the page grows as copy is added.
2. **Mobile** (`useIsMobile`, <768px) — plain DOM components in `src/components/Mobile/`; the canvas still shows the model but skips hero text, details, and effects.
3. **No-JS fallback** — `src/components/NoJs/` renders real HTML content; the JS app lives under `.js-only-app` (toggled via CSS in `globals.css`).

Key mechanisms that span multiple files:

- **Scroll → 3D animation**: `HeroTransitionProvider` exposes three mutable refs (not state — updated per-frame without re-renders), read in `useFrame` by components inside the canvas. Scroll itself is smoothed by Lenis (`ReactLenis root`), mounted only after the loader finishes. See "Scroll timeline" below for what each ref means.
- **3D responsiveness**: `src/lib/heroSafeZone.ts` computes margins targeting a 16/9 safe zone; `HeroLayoutProvider`/`HeroLayoutContext` converts pixels to 3D units (`pxTo3DWidth/Height`) and exposes layout anchors (`leftX`, `rightX`, row Ys, `responsiveScale`). All in-canvas text positions itself from this context — never hardcode 3D positions for text.
- **Hybrid WebGL/DOM text**: visual text is rendered in WebGL, but synced real HTML elements are kept in the DOM for selection, accessibility, and SEO.
- **Tuning constants**: nearly every animation/layout magic number lives in `src/config/constants.ts` (`CONFIG`, `THEME`, `FONTS`). Put new tunables there, not inline.
- **Content**: all copy (hero, experience, projects, education, skills, bio) is in `src/data/content.ts`. Bio has three interchangeable variants (`bioVariants`), switchable from the Leva panel on `/debug`.
- **Model** (`src/components/Model.tsx`): Draco-compressed `.glb` from `public/glbs/`, `MeshTransmissionMaterial`, custom grab/drag/throw spring physics, idle rotation, and scroll-driven scale/position.
- **Post-processing**: `src/components/Effects/CustomAberration*` is a custom shader effect (chromatic aberration + grid distortion driven by mouse velocity), injected via `@react-three/postprocessing`. Desktop only.
- **Performance**: `<PerformanceMonitor>` in `Scene.tsx` dynamically adjusts canvas DPR (down to 0.75 below 45 FPS, up to 1.5 above 55 FPS).

## Scroll timeline

The desktop page is three stages, and the scroll length is derived from content, not fixed:

1. **Hero** — one viewport.
2. **Details** — Experience, Featured Projects, Education (left column) and Skills (right). Scrolls for as long as its content needs.
3. **Bio** — starts one full viewport below the point where stage 2 finishes scrolling, so it reads as its own screen. Only the sticky title remains from earlier stages.

`HeroTransitionProvider` publishes three refs:

- `progressRef` — 0→1 across the **hero→details transition only**, over an absolute distance of `innerHeight * (VIEWPORTS - 1)`.
- `detailsScrollRef` — pixels scrolled *beyond* that transition. The details group translates by this; that is what makes stages 2 and 3 scroll.
- `modelAnchorRef` — where the model should rest, as **viewport fractions**, published by `Details` and consumed by `Model`.

Two traps live here:

- **Do not collapse `progressRef` into one 0→N timeline.** Every model threshold (`INTERACTION_LOCK_EPSILON`, `SCALE_OUT_*`, `DETAILS_POPUP_*`) is expressed inside 0→1. Stretching the range silently retunes all of them.
- **The transition's ScrollTrigger `end` must be an absolute pixel distance**, not a percentage. It is computed by the same `transitionDistance()` expression that `detailsScrollRef` subtracts, so the two cannot drift. A `"+=50%"` end would make the hero transition lengthen whenever content is added.

## Gotchas that cost real debugging time

- **Depth parallax.** The model group sits at `CONFIG.model.DEPTH_Z` (z=2); details text sits at z≈0; the camera is at z=5. The same world-space Y therefore moves the model ~1.68x further *on screen* than the text. Any position shared between the two must travel as a **viewport fraction**, resolved with `viewport.getCurrentViewport(camera, depth)` on the consuming side. Passing world units across depths makes the model drift ahead while scrolling.
- **Layout lives in exactly one place.** `src/lib/detailsLayout.ts` computes everything in pixels and is called by both `page.tsx` (to size the scroll spacer) and `Details` (to place 3D objects). Never re-derive layout maths locally — `Model.tsx` used to, and its copy silently rotted when fixed section pitch was replaced by a running cursor.
- **Adding a details section** means four edits: the data in `content.ts`, then `STACKED_SECTIONS`, `SECTION_HEADINGS` and `lineCounts` in `detailsLayout.ts`, then a `<DetailsSection>` block in `Details.tsx`. Positions, page height and reveal order all follow automatically. Mirror new copy into `Mobile/` and `NoJs/` too, or those paths silently lose content.
- **Text wrapping is done in JS, deliberately.** Each WebGL text component renders one non-wrapping line, mirrored by one DOM element. `src/lib/textMetrics.ts` measures with a canvas 2D context and greedy-wraps, so both sides receive identical pre-broken lines. Do **not** reach for troika's `maxWidth` — troika breaks lines differently from the browser and would desync the DOM twin that provides selection and SEO.
- **The details curl shader is invisible to hot reload.** `applyCurlShader` (`src/lib/detailsCurl.ts`) injects GLSL from module-level constants, but three keys its program cache on `Material.customProgramCacheKey()`, which defaults to `onBeforeCompile.toString()` — the constants are not part of that string. Editing the GLSL therefore changes nothing until a full page reload. Editing the *function body* does invalidate it. Separately, the details group starts a viewport below the camera, so its programs do not compile at all until you scroll it into view — `onBeforeCompile` not firing at scroll 0 is frustum culling, not a broken material.
- **Measurement is only valid after `document.fonts.ready`.** `useFontsReady` gates it; before that the layout uses an estimated advance. This is not caution — the font family is resolved once from a probe element, so a measurement taken with a fallback font would be cached permanently.
- **Leva schemas must be module-level constants when they contain non-primitives.** An inline schema holding `Object.keys(...)` builds a fresh array every render, re-registers the control continuously and stalls the scene with no console error. The inline schemas in `Model.tsx` are safe only because they hold primitives.

## Verifying changes

The `<Html>` DOM mirrors are the reliable oracle: they are transform-positioned to match the WebGL text exactly, so `getBoundingClientRect()` on them verifies 3D layout numerically. Prefer that over screenshots.

- **Headless layout checks** are the fastest signal: write a scratch script importing `@/lib/detailsLayout` and run `npx tsx` **from the project root** so tsconfig paths resolve. Note that Node has no `document`, so measurement falls back to the estimate and line counts may differ slightly from the browser.
- **In a sandboxed browser, `requestAnimationFrame` is throttled while the pane is hidden.** Consequences: `window.scrollTo` does **not** drive ScrollTrigger or Lenis, so element positions read straight after it are stale. Forcing a frame with a screenshot and *then* reading rects gives correct values.
- **Screenshots there can be a blank light plane** regardless of what the canvas holds — confirmed by temporarily colouring a mesh red and getting the same blank image. Do not conclude "the scene is broken" from a screenshot alone.
- **The intro loader can hang on a warm asset cache** in sandboxed browsers (`useProgress` never reaches 100, and `page.tsx` keeps `overflow: hidden`, so the page looks dead). This is environment-specific, **not a bug to fix**. Bypass it by flipping both `useState(false)` to `useState(true)` at the top of `page.tsx`, and always revert before committing.
- **`npm run lint` is the meaningful lint command**. The nested project copies under `.claude/worktrees/` are excluded from ESLint and Git.

## Routes & debug mode

- `/` — the site. `/debug` renders the same `Home` component but enables the Leva GUI panel and Stats.js (detected via `pathname === "/debug"`). A `[...slug]` catch-all redirects everything else to `/`.
- Leva controls are conditionally registered only in debug mode — keep new debug-only controls behind the `isDebug` flag.
