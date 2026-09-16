# Music cabinet

Blender source for the walnut cabinet and record sleeves. Coordinates match the workstation: X right, Y up, Z toward the front. The origin is the center of the top surface. The cabinet is 0.882 Ã— 0.945 Ã— 0.530 m, including its recessed wooden base.

The three reference images were supplied by the portfolio owner. `prepare_textures.py` extracts the walnut door grain, crops the photographed record spines into a shared atlas, and prepares the Prodigy cover. These are photographic approximations: the spine atlas preserves the collection's printed details and captured reflections rather than reconstructing every individual album.

Run `python assets/music-cabinet/prepare_textures.py`, then `blender --background --python assets/music-cabinet/build_cabinet.py` from the project root. The build writes the packed editable `.blend`, runtime `public/glbs/music-cabinet.glb`, and `preview.png`.

The walnut texture is 2048 × 2048, with mirrored borders for repeat sampling and deterministic fine fibers supplementing the limited-resolution photograph. UVs use a fixed 0.42 × 0.84 m repeat instead of stretching one image over each panel. The Prodigy sleeve stands at the right end of the record row, parallel to the other sleeves, with its spine toward the front and its cover facing right.

The runtime asset has four meshes/materials with embedded JPEG textures. Bevels and normals are applied before export; no procedural shaders or Blender runtime are needed. The separate cover JPEG is also used by the record resting beside the cabinet.
