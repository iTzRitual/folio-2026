# Case study transition — "Dolly" — implementation plan

You are implementing a chosen prototype into production. The direction is settled;
your job is integration, not redesign.

## 0. Where you work

- **Work only in** `/Users/natan/folio-2026/.claude/worktrees/case-study-dolly`,
  branch `feat/case-study-dolly`, based on `master` (775de83).
- Do **not** touch `/Users/natan/folio-2026` (main checkout) or any other worktree —
  other agents share this repository. Use `git -C <this-worktree>` for git.
- `node_modules` is a symlink to the main checkout; `npm run dev` works as-is.
- Delete this plan file (`DOLLY_PLAN.md`) in your final commit.

## 1. What "Dolly" is

Clicking a project row in Featured Projects opens its case study by **flying the
camera into the hover preview plate**. The plate does not move in world space —
the camera translates to the plate's position and pushes in until the plate fills
the frame. Everything else (the list, the skills column, the headings) scales out
past the frame edges and fades. When the camera lands, the plate is the case
study's opening image and the copy rises from below it; the wheel scrolls the
copy up past the image. `Esc` (or browser back) reverses the whole thing.

The user picked this over three alternatives. Its two known costs, which you are
**not** asked to solve, but must not make worse:

- the list and the plate are coplanar, so the push reads as a zoom rather than
  parallax;
- at landing, the copy starts entirely below the fold — the image is the whole
  first screen, by design.

## 2. Reference implementation

A working, verified prototype lives in the sibling worktree:

```
/Users/natan/folio-2026/.claude/worktrees/case-study-transition/src/app/prototypes/case-study/
```

Read these before writing anything:

| File | What to take from it |
| --- | --- |
| `variants/Dolly.tsx` | The whole choreography: camera lerp, plate placement, list dim, copy placement, wheel scroll. This is the spec. |
| `CaseStudyText.tsx` | Line layout + staggered reveal driven by one 0→1 ref. Port the layout maths; **rewrite the rendering** (see §5.4). |
| `stage.ts` | The `PlateControl` contract between a driver and the plate. Port the idea, not the module-scope singletons. |
| `PreviewPlate.tsx` | Shows exactly which parts of the production plate need a "placed" mode. Do **not** port this file — production already has the real plate. |
| `caseStudies.ts` | The copy shape (`role`, `year`, `stack`, `lede`, `body[]`) and eight written case studies. Reuse the text. |

The prototype is a **simplified stage**: it has no curl, no theme sweep, no DOM
twins, no postprocessing, no scroll-driven sheet. Every one of those is a real
integration problem in production and is enumerated in §4.

To see it running:
```bash
cd /Users/natan/folio-2026/.claude/worktrees/case-study-dolly && npm run dev
```
then open the prototype from its own worktree instead if you want the reference
live (it is on branch `experiment/case-study-transition`, route
`/prototypes/case-study?v=1`).

## 3. Numbers (copy these exactly — they are tuned)

```
FILL         = 0.72   // fraction of the landed frame the plate spans
PLATE_OFFSET = 0.03   // plate centre above frame centre, in frame heights
FLIGHT       = 0.95s  // open duration, ease "power3.inOut"
CLOSE        = 0.71s  // FLIGHT * 0.75, ease "power3.inOut"
```

Derivation, with `CAMERA_Z = 5` (R3F default camera, fov 75, never moved by any
other production code — verified):

```ts
// plate width at rest, from CONFIG.projectPreview
const plateWidth  = viewport.width * CONFIG.projectPreview.WIDTH_FRACTION; // 0.28
// distance at which the plate spans FILL of the frame width
const distance    = (CAMERA_Z * plateWidth) / (FILL * viewport.width);     // ≈1.94
const frameWidth  = plateWidth / FILL;
const frameHeight = frameWidth / (viewport.width / viewport.height);
const em          = frameWidth * 0.019;  // body size for the case study copy
const textWidth   = frameWidth * 0.62;
```

Per frame, with `p` the 0→1 open progress and `anchor` the plate's world position
captured on click:

```ts
camera.position.set(
  lerp(0, anchor.x, p),
  lerp(0, anchor.y, p),
  lerp(CAMERA_Z, distance, p),
);
camera.updateMatrixWorld();
```

