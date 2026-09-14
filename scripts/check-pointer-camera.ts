import assert from "node:assert/strict";
import { MathUtils, PerspectiveCamera, Raycaster, Vector2, Vector3 } from "three";
import { CONFIG } from "@/config/constants";
import { DEBUG_DEFAULTS } from "@/config/debugSettings";
import { applyPointerCamera, createPointerCameraRuntime } from "@/lib/pointerCamera";

const settings = DEBUG_DEFAULTS.pointerCamera;
const focus = new Vector3(0.2, 0.4, -1);
const base = new PerspectiveCamera(42, 16 / 9, 0.1, 1000);
base.position.set(2, 3, 10);
base.lookAt(focus);
base.updateMatrixWorld();
const distance = base.position.distanceTo(focus);
const right = new Vector3(1, 0, 0).applyQuaternion(base.quaternion);
const pivot = base.position.clone().lerp(focus, settings.focusDepth);
const lensScale = Math.tan(MathUtils.degToRad(base.fov) / 2) /
  (Math.tan(MathUtils.degToRad(26.5) / 2) * Math.max(1, (1920 / 968) / base.aspect));

function run(fps = 60, x = 1, y = 0) {
  const runtime = createPointerCameraRuntime();
  const camera = base.clone();
  runtime.inside = true;
  runtime.targetX = x;
  runtime.targetY = y;
  const step = (reveal = 1, speed = 0, allowed = true) => {
    camera.copy(base);
    applyPointerCamera(runtime, camera, focus, settings, reveal, speed, 1 / fps, allowed);
    camera.updateMatrixWorld();
  };
  const advance = (seconds: number, reveal = 1, speed = 0) => {
    for (let i = 0; i < seconds * fps; i++) step(reveal, speed);
  };
  const leave = () => {
    runtime.leaveX = runtime.targetX;
    runtime.leaveY = runtime.targetY;
    runtime.leaveElapsed = 0;
    runtime.inside = false;
  };
  return { runtime, camera, step, advance, leave };
}

const pose = (camera: PerspectiveCamera) => [...camera.position.toArray(), ...camera.quaternion.toArray()];
const neutral = run(60, 0, 0);
neutral.advance(2);
assert.deepEqual(pose(neutral.camera), pose(base), "Center preserves exact composition");
const small = run(60, 0.02, 0);
small.advance(2);
assert(small.runtime.x > 0, "Reference responds through the center without a deadzone");

const referenceSamples = [[0.1, 0.017410521180925564], [0.25, 0.08994337020833831],
  [0.5, 0.26381949384199344], [1, 0.593528696764706], [2, 0.9082117109145564]];
for (const [seconds, response] of referenceSamples) {
  const test = run();
  test.advance(seconds);
  assert(Math.abs(test.runtime.x - response) < 0.0006, "Response matches the live Shopify damp3 measurements");
}
for (const fps of [30, 60, 120, 144]) {
  const test = run(fps);
  test.advance(1);
  assert(Math.abs(test.runtime.x - (1 - 3 * Math.exp(-2))) < 1e-12, "Critical damping is frame-rate independent");
  test.runtime.targetX = -1;
  test.advance(1);
  assert(Math.abs(test.runtime.x - (-1 + 6 * Math.exp(-2) - 5 * Math.exp(-4))) < 1e-12,
    "Retargeting preserves velocity independently of frame rate");
}

const edge = run();
let previous = 0;
for (let i = 0; i < 900; i++) {
  edge.step();
  assert(edge.runtime.x >= previous && edge.runtime.x <= 1, "Settle has no overshoot or bounce");
  previous = edge.runtime.x;
}
const displacement = edge.camera.position.clone().sub(base.position);
assert(Math.abs(displacement.length() / distance - settings.horizontalStrength * settings.sensitivity * settings.focusDepth * lensScale) < 1e-12);
assert(displacement.clone().normalize().add(right).length() < 1e-12, "Camera translates left for a rightward pointer");
const pivotProjection = pivot.clone().project(edge.camera);
assert(Math.hypot(pivotProjection.x, pivotProjection.y) < 1e-12, "Nearer aim point stays fixed");
assert(focus.clone().project(edge.camera).x < -0.05, "Workstation moves visibly in the same direction as the reference");
const foreground = base.position.clone().lerp(pivot, 0.5);
assert(foreground.project(edge.camera).x > 0, "Foreground and background have genuine spatial parallax");

