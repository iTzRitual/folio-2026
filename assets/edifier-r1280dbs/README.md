# Edifier R1280DBs

Walnut speakers with both fabric grilles removed, modeled from the supplied product photograph. The front includes the offset tweeter and protective bridge, flared bass reflex opening, ribbed paper woofer, rubber suspension, Phillips fasteners, empty grille sockets and raised EDIFIER lettering. The right speaker has recessed side controls and an amplifier input panel; the left has passive spring terminals.

The manufacturer's complete product dimensions are 146 × 234 × 196 mm, including the grille. This scene adaptation preserves the former blockout envelope of approximately 145 × 230 × 170 mm. It is a visual reconstruction, not a dimensionally exact manufacturing model. Existing scene positions and opposing 12° yaw angles remain unchanged.

- Reference specifications: [Edifier R1280DBs](https://www.edifier.com/int/us/p/bookshelf-speakers/r1280dbs).
- `build_speakers.py` generates geometry, deterministic wood and paper textures, the packed Blender source, runtime GLB and inspection renders.
- `edifier-r1280dbs.blend` contains the two speakers and inspection lighting.
- `preview.png`, `front.png` and `rear.png` show the studio inspection views.
- `asset-report.json` records exported bounds, triangles, draw calls and file size.

Run from the repository root:

```sh
blender -b --python-exit-code 1 --python assets/edifier-r1280dbs/build_speakers.py
node scripts/check-workstation.mjs
```

Set `EDIFIER_FONT` to an installed condensed bold TrueType font when macOS Arial Narrow Bold is unavailable. Pass `-- --no-render` to export without rendering the three inspection views.

The GLB is written directly to `public/glbs/edifier-r1280dbs.glb`. It contains `Edifier_Passive` and `Edifier_Active`, both centered at the same placement origin, with Y up, +Z front and feet at Y=0. The React component selects each variant and applies the existing workstation placement. The display separation in the Blender source is applied after export.

Meshes are joined by material within each variant to limit draw calls. All textures are embedded; materials use standard glTF metallic/roughness shading with normal maps. No runtime procedural shaders, lights, cameras or animation are included in the GLB. The existing workstation shadow capture includes both speakers. Materials are cloned for day/night environment intensity and disposed on unmount; cached textures and geometries remain shared.