Plate: `mode = "placed"`, `x = anchor.x`, `y = anchor.y + PLATE_OFFSET * frameHeight + scroll * p`,
`z = 0`, `width = 0` (keep its rest size — the camera does the growing),
`follow = 1 - p`.

List dim: `clamp((p - 0.2) / 0.35, 0, 1)`.
Copy group origin: `x = anchor.x - textWidth / 2`, `y = plateY - plateHeight/2 - frameHeight * 0.085`.
Copy reveal progress: `clamp((p - 0.72) / 0.28, 0, 1)`, span `0.5`, stagger `0.12` per block.
Wheel: `scrollTarget += (deltaY / size.height) * frameHeight`, clamped to
`[0, layout.height + frameHeight * 0.15]`, damped into `scroll` at coefficient 9.

## 4. Production integration — the problems the prototype did not have

Read each current file before editing; `master` moved after the prototype was
built (a per-frame **theme sweep** landed and touched several of these files), so
treat any line number as approximate and re-derive from the code you find.

### 4.1 The camera is shared with everything

Moving `camera.position` moves the model, the hero text, the header, the details
sheet and the DOM twins. That is the intent for the list, but:

- **DOM twins** (`<Html>` in `DetailsLink`, `Header`, `DetailsText`) are the
  accessible copies of the WebGL text. Once the flight starts they must be
  hidden — set `visibility: hidden` / `pointer-events: none` on the twin layer
  while a case study is open, and restore on close. They must not simply be
  unmounted: unmounting churns the accessibility tree on every open.
- **`CurlEdgeFade`** draws the top/bottom scrims against world Y. It will sit
  over the case study once the camera has moved. Fade its material opacity to 0
  with the same `p` and restore on close.
- **Postprocessing** (`HeaderExclusion`, `CustomAberration`) keeps running; leave
  it alone, but check the case study is not being excluded by the header layer.

### 4.2 The curl must flatten

`src/lib/detailsCurl.ts` exposes module-scope `curlUniforms`, and
`curlUniforms.uCurlBend` is a **global** multiplier over every curled material —
including the preview plate, which composes `applyCurlShader` with its own
glitch shader. A placed, full-frame plate bent around the sheet's fold looks
broken.

`applyCurlSettings(...)` is called from `Details.tsx` in a `useLayoutEffect`, not
per frame, so a per-frame writer can own `uCurlBend` safely:

- ramp `curlUniforms.uCurlBend.value = (prefersReducedMotion ? 0 : 1) * (1 - p)`
  from your driver's `useFrame`;
- on close, let it return to its resting value through the same ramp;
- verify that resizing the window mid-open (which re-runs the layout effect)
  does not leave the bend stuck — if it does, keep your own multiplier and
  re-apply it after the layout effect.

### 4.3 Page scroll must stop driving the sheet

`HeroTransitionProvider` drives `progressRef` and `detailsScrollRef` from
GSAP `ScrollTrigger` over a body of `(CONFIG.scrollTimeline.VIEWPORTS +
overflowViewports) * 100vh`. `Details.tsx` moves the whole sheet by
`detailsScrollRef`. If the user scrolls while a case study is open, the sheet
slides under the camera.

Lock it: on open, record `window.scrollY`, set `overflow: hidden` on
`document.body` (and compensate for the scrollbar so nothing shifts); on close,
restore both. Your own wheel handler (`{ passive: false }`, `preventDefault`)
drives the case-study scroll while open. Do **not** kill the ScrollTrigger
instances — they are shared and re-creating them on close is a bigger risk than
locking the body.

Also note `ProjectPreviewOverlay` already drops the hover when
`progressRef.current < CONFIG.model.DETAILS_POPUP_START`. With the body locked
that guard cannot fire spuriously, but confirm it does not close the plate the
instant the case study opens.

### 4.4 The preview plate needs a "placed" mode

`src/components/DetailsScene/ProjectPreviewOverlay.tsx` is the real plate. It
currently: follows the pointer with damping, derives bend/aberration from pointer
velocity, applies the hold-charge grade, and rides the curl.

