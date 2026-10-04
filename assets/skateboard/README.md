# Nervous skateboard deck

Finished deck replacing the wall skateboard blockout. The existing wall position and -90° rotation remain in `CONFIG.workstation`. Trucks and wheels are omitted for this pass.

The deck is 80.5 × 20.32 cm with an 8 mm maple shell, transverse concave, asymmetric nose/tail kicks, rounded seven-ply edges, a dark grip surface and eight open mounting holes. The outline is measured from the left deck in the owner's `shape-reference.png`, with raster noise smoothed before interpolation. This preserves the long parallel sides and distinct rounded ends of that reference. The 8-inch width includes the rounded edge. The nose/tail bend blends into straight kicks at 15°/13°; side curvature is a modeling approximation because the supplied shape reference is frontal.

The [Skate Warehouse 8-inch blank](https://www.skatewarehouse.com/Skate_Warehouse_Premium_Blank_Deck/descpage-SW80DK.html) was checked as a dimensional reference for the popsicle category. No third-party model was imported. Each veneer band has a uniform edge color; photographed wear stays on the printed face.

`reference.jpg` is a JPEG conversion of the owner's `IMG_7519.HEIC`. The builder projects that photograph onto the deck using a traced silhouette, then bakes only its visible underside into `deck-albedo.jpg` (2048 × 512). It preserves the Nervous graphic, Vans/DC stickers, scratches, mounting marks and white circular pads. No replacement artwork was generated. Some lighting and wear from the photograph remain in the base color.

Run from the project root with Blender 4.2 or later:

```sh
python assets/skateboard/trace_outline.py
blender -b --python-exit-code 1 --python assets/skateboard/build_deck.py
python assets/skateboard/verify_shape.py
```

The tracing script requires Pillow; the shape validator requires Pillow and NumPy. The Blender builder reads the saved `shape-profile.json` and needs only Blender's bundled modules. `verify_shape.py` compares horizontal slices of the exported GLB against the supplied silhouette and verifies the final width and length. `shape-check.png` renders the deck vertically without the printed graphic so its outline can be inspected directly.

The builder verifies that the mesh is watertight, exports `public/glbs/skateboard-deck.glb` with three materials and one embedded JPEG, and saves an editable packed `skateboard-deck.blend`, front/profile renders and `asset-report.json`. Blender source coordinates match Three.js: X across the deck, Y along its length, +Z toward the printed underside. The Blender preview applies the wall rotation after export.

`npm test` checks the exported dimensions, kick depth, orientation and wall clearance alongside the workstation's existing checks.
