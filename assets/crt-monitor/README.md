# Broadcast CRT monitor

Reference-inspired, unbranded studio monitor. Dimensions are in meters. The screen center is the shared object origin: X horizontal, Y vertical, front facing +Z. The asymmetric enclosure extends behind and below this integration datum. Every exported object has identity location, rotation, and scale.

- `crt-monitor.blend`: editable mesh scene with applied bevels and weighted normals, four materials, and a separate studio collection for preview lighting and camera.
- `crt-monitor.glb`: self-contained real-time asset; excludes lights and camera. No textures, logos, text, or screen content.
- `preview.png` and `front.png`: rendered inspection views.
- `build_crt.py`: reproducible Blender generator.
- `verify_glb.py`, `asset-report.json`, and `validation.json`: geometry and export checks.

## Three.js integration

Load the GLB without rotating it. The exporter deliberately disables Blender's automatic axis conversion because this asset is already authored in the requested Y-up, +Z-front coordinates.

`CRT_Screen` is a separate, UV-mapped 0.352 × 0.264 m (4:3) rectangular convex surface. Its crown is at Z=0; its corners recede to Z=-0.019 m. `CRT_Glass` is the separate peripheral glass lip. Both use the same opaque, glossy smoked-glass material to avoid transparency sorting and transmission costs.

Place an external 0.352 × 0.264 m interface plane at `[0, 0, 0.003]`. This gives 3 mm minimum clearance above the glass crown and fits inside the recessed bezel. Keep it under the same parent transform as the monitor. The interface remains planar; the underlying CRT glass is curved. For a curved interface instead, replace the material of `CRT_Screen` with the external animated texture; its UVs span 0–1.

```jsx
<group>
  <primitive object={monitor.scene} />
  <mesh position={[0, 0, 0.003]}>
    <planeGeometry args={[0.352, 0.264]} />
    <meshBasicMaterial map={desktopTexture} toneMapped={false} />
  </mesh>
</group>
```

The small upper display and power indicator are neutral, unlit hardware, with no additional emissive material. Repeated fittings are joined by category to limit draw calls. The GLB uses four shared PBR materials and no baked textures. This asset is delivered independently; the portfolio scene has not been changed.

## Rebuild

Run Blender in background mode with `--python assets/crt-monitor/build_crt.py` from the project root. Run `python assets/crt-monitor/verify_glb.py` afterward to verify the final binary export. The Blender scene uses a Y-up model convention intentionally; its camera is oriented accordingly.