Add a placed mode driven by a control object (port `PlateControl` from
`prototypes/case-study/stage.ts`), keeping the existing hover behaviour untouched
when nothing is open:

- `mode: "cursor" | "placed"` — placed snaps to the driver's `x/y/z` instead of
  damping toward the pointer;
- `follow: number` (1 → 0 over the flight) multiplies **all** hover-only terms:
  the velocity bend, the rest aberration (`REST_ABERRATION`) and the rest glitch
  (`REST_GLITCH`). In the prototype, forgetting this left a permanent slice
  across a full-screen image — it is the single most visible bug of the port;
- the colour grade lerps from the hover end of `TUNE_SATURATION` /
  `TUNE_CONTRAST` / `TUNE_BRIGHTNESS` to the charged end as `1 - follow`, so the
  thumbnail comes up to full grade as it becomes the hero;
- `width: number` (0 = keep rest size) — Dolly does not use it, but the contract
  is cheap and the plate is the natural owner;
- keep the plate alive while a case study is open: its `active` condition must
  become `hovered !== null || openIndex !== null`, otherwise it glitches out the
  moment the pointer leaves the row.

The **caption** mesh ("Click for case study" / "Hold for live site") must fade
out as the plate is placed — it is hover chrome and would be baked into the hero
image at full size.

### 4.5 Click currently does nothing — that is the slot

In `DetailsLink.tsx`, `startPress`/`stepHold` implement press-and-hold; at full
charge it calls `twinRef.current?.click()` which opens the live site. The plain
click is explicitly suppressed (`if (event.detail > 0) event.preventDefault()`).

Wire the case study to a **click that is not a completed hold**: on
`pointerup`/click, if `press.opened` is false and the pointer never left the row,
open the case study for that project. The caption already promises exactly this
split, so do not change the copy.

Only project rows get this. `DetailsSection` passes `previewImage`; use the same
signal (a row with a preview is a project) or pass an explicit index/slug.

### 4.6 New WebGL text must join the theme sweep

`master` gained `useSweptColor(role, groupRef, apply)` in
`src/context/ThemeContext.tsx`: colours are driven per-frame by a sweep front
rather than read from a palette. Every `<Text>` you add for the case study must
take its colour through `useSweptColor` with a `ThemeRole`, not a hard-coded hex.
Look at `DetailsLink` or `DetailsText` on current `master` for the call shape.

### 4.7 URL, back button, and what "a separate page" means here

The site is one persistent canvas; a real Next.js route change would tear down
the scene and the video texture. So:

- on open: `history.pushState(null, "", "/projects/<slug>")`;
- on close: `history.back()` if the entry is yours, else `pushState("/")`;
- listen to `popstate` and close when the user presses browser back;
- on a **cold load** of `/projects/<slug>`, the existing catch-all
  (`src/app/[...slug]/page.tsx`) redirects to `/`. Leave that behaviour — a
  deep link landing on the list is acceptable for this pass. Do not build a
  second route.

Add a stable `slug` to each project in `src/data/content.ts`.

### 4.8 Reduced motion

`usePrefersReducedMotion()` is already used throughout. With it on: no camera
flight (jump `p` to 1), no glitch, no staggered reveal — the case study appears,
the copy fades in as one block, `Esc` still closes.

### 4.9 Mobile

`Scene.tsx` guards `Details`, `ProjectPreviewOverlay` etc. behind `!isMobile`.
The case study is desktop-only for this pass; mount it under the same guard.
Do not attempt a touch story.

## 5. Files — expected shape of the change

Nothing below is binding if the code you find disagrees; it is the shape that
fell out of the prototype.

1. **`src/data/content.ts`** — add `slug` plus the case-study fields to each entry
   of `projectsData` (`role`, `year`, `stack`, `lede`, `body: string[]`). Copy the
   eight written case studies from
   `prototypes/case-study/caseStudies.ts`. Keep `PROJECT_PREVIEW_SOURCES` /
   `PROJECT_LOOP_SOURCES` working.

2. **`src/context/CaseStudyContext.tsx`** (new) — `openIndex` as state, `open` /
   `close`, plus refs: `openRef` (0→1), `plateControl`, `anchor`. Follow the
   shape of `ProjectHoverContext` (refs for per-frame values, state only for what
   must re-render). Provide it inside `Scene.tsx` next to `ProjectHoverProvider`.

