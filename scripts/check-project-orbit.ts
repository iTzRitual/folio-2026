import assert from "node:assert/strict";
import { CONFIG } from "@/config/constants";
import { createProjectOrbitGeometry, projectOrbitLayout, PROJECT_ORBIT_ASPECT } from "@/lib/projectOrbit";
import { Group, Matrix4, Vector3 } from "three";
import { orbitCollisionTransform, projectCardDistance, projectOrbitCollisionShape } from "@/lib/projectOrbitCollision";
import { projectOrbitEntranceAt, projectOrbitIdleStep } from "@/lib/projectOrbitEntrance";

const intro = CONFIG.projectOrbit;
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
  assert(Math.abs(radius * arc * (1 + 2 * intro.HOLOGRAM_BLEED) / (maxY - minY) - PROJECT_ORBIT_ASPECT) < 1e-6, "Orbit cards retain the original project aspect ratio including glow padding");
  assert(arc < Math.PI * 2 / CONFIG.projectOrbit.COUNT, "Adjacent cards retain a gap around the entire ring");
  const minU = Math.min(...Array.from({ length: uvs.count }, (_, i) => uvs.getX(i)));
  const maxU = Math.max(...Array.from({ length: uvs.count }, (_, i) => uvs.getX(i)));
  assert(minU < 0 && maxU > 1, "The frame glow has room outside the card");
  assert.equal(PROJECT_ORBIT_ASPECT, CONFIG.projectPreview.ASPECT, "The complete project fits without changing its proportions");
  assert(intro.HOLOGRAM_BLEED > intro.HOLOGRAM_GLOW_FADE_END, "Glow fades to zero before the padded mesh ends");
  const halfHeight = arc / PROJECT_ORBIT_ASPECT / 2;
  assert(projectCardDistance(new Vector3(0, halfHeight - 0.001, 1)) < 0, "The shorter card retains collision at its top edge");
  assert(projectCardDistance(new Vector3(0, halfHeight + 0.02, 1)) > 0, "Fragments can pass above the shorter card");
  geometry.dispose();
}

const parent = new Group();
const orbit = new Group();
const simulation = new Group();
parent.add(orbit, simulation);
parent.position.set(2, -3, 2);
parent.rotation.set(0.2, -0.6, 0.4);
orbit.rotation.set(CONFIG.projectOrbit.TILT_X, 0.7, CONFIG.projectOrbit.TILT_Z);
orbit.position.y = CONFIG.projectOrbit.OFFSET_Y;
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

for (const count of [6, 10, 24]) {
  for (const gap of [0.08, 0.42, 0.65]) {
    for (const cardScale of [0.5, 1]) {
      const layout = projectOrbitLayout({ count, gap, cardScale });
      const shape = projectOrbitCollisionShape(layout);
      assert(shape.y > shape.w && shape.z > shape.w, "Every lab setting retains a valid rounded collider");
      const card = createProjectOrbitGeometry(1, layout);
      const positions = card.attributes.position;
      const uv = card.attributes.uv;
      for (let i = 0; i < positions.count; i++) {
        assert(Math.abs(positions.getY(i) - (uv.getY(i) - 0.5) * layout.height) < 1e-6, "Live card size preserves video proportions");
      }
      assert(projectCardDistance(new Vector3(0, 0, 1), 1, 0, layout) < 0, "A card center remains solid after tuning");
      assert(projectCardDistance(new Vector3(0, layout.height / 2 + 0.01, 1), 1, 0, layout) > 0, "Collision height follows live tuning");
      const angle = layout.pitch / 2;
      assert(projectCardDistance(new Vector3(Math.sin(angle), 0, Math.cos(angle)), 1, 0, layout) > 0, "Gaps remain open across the lab control range");
      card.dispose();
    }
  }
}
console.log("PASS: lab layout extremes preserve complete media proportions and matching collision surfaces.");

for (const fps of [20, 30, 60, 120]) {
  let phase = 0;
  for (let frame = 0; frame < fps * 10; frame++) phase += projectOrbitIdleStep(1 / fps);
  assert(Math.abs(phase - intro.SPEED * 10) < 1e-10, "Idle covers the same angle at 20, 30, 60 and 120 FPS");
}
assert.equal(projectOrbitIdleStep(2), 0, "Resuming after a background pause does not jump around the ring");
for (const cardCount of [6, 10, 24]) {
  const arc = projectOrbitLayout({ count: cardCount }).arc;
  const endpoint = projectOrbitEntranceAt(duration, arc).phase;
  const before = (endpoint - projectOrbitEntranceAt(duration - 0.0001, arc).phase) / 0.0001;
  const after = (projectOrbitEntranceAt(duration + 0.0001, arc).phase - endpoint) / 0.0001;
  assert(Math.abs(before - after) < 0.001, "Entrance hands off to idle with continuous angular velocity at every card count");
}
const speedAt = (time: number) => Math.abs((projectOrbitEntranceAt(time + 0.0001).phase - projectOrbitEntranceAt(time).phase) / 0.0001);
const cruiseSpeed = speedAt(0);
assert(Math.abs(speedAt(intro.ENTRANCE_CRUISE_DURATION / 2) - cruiseSpeed) < 0.001, "Cards keep their momentum throughout the first stage");
assert(speedAt(duration / 2) > cruiseSpeed * 0.8, "The ring retains most of its speed halfway through the entrance");
assert(speedAt(duration * 0.9) < cruiseSpeed * 0.05, "The second stage settles gently into idle");
const stageBoundary = intro.ENTRANCE_CRUISE_DURATION;
assert(Math.abs(speedAt(stageBoundary - 0.0001) - speedAt(stageBoundary)) < 0.001, "Braking begins without a velocity jump");
assert.equal(projectOrbitEntranceAt(duration * 0.75).reveal, 1, "The loop closes while the ring is still braking");
let reveal90 = 0;
while (projectOrbitEntranceAt(reveal90).reveal < 0.9) reveal90 += 0.001;
assert(1 - Math.exp(-intro.ENTRANCE_RESPONSE * reveal90) > 0.99, "Cards are fully readable before the entrance settles");
console.log("PASS: orbit timing preserves velocity at handoff, frame-rate-independent idle and prompt entrance opacity.");
