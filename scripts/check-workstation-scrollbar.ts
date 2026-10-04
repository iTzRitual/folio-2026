import assert from "node:assert/strict";
import { Mesh, MeshBasicMaterial, PlaneGeometry, Ray, Raycaster, Vector2, Vector3 } from "three";
import { createScrollbarPointerSession, createScrollbarUvProjection, isPointerCaptureOwner } from "@/lib/workstationScrollbar";

class TrackedTarget extends EventTarget {
  listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();
  addEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: AddEventListenerOptions | boolean) {
    super.addEventListener(type, callback, options);
    if (callback) {
      const listeners = this.listeners.get(type) ?? new Set();
      listeners.add(callback);
      this.listeners.set(type, listeners);
    }
  }
  removeEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: EventListenerOptions | boolean) {
    super.removeEventListener(type, callback, options);
    if (callback) {
      const listeners = this.listeners.get(type);
      listeners?.delete(callback);
      if (listeners?.size === 0) this.listeners.delete(type);
    }
  }
}

const pointerEvent = (type: string, pointerId: number) => Object.assign(new Event(type), { pointerId });
const terminal = new TrackedTarget();
const surface = new TrackedTarget();
let captured: number | null = null;
let releases = 0;
const owner = {
  setPointerCapture(pointerId: number) { captured = pointerId; },
  hasPointerCapture(pointerId: number) { return captured === pointerId; },
  releasePointerCapture(pointerId: number) {
    assert.equal(pointerId, captured);
    captured = null;
    releases += 1;
    surface.dispatchEvent(pointerEvent("lostpointercapture", pointerId));
  },
};
assert.ok(isPointerCaptureOwner(owner));
assert.equal(isPointerCaptureOwner({ setPointerCapture() {} }), false);
assert.equal(isPointerCaptureOwner(null), false);
const outcomes: boolean[] = [];
const session = createScrollbarPointerSession(terminal, canceled => outcomes.push(canceled));
for (const [index, signal] of ["pointerup", "pointercancel", "lostpointercapture", "blur", "resize", "dispose"].entries()) {
  const pointerId = index + 10;
  assert.equal(session.begin(pointerId, owner, surface), true);
  assert.equal(session.begin(pointerId + 1, owner, surface), false);
  assert.equal(session.pointerId, pointerId);
  terminal.dispatchEvent(pointerEvent("pointerup", pointerId + 1));
  assert.equal(session.pointerId, pointerId, "A different pointer cannot finish the drag");
  if (signal === "lostpointercapture") surface.dispatchEvent(pointerEvent(signal, pointerId));
  else if (signal === "dispose") session.finish();
  else terminal.dispatchEvent(pointerEvent(signal, pointerId));
  assert.equal(session.pointerId, null);
  assert.equal(outcomes.at(-1), signal !== "pointerup");
  assert.equal(session.finish(), false, "Repeated termination is idempotent");
  assert.equal(outcomes.length, index + 1);
  assert.equal(terminal.listeners.size + surface.listeners.size, 0, "Termination detaches all owned listeners");
}
assert.equal(releases, outcomes.length);
assert.throws(() => session.begin(99, {
  ...owner,
  setPointerCapture() { throw new Error("capture failed"); },
}, surface), /capture failed/);
assert.equal(session.pointerId, null);
assert.equal(outcomes.at(-1), true);
assert.equal(terminal.listeners.size + surface.listeners.size, 0);
session.begin(100, {
  ...owner,
  releasePointerCapture() { captured = null; throw new DOMException("Pointer is no longer active", "NotFoundError"); },
}, surface);
assert.equal(session.finish(), true);
assert.equal(session.pointerId, null);
assert.equal(terminal.listeners.size + surface.listeners.size, 0);

const mesh = new Mesh(new PlaneGeometry(2, 2), new MeshBasicMaterial());
mesh.position.set(1.1, -0.5, -2);
mesh.rotation.set(0.2, -0.35, 0.1);
mesh.scale.setScalar(2);
mesh.updateMatrixWorld(true);
const rayAt = (x: number, y: number) => new Ray(new Vector3(x, y, 5), new Vector3(0, 0, -1)).applyMatrix4(mesh.matrixWorld);
const raycaster = new Raycaster();
raycaster.ray.copy(rayAt(-0.25, 0.25));
const hit = raycaster.intersectObject(mesh)[0];
assert.ok(hit?.face);
const project = createScrollbarUvProjection(mesh, hit.face);
const uv = new Vector2();
assert.ok(project(rayAt(0.4, -0.3), uv));
assert.ok(uv.distanceTo(new Vector2(0.7, 0.35)) < 1e-6, "The current ray determines coordinates on the surface");
assert.ok(project(rayAt(0.4, -4), uv));
assert.ok(uv.distanceTo(new Vector2(0.7, 0)) < 1e-6, "Dragging beyond the mesh continues to the scrollbar boundary");
assert.ok(project(rayAt(-4, 4), uv));
assert.ok(uv.distanceTo(new Vector2(0, 1)) < 1e-6, "Both axes clamp outside the surface");
mesh.position.y += 0.6;
mesh.updateMatrixWorld(true);
assert.ok(project(rayAt(0, 0), uv));
assert.ok(uv.distanceTo(new Vector2(0.5, 0.5)) < 1e-6, "Projection follows the current world transform");
mesh.geometry.dispose();
mesh.material.dispose();
console.log("PASS: scrollbar pointer identity, release outside the canvas, cancellation, capture loss, blur, resize, teardown and current off-mesh projection.");
