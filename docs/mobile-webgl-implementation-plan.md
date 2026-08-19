# Responsive WebGL implementation plan

## Objective

Replace the temporary JavaScript mobile page with the shared React Three Fiber scene, preserving the desktop experience while adding narrow composition, scroll-safe touch input, adaptive quality, and mobile case studies.

The No-JS HTML path remains independent and intact.

## Architecture

### Responsive capabilities

Introduce one capability model with independent values for:

- Layout: wide, narrow, and compact-height modifier.
- Input: fine or coarse pointer.
- Quality: adaptive effect tier.

The page uses input capability to select Lenis or native scroll. The canvas derives layout from its measured CSS size. Components consume only the capability they need.

### Shared layout

Extend `detailsLayout.ts` as the only pixel-space layout authority. Its narrow branch owns:

- Experience → Skills → model interlude → Projects → Education → Courses.
- Two-column Skills grid with a measured one-column fallback.
- Mobile project activation geometry and preview-zone anchors.
- Separate Bio stage with heading → image → copy.
- Content-driven page overflow for every supported viewport.

The desktop calculation remains unchanged unless a shared type requires extension.

### Shared render path

Mount Header, HeroText, Details, curl, project preview, case studies, and post-processing for both layout modes. Remove `MobileHero` and `MobileContent` from the JavaScript render path.

### Input adapters

- Fine pointer retains model drag, hover preview, hold-to-external behavior, and Lenis.
- Coarse pointer disables model direct manipulation, uses native page scroll, activates project previews from scroll position, and opens case studies by tapping project rows.
- Mobile case studies use a native full-viewport internal scroll container whose offset drives the existing WebGL copy.

### Performance and motion

- Keep frame values in refs and mutate Three/DOM objects outside React render loops.
- Use lower mobile transmission and post-processing settings before removing decorative effects.
- Preserve scroll-driven aberration with reduced mobile intensity.
- Disable decorative movement and spatial camera flights under reduced motion while retaining opacity/state feedback.

## Delivery sequence

1. Add responsive capability calculation, context, and page scroll-source selection.
2. Extend HeroLayout and Header/Hero components for narrow and compact-height compositions.
3. Extend details layout and rendering for the accepted mobile order, Skills grid, model interlude, and Bio.
4. Add scroll-driven active-project state, fixed preview zone, scrim, and mobile project-row behavior.
5. Enable and adapt case-study state, camera entry, native internal scroll, sticky return, and image external action.
6. Enable mobile post-processing quality rules and coarse-pointer model restrictions.
7. Remove the temporary mobile JavaScript branch and verify all render paths.

## Regression matrix

### Mandatory viewport fixtures

- 320×568, coarse pointer, portrait.
- 568×320, coarse pointer, compact landscape.
- 390×844, coarse pointer, modern portrait.
- 430×932, coarse pointer, large portrait.
- 768×1024 and 1024×768, coarse pointer tablet.
- Narrow desktop window with fine pointer.
- Existing wide desktop fixtures with fine pointer.

### Functional assertions

- Header availability, theme toggle, and Contact are reachable on narrow layouts.
- Hero text and DOM twins do not collide and the title settles into one sticky line.
- Swiping from the model scrolls the document on coarse input.
- All Details content is present in accepted order and page height follows measured content.
- Active project switches stably at the activation line and owns the displayed preview.
- Project tap opens the correct case study and updates history.
- Case-study internal scroll has native touch momentum, restores portfolio position, and supports browser history.
- Sticky return and `View project ↗` have at least 44×44 CSS-pixel hit areas.
- Theme switching, direct project URLs, text selection, keyboard focus, reduced motion, and No-JS fallback continue to work.

### Quality gates

- `npm run lint`
- `npm run build`
- Numerical DOM-twin layout checks after forced browser frames.
- Visual inspection at every mandatory viewport.
- Reduced-motion inspection.
- Performance profiling on a representative mid-range phone when available.
