# Sony BVM-8044QD reference model

Photo-inspired broadcast monitor with a recessed lower control bay, ivory pushbuttons, knurled dark knobs, bias/gain wells, panel legends, and a raised Sony wordmark. Front details receive the geometry budget; the top and rear remain simple. Dimensions preserve the portfolio integration and are not a measured factory replica.

- `crt-monitor.blend`: editable scene with applied modifiers and a separate studio collection.
- `crt-monitor.glb`: 56,032 triangles, 32 mesh objects, four shared PBR materials, approximately 1.60 MB. No baked screen content or image textures.
- `preview.png` and `front.png`: inspection renders.
- `build_crt.py` and `refine_bvm.py`: reproducible base model and reference refinement.
- `verify_glb.py`, `asset-report.json`, and `validation.json`: export checks.

## Scene integration

Coordinates are meters, X horizontal, Y vertical, front +Z. Every exported object has identity transforms. The shared origin is the screen center; the housing extends behind and below it. Export axis conversion is disabled deliberately.

`CRT_Screen` preserves its 0.352 × 0.264 m dimensions, positive-Z normals, UVs, and crown at Z=0. `CRT_Glass` supplies the peripheral contour. The portfolio hides these source meshes and uses their geometry in `Phase2CRTScreen` to present the live desktop. `Phase2CRT` remains inside the same final surface group, preserving the reveal and desktop interaction coordinates.

Hardware colors use vertex colors within one shared accent material. The Sony badge and labels are geometry, avoiding additional texture fetches. The control bay has narrow sloped edges around its broad recessed face. Handles have a uniform tube diameter without mounting collars. The live screen margin shares the curved screen shader and reflections instead of using a separate plastic bevel. The green power indicator is colored hardware rather than an additional emissive material.

## Rebuild

From the project root, run Blender in background mode with `--python assets/crt-monitor/build_crt.py`, then run `python assets/crt-monitor/verify_glb.py`. The generator uses Windows Arial and Blender's bundled SVG importer. Copy the validated GLB into `public/glbs/crt-monitor.glb` to update the app.

The wordmark is generated from the [Sony logo SVG on Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Sony_logo.svg), retained as `sony-logo.svg`. The source is marked as a public-domain text logo; Sony remains its respective trademark owner's mark.
