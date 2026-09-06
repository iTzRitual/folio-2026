# Sony BVM-8044QD reference model

Photo-inspired broadcast monitor with a recessed lower control bay, ivory pushbuttons, knurled dark knobs, bias/gain wells, panel legends, and a raised Sony wordmark. Front details receive the geometry budget; the top and rear remain simple. Dimensions preserve the portfolio integration and are not a measured factory replica.

- `crt-monitor.blend`: editable scene with applied modifiers and a separate studio collection.
- `crt-monitor.glb`: 63,878 triangles, 31 mesh objects, four shared PBR materials, approximately 2.03 MB. No baked screen content or image textures.
- `preview.png` and `front.png`: inspection renders.
- `build_crt.py` and `refine_bvm.py`: reproducible base model and reference refinement.
- `verify_glb.py`, `asset-report.json`, and `validation.json`: export checks.

## Scene integration

Coordinates are meters, X horizontal, Y vertical, front +Z. Every exported object has identity transforms. The shared origin is the screen center; the housing extends behind and below it. Export axis conversion is disabled deliberately.

`CRT_Screen` preserves its 0.352 × 0.264 m dimensions, positive-Z normals, UVs, and crown at Z=0. `CRT_Glass` supplies the peripheral contour. The portfolio hides these source meshes and uses their geometry in `Phase2CRTScreen` to present the live desktop. `Phase2CRT` remains inside the same final surface group, preserving the reveal and desktop interaction coordinates.

Hardware colors use vertex colors within one shared accent material. The Sony badge and labels are geometry, avoiding additional texture fetches. The logo rail below the screen is approximately 40 mm high, compared with 22 mm side rails. The controls and lower enclosure sit 25 mm lower while the screen datum stays fixed. The complete 450 mm control fascia is uniformly inset, including both ends behind the handles. The separate control-bay border has been removed. The front opening is cut directly in the shell without a Boolean modifier. Handles have a uniform tube diameter without mounting collars. The live screen margin shares the curved screen shader and reflections instead of using a separate plastic bevel. The green power indicator is colored hardware rather than an additional emissive material.

## Rebuild

From the project root, run Blender in background mode with `--python assets/crt-monitor/build_crt.py`, then run `python assets/crt-monitor/verify_glb.py`. The generator uses Windows Arial and Blender's bundled SVG importer. Copy the validated GLB into `public/glbs/crt-monitor.glb` to update the app.

The wordmark is generated from the [Sony logo SVG on Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Sony_logo.svg), retained as `sony-logo.svg`. The source is marked as a public-domain text logo; Sony remains its respective trademark owner's mark.

The rear section is extended by 35% behind Z=-0.03 m, preserving the screen and front controls. The TALLY diffuser sits roughly 9 mm behind the fascia in an open, sloped recess.

The Sony badge uses high-resolution vector contours, a closed quad-ring O, flat front normals and smooth side normals. The problematic serif bevel is removed. badge-detail.png is a close-up inspection render.
