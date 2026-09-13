# Audio-Technica AT-LP60X · black

Editable, metric Blender asset integrated into the existing workstation reveal. This is the non-Bluetooth AT-LP60X, modeled from the three supplied photographs in `references/`. The [manufacturer's AT-LP60X manual](https://docs.audio-technica.com/us/at_lp60x_um_162501370_v2_en_web_190502.pdf) supplies the approximate external dimensions and confirms the control layout. No existing turntable model was imported.

## Deliverables

- `turntable.blend`: separate named chassis, feet, platter, mat, adapter, tonearm, cartridge, controls, cover and hinges. The preview studio is in a separate collection excluded from export.
- `turntable.glb`: production asset, copied byte-for-byte to `public/glbs/turntable.glb`.
- `build_turntable.py`: reproducible geometry, materials, export, measurements and inspection renders.
- `build_markings.py`, `markings.png`, `marking-rects.json`: one embedded 1024 × 512 RGBA atlas for branding and control markings.
- `front-three-quarter.png`, `near-top.png`, `side.png`: final asset inspection renders.
- `blockout-*.png`, `blockout.blend`, `blockout.glb`: the initial proportional inspection stage.
- `verify_glb.py`, `verify_import.py`, `verify_scene.mjs`: structural, Blender round-trip, contact, clearance and projection checks.
- `asset-report.json`, `model-measurements.json`, `import-validation.json`, `scene-validation.json`, `browser-validation.json`: validation evidence.
- `workstation-1280x720.jpg`, `workstation-1440x900.jpg`, `workstation-1920x1080.jpg`: actual application captures.

## Coordinates and dimensions

The workflow follows the keyboard: metric units, one unit per meter, X right, Y up, +Z toward the front, GLB export with `export_yup=False`. `Turntable_ROOT` sits at Y=0, the bottom of all four isolation feet. Mesh dimensions are baked into geometry; exported scales are one.

The closed physical envelope is approximately **359.5 × 373.3 × 97.5 mm** (width × depth × height). The front branding decal extends the measured depth by 0.04 mm. With the lid open 65°, the full envelope is approximately **359.5 × 407.83 × 382.42 mm**. `model-measurements.json` records both poses.

`DustCover_HingePivot` is at `(0, 0.051, -0.179)` in source meters. Zero X rotation closes it; negative X rotation opens it. Its default X rotation is -65°. `Tonearm_Pivot` is a separate editable parent; cartridge, stylus and headshell remain separate children. There is no large counterweight, anti-skate dial, detachable DJ headshell, Bluetooth switch or Bluetooth branding.

The normal Blender glTF importer converts Y-up GLB coordinates to Blender Z-up. The re-import validator accounts for this conversion; the authoring `.blend` deliberately retains the workstation's Y-up convention.

## Materials and cost

Eight shared materials cover satin black chassis, dark controls/cartridge, felt, silver metal, rubber, ivory stylus, acrylic and printed markings. No procedural shaders, baked lighting, external images, cameras or lights are exported. Alpha-masked markings share one packed atlas; the logo and typography are lightweight approximations.

The cover has a closed thin shell with 2 mm wall thickness and a 2 mm roof. Standard glTF `BLEND`, low gray opacity and single-sided surfaces preserve clear geometry without a transmission render pass. Three.js's GLTFLoader disables depth writes for this alpha mode. Planar cover faces retain flat normals to prevent diagonal shading artifacts. The underside and feet participate in the existing cached contact-shadow pass; transparent cover pieces are excluded from that opaque depth capture.

The GLB preserves the useful object hierarchy: 62 mesh nodes, **38,570 rendered triangles**, **890,380 bytes (869.51 KiB)**. The exact material count, file size and SHA-256 are also in `asset-report.json`.

## Scene placement

Defaults live in `CONFIG.workstation`:

| Setting | Value |
| --- | --- |
| URL | `/glbs/turntable.glb` |
| Position, relative to the desk contact plane | X 0.635 m, Y 0, Z -0.320 m |
| Rotation | X 0°, Y -3°, Z 0° |
| Scale | 1 |
| Effective support Y in CRT asset coordinates | -0.2808662057 m |

The right side provides visible space with the tonearm on the outer edge. The initial closer placement partly hid the platter behind the CRT housing; moving right and back reveals the platter and leaves the CRT dominant. The final conservative clearances are about 216 mm from the CRT on X, 282 mm from the keyboard on X, 360 mm from the wall and 474 mm from the desk's front edge. The open lid is included in collision bounds.

`WorkstationEnvironment.tsx` loads and clones the prop beside the keyboard, disables mesh raycasting, uses the same CRT reference frame, and includes an opaque clone in the existing idle-scheduled shadow capture. No new continuous shadow pass is added. `/debug` exposes position, rotation and scale through the existing module-level Workstation schema. Editing those settings invalidates the cached shadow.

The CRT, keyboard, desk, camera and reveal/return logic are unchanged. At narrow portrait widths the secondary prop extends beyond the right crop; it does not change the existing responsive camera or obstruct the CRT. The three requested desktop viewports retain the entire turntable.

## Rebuild and validate

Run from the repository root with Blender 5.2.1 and Python with Pillow available:

```powershell
python assets/turntable/build_markings.py
blender -b --python-exit-code 1 --python assets/turntable/build_turntable.py
Copy-Item assets/turntable/turntable.glb public/glbs/turntable.glb
python assets/turntable/verify_glb.py
blender -b --python-exit-code 1 --python assets/turntable/verify_import.py
node assets/turntable/verify_scene.mjs
npm run lint
npm test
npm run build
npm run typecheck
```

Use `-- --blockout` for the proportional stage or `-- --no-render` to skip inspection renders. `-- --cover-angle 65` sets the exported lid pose; changing it requires updating the round-trip angle check and rerunning placement validation. Set `TURNTABLE_FONT` and `TURNTABLE_BOLD_FONT` to TrueType fonts when Windows Arial is unavailable.

## Intentional simplifications

This is a photograph-matched real-time model, not manufacturer CAD. Hidden belt drive, motor, internal automation, underside screw detailing, rear sockets and cables are omitted. Felt and satin plastic use uniform roughness, without noise textures or wear. Small logo strokes, lettering, stylus geometry and hinge pins are simplified for workstation viewing distances. The cover uses alpha blending rather than refractive transmission. The supplied third image shows the adapter removed; the model includes it in its recessed storage position as shown in the first two references.