const vertical = run(60, 0, 1);
vertical.advance(15);
const verticalTravel = vertical.camera.position.clone().sub(base.position);
assert(Math.abs(verticalTravel.length() / displacement.length() - settings.verticalStrength / settings.horizontalStrength) < 1e-12);
assert(verticalTravel.clone().normalize().distanceTo(new Vector3(0, -1, 0)) < 1e-12,
  "Upward pointer lowers the camera while lookAt supplies pitch");
assert(focus.clone().project(vertical.camera).y < 0);
const clamped = run(60, 100);
clamped.advance(15);
assert.deepEqual(pose(clamped.camera), pose(edge.camera), "Pointer uses the entire canvas and clamps outside it");

const heldPose = pose(edge.camera);
edge.runtime.pressed = true;
edge.runtime.targetX = -1;
edge.runtime.targetY = 1;
edge.advance(2, 1, 10);
assert.deepEqual(pose(edge.camera), heldPose, "Press freezes pointer response and pending inertia");
edge.runtime.pressed = false;
edge.step();
assert(edge.runtime.x < 1 && edge.runtime.x > 0.998, "Release eases back into follow from rest");
edge.leave();
edge.advance(15);
assert.deepEqual(pose(edge.camera), pose(base), "Leave settles exactly at center");
const returning = run();
returning.advance(15);
returning.leave();
returning.advance(1);
assert(returning.runtime.x > 0.95, "Leave uses the reference's slow cosine target return");
returning.advance(14);
assert.deepEqual(pose(returning.camera), pose(base));

const scrolling = run();
scrolling.advance(15, 1, 10);
assert(Math.abs(scrolling.runtime.x - 0.4) < 1e-12, "Fast scroll limits settled strength to 40%");
scrolling.advance(15);
assert.equal(scrolling.runtime.x, 1, "Stationary scroll restores full strength");
const reveal = run();
reveal.advance(15);
reveal.runtime.pressed = true;
const progressValues = [0.71, 0.8, 0.95, 1];
const forward = progressValues.map(progress => {
  reveal.step(progress);
  return pose(reveal.camera);
});
for (let i = 3; i >= 0; i--) {
  reveal.step(progressValues[i]);
  assert.deepEqual(pose(reveal.camera), forward[i], "Reveal reverses without accumulating offsets");
}
for (const progress of [0.7, 0.5, 0]) {
  reveal.step(progress);
  assert.deepEqual(pose(reveal.camera), pose(base), "Initial portfolio ignores even a held edge pointer");
}
for (const mouse of [true, false]) {
  const disabled = run();
  disabled.advance(1);
  disabled.runtime.mouse = mouse;
  disabled.step(1, 0, !mouse);
  assert.deepEqual(pose(disabled.camera), pose(base), "Touch, coarse input and reduced motion remove offsets immediately");
  assert.equal(disabled.runtime.velocityX, 0);
}

const referenceCamera = new PerspectiveCamera(26.5, 1920 / 968);
referenceCamera.position.set(0, 0.43848, 1.5383);
const referenceFocus = referenceCamera.position.clone().add(new Vector3(0, -Math.sin(Math.PI / 18), -Math.cos(Math.PI / 18)));
referenceCamera.lookAt(referenceFocus);
const referenceRuntime = createPointerCameraRuntime();
referenceRuntime.x = 1;
referenceRuntime.y = 1;
referenceRuntime.pressed = true;
applyPointerCamera(referenceRuntime, referenceCamera, referenceFocus, { ...settings, focusDepth: 1 }, 1, 0, 1 / 60, true);
assert(referenceCamera.position.distanceTo(new Vector3(-settings.horizontalStrength * settings.sensitivity, 0.43848 - settings.verticalStrength * settings.sensitivity, 1.5383)) < 1e-12,
  "Reference lens and aim distance reproduce Shopify's exact corner translation");

const raycaster = new Raycaster();
const control = new Vector3(0.4, 0.2, -0.5);
const projected = control.clone().project(clamped.camera);
raycaster.setFromCamera(new Vector2(projected.x, projected.y), clamped.camera);
assert(raycaster.ray.distanceToPoint(control) < 1e-10, "Final camera matrices preserve control raycasting");
assert.equal(CONFIG.pointerCamera.SMOOTH_TIME, 1);
console.log("PASS: Shopify response samples, direction, translation, lens adaptation, inertia, recentering, reversible reveal, press stability, input gates, and raycasting.");
