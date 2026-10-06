# Nervous skateboard

Finished skateboard replacing the wall blockout. The existing wall position and -90° rotation remain in `CONFIG.workstation`.

The deck is 80.5 × 20.32 cm with an 8 mm maple shell, transverse concave, asymmetric nose/tail kicks, rounded seven-ply edges, a dark grip surface and eight open mounting holes. The outline is measured from the left deck in the owner's `shape-reference.png`, with raster noise smoothed before interpolation. This preserves the long parallel sides and distinct rounded ends of that reference. The 8-inch width includes the rounded edge. The nose/tail bend blends into straight kicks at 15°/13°; side curvature is a modeling approximation because the supplied shape reference is frontal.

The [Skate Warehouse 8-inch blank](https://www.skatewarehouse.com/Skate_Warehouse_Premium_Blank_Deck/descpage-SW80DK.html) was checked as a dimensional reference for the popsicle category. No third-party model was imported. Each veneer band has a uniform edge color; photographed wear stays on the printed face.

`reference.jpg` is a JPEG conversion of the owner's `IMG_7519.HEIC`. The builder uses one affine photo projection with constant scale across the deck and a global skew correction measured between the truck mounts. The graphic is clipped by the silhouette instead of stretched to follow its width. The mounting holes form parallel rectangular patterns aligned with the photographed marks. Only the visible underside is baked into `deck-albedo.jpg` (2048 × 512), preserving the Nervous graphic, Vans/DC stickers, scratches, mounting marks and white circular pads. No replacement artwork was generated. Some lighting and wear from the photograph remain in the base color.

`build_hardware.py` adds two plain matte-black cast trucks, orange bushings, steel axles, washers, mounting screws and locknuts. The owner's `truck-front-reference.png` and `truck-detail-reference.png` supply the shape references; lettering is omitted. Both assemblies align with the existing deck mounting patterns, with kingpins facing inward. Four rounded urethane wheels have recessed bearings and a muted lime-green base color (`#80ad36`), without graphics or texture maps. Their 54 mm diameter and 32 mm width are modeling estimates from the owner's photograph, not measured product specifications. Rounded shoulders use 96 radial segments and normals derived from the rotational profile, avoiding the inward-facing shading at the previous sidewall rim.

The wheel and truck roughness values are 0.78 and 0.72; the black coating is nonmetallic, while exposed steel retains metallic reflections. The worn deck uses roughness 0.88 and a neutral 0.78 linear albedo multiplier, preserving the photograph and its UV mapping. Exposed wood has roughness 0.86. The runtime environment contribution is 0.85 by day and 0.75 at night. These settings soften reflections and reduce excessive brightness without changing the lighting of other workstation objects.

`SkateboardDeck` prefilters the HDR environment into an owned PMREM in a layout effect, before frame rendering, and explicitly assigns that texture to its cloned materials. The inherited scene environment produced visible stripes on the wheels in WebGL despite smooth exported normals and clean Blender renders. Explicit assignment also makes per-material environment intensity effective: Three.js otherwise uses `scene.environmentIntensity` for inherited environments. The PMREM is shared across the skateboard materials and disposed on unmount. Verify lighting changes in the workstation after a full page reload, not only in the Blender previews.

Run from the project root with Blender 4.2 or later:

```sh
python assets/skateboard/trace_outline.py
blender -b --python-exit-code 1 --python assets/skateboard/build_deck.py
python assets/skateboard/verify_shape.py
```

The tracing script requires Pillow; the shape validator requires Pillow and NumPy. The Blender builder reads the saved `shape-profile.json` and needs only Blender's bundled modules. `verify_shape.py` compares horizontal slices of the exported GLB against the supplied silhouette and verifies the final width and length. `shape-check.png` renders the deck vertically without the printed graphic so its outline can be inspected directly.

The builder verifies that the deck mesh is watertight, exports `public/glbs/skateboard-deck.glb` with eight materials and one embedded image, and saves an editable packed `skateboard-deck.blend`, front/profile renders and `asset-report.json`. The `Skateboard_Assembly` root contains the deck and two truck groups. Hardware is consolidated into twelve meshes, including four separate wheels. Blender source coordinates match Three.js: X across the deck, Y along its length, +Z toward the printed underside. The Blender preview applies the wall rotation after export.

`npm test` checks the exported deck dimensions, kick depth, orientation, wall clearance, truck presence, wheel count, diameter and deck clearance alongside the workstation's existing checks. `scripts/check-skateboard.mjs` additionally verifies exported wheel normals and shoulder shading, removal of branding, and matte, non-emissive materials. It accepts an optional GLB path for checking previous exports against the same assertions.
