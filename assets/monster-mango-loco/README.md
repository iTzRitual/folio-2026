# Monster Juiced Mango Loco 500 ml

Blender-built real-time can replacing the primitive Monster can on the workstation desk. Nominal dimensions: 66 mm diameter, 168 mm height. These are modeling dimensions for a standard 500 ml can, not manufacturer CAD measurements.

The mesh includes tapered shoulders, a domed underside, standing chime, double rolled rim, recessed lid, scored unopened drinking panel, stay-on tab, and rivet. Blender uses Z up; glTF exports Y up, with the label facing +Z and the base at Y=0. The existing desk position and debug controls remain the placement authority.

## Artwork provenance

- Official reference: https://www.monsterenergy.com/sk-sk/energy-drinks/juiced-monster/mango-loco/
- Downloaded front packshot: https://web-assests.monsterenergy.com/mnst/b0338fe0-f091-4fb5-939f-753435b7b9ed.png
- `official-packshot.png` retains the reference unmodified.
- `label.png` is a 1536 × 1024 reconstructed wrap made with the built-in image generation tool from that reference. It is not an official flattened production label. The rear artwork is decorative reconstruction, without invented nutrition or ingredient text. Branding and original artwork belong to their respective owners.
- `texture-prompt.txt` preserves the generation prompt.

## Files and rebuilding

`monster-mango-loco.blend` is editable and contains the packed texture plus preview lighting. `monster-mango-loco.glb` embeds the texture and excludes the studio. The runtime copy is `public/glbs/monster-mango-loco.glb`. Preview images show the front and lid. `asset-report.json` and `import-validation.json` record geometry and export checks.

Run from the repository root:

```powershell
blender -b --python assets/monster-mango-loco/build_can.py
blender -b --python assets/monster-mango-loco/verify_import.py
```

The build script also updates the runtime GLB. Rebuilding the geometry does not regenerate the artwork.
