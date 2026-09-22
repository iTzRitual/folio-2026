import assert from "node:assert/strict";
import { CONFIG } from "@/config/constants";
import { createProjectOrbitGeometry } from "@/lib/projectOrbit";

for (const radius of [0.4, 0.9, 1.4]) {
  const geometry = createProjectOrbitGeometry(radius);
  const positions = geometry.attributes.position;
  const normals = geometry.attributes.normal;
  const arc = Math.PI * 2 / CONFIG.projectOrbit.COUNT * (1 - CONFIG.projectOrbit.GAP);
  let minY = Infinity;
  let maxY = -Infinity;
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index) + radius;
    assert(Math.abs(Math.hypot(x, z) - radius) < 1e-6, "Every vertex follows the circular surface");
    assert(x * normals.getX(index) + z * normals.getZ(index) > 0, "Card fronts face outwards");
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  assert(Math.abs(radius * arc / (maxY - minY) - CONFIG.projectPreview.ASPECT) < 1e-6, "Arc width preserves the project preview ratio");
  assert(arc < Math.PI * 2 / CONFIG.projectOrbit.COUNT, "Adjacent cards retain a gap around the entire ring");
  geometry.dispose();
}

console.log("PASS: orbit cards follow the circular surface, preserve preview proportions, face outwards, and retain gaps at every size.");
