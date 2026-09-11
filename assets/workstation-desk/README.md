# Workstation tabletop

Separate, editable **950 × 900 × 28 mm** dark satin tabletop with 4 mm bevels, three bevel segments, and weighted normals. It is 188 triangles, one mesh, one PBR material, and no textures. There are no cameras, lights, legs, or hidden furniture details in the GLB.

The root is centered at the top surface (Y=0), with thickness extending downward. Coordinates are meters, X horizontal, Y up, +Z front. All object transforms are identity. `build_desk.py` generates `workstation-desk.blend` and `workstation-desk.glb`; the production copy is `public/glbs/workstation-desk.glb`.

```powershell
blender -b --python assets/workstation-desk/build_desk.py
python assets/keyboard/verify_glb.py assets/workstation-desk/workstation-desk.glb
Copy-Item assets/workstation-desk/workstation-desk.glb public/glbs/workstation-desk.glb
```

`Phase2Workstation` anchors the top to the existing CRT stand, using the same scale as the CRT screen. Placement, keyboard clearances, debug controls, previews, and the final workstation screenshot are documented in `../keyboard/README.md`. `asset-report.json` contains the verified dimensions, geometry counts, and byte size.
