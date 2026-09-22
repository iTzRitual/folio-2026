import assert from "node:assert/strict";
import { CONFIG } from "@/config/constants";
import { createProjectOrbitGeometry } from "@/lib/projectOrbit";
import { Group, Matrix4, Vector3 } from "three";
import { orbitCollisionTransform, projectCardDistance } from "@/lib/projectOrbitCollision";
import { projectOrbitEntranceAt } from "@/lib/projectOrbitEntrance";

const intro = CONFIG.projectOrbit;
const glitchTicks = new Set<number>();
for (let index = 0; index < intro.COUNT; index++) {
  const card = createProjectOrbitGeometry(1, index);
  const offsets = card.attributes.glitchTimeOffset;
  const offset = offsets.getX(0);
  assert(Array.from({ length: offsets.count }, (_, vertex) => offsets.getX(vertex)).every((value) => value === offset), "Every vertex in a card shares its own glitch clock");
  glitchTicks.add(Math.floor(offset * CONFIG.projectPreview.GLITCH_HZ));
  card.dispose();
}
assert.equal(glitchTicks.size, intro.COUNT, "Every card starts at a different glitch timestamp");
const direction = Math.sign(intro.SPEED);
const duration = intro.ENTRANCE_DURATION;
const first = projectOrbitEntranceAt(0);
assert.equal(first.reveal, 0, "The slider stays hidden before it enters");
const initialSpeed = (projectOrbitEntranceAt(0.001).phase - first.phase) / 0.001;
const endingSpeed = (projectOrbitEntranceAt(duration).phase - projectOrbitEntranceAt(duration - 0.001).phase) / 0.001;
assert.equal(Math.sign(initialSpeed), direction, "Entrance follows the existing orbit direction");
assert(Math.abs(initialSpeed) > Math.abs(intro.SPEED) * 20, "Entrance has a deliberate fast start");
assert(Math.abs(endingSpeed - intro.SPEED) < 0.001, "Entrance joins idle rotation without a speed jump");
assert.equal(projectOrbitEntranceAt(duration).reveal, 1, "The loop is fully closed at the end");
for (const fps of [30, 60, 120]) {
  let previous = first;
  for (let frame = 1; frame <= fps * duration; frame++) {
    const current = projectOrbitEntranceAt(frame / fps);
    assert(current.reveal >= previous.reveal, "The revealed arc never shrinks or opens a second hole");
    assert((current.phase - previous.phase) * direction > 0, "Cards never reverse during deceleration");
    previous = current;
  }
}
for (const fraction of [0.1, 0.25, 0.5, 0.75]) {
  const pose = projectOrbitEntranceAt(duration * fraction);
  for (let card = 0; card < intro.COUNT; card++) {
    const angle = card * Math.PI * 2 / intro.COUNT;
    const travel = ((direction * (angle + pose.phase - intro.ENTRANCE_ORIGIN)) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    const point = new Vector3(Math.sin(angle), 0, Math.cos(angle));
    const visible = travel < pose.reveal * Math.PI * 2;
    assert.equal(projectCardDistance(point, pose.reveal, pose.phase) < 0, visible, "Only cards that have emerged can collide");
  }
}

for (const radius of [0.4, 0.9, 1.4]) {
  const geometry = createProjectOrbitGeometry(radius);
  const positions = geometry.attributes.position;
  const normals = geometry.attributes.normal;
  const uvs = geometry.attributes.uv;
  const arc = Math.PI * 2 / CONFIG.projectOrbit.COUNT * (1 - CONFIG.projectOrbit.GAP);
  let minY = Infinity;
  let maxY = -Infinity;
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index) + radius;
    assert(Math.abs(Math.hypot(x, z) - radius) < 1e-6, "Every vertex follows the circular surface");
    assert(x * normals.getX(index) + z * normals.getZ(index) > 0, "Card fronts face outwards");
    assert(Math.abs(Math.atan2(x, z) - (uvs.getX(index) - 0.5) * arc) < 1e-6, "Overflow follows the ring without stretching the video UVs");
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  assert(Math.abs(radius * arc / (maxY - minY) - CONFIG.projectPreview.ASPECT) < 1e-6, "Arc width preserves the project preview ratio");
  assert(arc < Math.PI * 2 / CONFIG.projectOrbit.COUNT, "Adjacent cards retain a gap around the entire ring");
  const maxShift = CONFIG.projectPreview.GLITCH_SLICE + CONFIG.projectPreview.GLITCH_SPLIT;
  const minU = Math.min(...Array.from({ length: uvs.count }, (_, i) => uvs.getX(i)));
  const maxU = Math.max(...Array.from({ length: uvs.count }, (_, i) => uvs.getX(i)));
  assert(minU < -maxShift && maxU > 1 + maxShift, "Both edges have room for fully displaced glitch bands and RGB fringes");
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
