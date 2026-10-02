# Logitech G502 Hero

Reference reconstruction of the G502 Hero from the three supplied product photographs, with the cable omitted. The model includes separate primary buttons, a sculpted palm shell, the left thumb rest, G4/G5 thumb buttons, DPI shift paddle, G7/G8 shoulder buttons, G9 profile button, wheel mode button, knurled nickel wheel, triangular rubber grip texture, cyan DPI indicators and illuminated G mark.

The approximately 75 × 42 × 130 mm envelope includes the thumb rest. This is an authored visual reconstruction, not manufacturer CAD. No third-party model or product-photo texture is included.

`build_mouse.py` generates the geometry, deterministic polymer normal map, packed Blender source, runtime GLB and three studio views. Run from the repository root with Blender 4.2:

```sh
blender -b --python-exit-code 1 --python assets/logitech-g502/build_mouse.py
node scripts/check-workstation.mjs
```

Pass `-- --no-render` to skip the inspection renders. On platforms without macOS Arial, the generator uses Blender's built-in font for the small button legends.

The GLB uses meters, Y up, -Z toward the nose, with the glide pads at Y=0. The original mouse position and -5° yaw are preserved. The React component shares cached geometry and textures, clones and disposes materials, and adjusts environment intensity to the existing day/night lighting. The model participates in the workstation's accessory contact-shadow capture and does not intercept pointer events.

Meshes are merged by material into nine draws. The runtime asset contains embedded textures and no cameras or lights. Exact bounds, triangle count and size are recorded in `asset-report.json`.