3. **`src/components/DetailsScene/CaseStudyScene.tsx`** (new) — the driver. Owns
   the GSAP tween on `openRef`, the camera lerp, the plate control writes, the
   list dim, the curl ramp, the body-scroll lock, the wheel handler, the URL
   sync, and renders the copy. This is the port of `variants/Dolly.tsx`.

4. **`src/components/DetailsScene/CaseStudyCopy.tsx`** (new) — the copy block.
   Port the layout maths from `prototypes/case-study/CaseStudyText.tsx` (it wraps
   through the site's own `wrapText` from `@/lib/textMetrics`, converting world
   units to px via `size.width / frameWidth`). Rendering must differ from the
   prototype: colours through `useSweptColor`, and each line needs a DOM twin the
   way `DetailsText` does it, so the case study is selectable and readable by a
   screen reader like the rest of the site.

5. **`src/components/DetailsScene/ProjectPreviewOverlay.tsx`** — placed mode per
   §4.4.

6. **`src/components/DetailsScene/DetailsLink.tsx`** — click opens per §4.5.

7. **`src/components/Details.tsx`** — expose a dim that the driver can raise, or
   let the driver write a module-scope uniform the sections already read. Prefer
   whichever matches the existing pattern; do not rebuild the section components.

8. **`src/components/DetailsScene/CurlEdgeFade.tsx`** — fade with `p`.

9. **`src/components/Scene.tsx`** — mount `CaseStudyScene` under `!isMobile`,
   inside the providers, after `ProjectPreviewOverlay`.

10. **`src/config/constants.ts`** — a `caseStudy` block for the numbers in §3.
    The repo keeps tuning constants there with comments explaining *why* each
    value is what it is; match that voice.

## 6. Conventions (non-negotiable)

- Read `/Users/natan/.claude/CLAUDE.md` and `README.md` in the worktree first.
- `npx tsc --noEmit` and `npx eslint src` must both be clean at every commit.
  The React Compiler lint rules (`react-hooks/immutability`, `react-hooks/refs`)
  will reject mutating a ref handed out by a hook and reading `.current` during
  render — the codebase's existing answer is module-scope mutable objects
  (see `curlUniforms`, `previewUniforms`); follow it rather than disabling rules.
- Comments explain **why**, never what. Match the density and voice of the
  surrounding files — they are unusually well commented; read a few before you
  write one.
- Commit continuously in English gitmoji style (`✨`, `🐛`, `🎨`, `🔥`, `🧪`).
  **Never** add `Co-Authored-By` or any mention of AI/Claude in a commit.
- Do not refactor adjacent code, do not "improve" formatting you did not need to
  touch, do not delete pre-existing dead code.

## 7. Verification — do this, do not skip it

Run the dev server and drive it yourself; do not ask the user to check.

1. `npm run dev` in this worktree, open the site, scroll to Featured Projects.
2. Hover a row — the plate must behave exactly as before your change (this is
   the regression that matters most).
3. Click **Controller Configurator** — it is the only project with a real `.mp4`
   loop, so it is the only row where you can see the video survive the flight.
   The other seven are placeholder SVGs.
4. Confirm, at landing: plate fills the frame, no permanent RGB slice across it,
   caption gone, list gone, title and copy risen from below.
5. Wheel down — the copy scrolls up past the image and the last line is
   reachable. Wheel up returns.
6. `Esc` — the camera returns, the list comes back, the page scroll works again,
   the plate hands back to hover, `uCurlBend` is back to 1 (curl visibly bends
   the sheet at the fold again).
7. Browser back after opening — same as `Esc`.
8. Open, resize the window, close — nothing is stuck.
9. `prefers-reduced-motion: reduce` (emulate it) — open/close still work, no
   flight.
10. Console clean; no dropped frames obvious during the flight.

Report honestly what you verified and what you could not.

## 8. Out of scope

- Mobile/touch.
- A real `/projects/<slug>` route with SSR metadata.
- Changing the hold-to-open-live-site gesture.
- Redesigning the case study layout — it is the prototype's, deliberately.
- Any change to the theme sweep, the model, or the hero.
