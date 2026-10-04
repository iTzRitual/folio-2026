# Nervous skateboard deck

Finished deck replacing the wall skateboard blockout. The existing wall position and -90° rotation remain in `CONFIG.workstation`. Trucks and wheels are omitted for this pass.

The deck is 80.5 × 20.32 cm with a 10 mm maple shell, transverse concave, asymmetric nose/tail kicks, rounded seven-ply edges, a dark grip surface and eight open mounting holes. Dimensions and curvature are modeling approximations from the supplied photograph, not manufacturer CAD.

`reference.jpg` is a JPEG conversion of the owner's `IMG_7519.HEIC`. The builder projects that photograph onto the deck using a traced silhouette, then bakes only its visible underside into `deck-albedo.jpg` (2048 × 512). It preserves the Nervous graphic, Vans/DC stickers, scratches, mounting marks and white circular pads. No replacement artwork was generated. Some lighting and wear from the photograph remain in the base color.

Run from the project root with Blender 4.2 or later:

```sh
blender -b --python-exit-code 1 --python assets/skateboard/build_deck.py
```

The builder verifies that the mesh is watertight, exports `public/glbs/skateboard-deck.glb` with three materials and one embedded JPEG, and saves an editable packed `skateboard-deck.blend`, front/profile renders and `asset-report.json`. Blender source coordinates match Three.js: X across the deck, Y along its length, +Z toward the printed underside. The Blender preview applies the wall rotation after export.

`npm test` checks the exported dimensions, kick depth, orientation and wall clearance alongside the workstation's existing checks.
