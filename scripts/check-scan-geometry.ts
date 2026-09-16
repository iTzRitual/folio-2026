import assert from "node:assert/strict";
import { BufferGeometry, Group, Int16BufferAttribute, Mesh, Vector3 } from "three";
import { createScanGeometry } from "@/lib/scanGeometry";
import { scanProximity } from "@/lib/scanInteraction";

const source = new BufferGeometry();
source.setAttribute("position", new Int16BufferAttribute([
  -16384, -32767, 0,
  16384, -32767, 0,
  0, 32767, 16384,
], 3, true));
source.setAttribute("normal", new Int16BufferAttribute([
  0, 0, 32767,
  0, 0, 32767,
  0, 0, 32767,
], 3, true));
const original = Array.from(source.getAttribute("position").array);
const parent = new Group();
parent.position.set(3, 2, -1);
const node = new Mesh(source);
node.scale.set(0.932, 0.796, 0.932);
parent.add(node);
const geometry = createScanGeometry(node);
const size = geometry.boundingBox!.getSize(new Vector3());
const center = geometry.boundingBox!.getCenter(new Vector3());

assert(geometry.getAttribute("position").array instanceof Float32Array);
assert(Math.abs(size.y - 1) < 1e-6, "Packed geometry must retain unit height after normalization");
assert(center.length() < 1e-6, "Parent translation must not offset the scan field");
assert(Math.abs(size.z - 0.932 / 1.592) < 1e-4, "Front rotation must preserve the decoded proportions");
assert.deepEqual(Array.from(source.getAttribute("position").array), original, "Cached GLTF geometry stays untouched");
assert(source.getAttribute("position").normalized);
const normal = new Vector3().fromBufferAttribute(geometry.getAttribute("normal"), 0);
assert(normal.distanceTo(new Vector3(-1, 0, 0)) < 1e-6, "Normals rotate with the front-facing geometry");
geometry.dispose();
source.dispose();
console.log("Scan geometry checks passed.");

assert.equal(scanProximity(2, 0, 0.35, 0.5, 0.3), 0, "A distant pointer leaves the model unchanged");
assert.equal(scanProximity(0, 0, 0.35, 0.5, 0.3), 1, "A pointer over the model fully activates the local field");
assert.equal(scanProximity(0, 1, 0.35, 0.5, 0.3), 0, "Vertical distance also disables the scan");
assert(Math.abs(scanProximity(0.5, 0, 0.35, 0.5, 0.3) - 0.5) < 1e-12, "Approaching the edge activates smoothly");
assert.equal(scanProximity(-0.5, 0, 0.35, 0.5, 0.3), scanProximity(0.5, 0, 0.35, 0.5, 0.3));
console.log("Scan proximity checks passed.");
