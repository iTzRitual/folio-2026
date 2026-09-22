import assert from "node:assert/strict";
import { CONFIG } from "@/config/constants";
import { createProjectOrbitGeometry } from "@/lib/projectOrbit";
import { Group, Matrix4, Vector3 } from "three";
import { orbitCollisionTransform, projectCardDistance } from "@/lib/projectOrbitCollision";

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

const parent = new Group();
const orbit = new Group();
const simulation = new Group();
parent.add(orbit, simulation);
parent.position.set(2, -3, 2);
parent.rotation.set(0.2, -0.6, 0.4);
orbit.rotation.set(CONFIG.projectOrbit.TILT_X, 0.7, CONFIG.projectOrbit.TILT_Z);
simulation.rotation.set(-1.3, -3.13, -1.57);
const transform = new Matrix4();
const pitch = Math.PI * 2 / CONFIG.projectOrbit.COUNT;
for (const scale of [0.05, 0.8, 1.5]) {
  parent.scale.setScalar(scale);
  simulation.scale.setScalar(scale * 0.8);
  const collider = { object: orbit, radius: scale * 1.4, active: true };
  assert(orbitCollisionTransform(simulation, collider, transform));
  for (let index = 0; index < CONFIG.projectOrbit.COUNT; index++) {
    const angle = index * pitch;
    const center = new Vector3(Math.sin(angle), 0, Math.cos(angle));
    const local = simulation.worldToLocal(orbit.localToWorld(center.clone().multiplyScalar(collider.radius)));
    assert(local.applyMatrix4(transform).distanceTo(center) < 1e-8, "Collision surfaces track the tilted, rotating cards at every scene scale");
    assert(projectCardDistance(center) < 0, "Each visible card has a solid collider");
    const gap = new Vector3(Math.sin(angle + pitch / 2), 0, Math.cos(angle + pitch / 2));
    assert(projectCardDistance(gap) > 0.01, "Every gap stays open in collision geometry");
  }
}
parent.scale.setScalar(0);
assert.equal(orbitCollisionTransform(simulation, { object: orbit, radius: 1, active: true }, transform), null, "Hidden intro geometry cannot produce a singular simulation transform");

console.log("PASS: orbit cards follow the circular surface, preserve preview proportions, face outwards, and retain gaps at every size.");
