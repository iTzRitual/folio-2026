import assert from "node:assert/strict";
import { BufferGeometry, Float32BufferAttribute, Group, Matrix4, Ray, Vector3 } from "three";
import { sampleSkullSurface, skullParticleLayout } from "@/lib/skullParticles";
import { CONFIG } from "@/config/constants";
import { skullInteractionTransform } from "@/lib/skullInteraction";

const parent = new Group();
const model = new Group();
parent.add(model);
const inverse = new Matrix4();
for (const scale of [0, 1e-8, Number.NaN]) {
  parent.scale.setScalar(scale);
  assert.equal(skullInteractionTransform(model, inverse), false, "Cursor input is rejected while the skull transform is singular or too small");
}
for (const scale of [0.01, 0.4, 1]) {
  parent.scale.setScalar(scale);
  assert.equal(skullInteractionTransform(model, inverse), true, "Cursor input resumes as the skull grows");
  const ray = new Ray(new Vector3(0, 0, 5), new Vector3(0, 0, -1)).applyMatrix4(inverse);
  assert(ray.origin.toArray().every(Number.isFinite) && ray.direction.toArray().every(Number.isFinite));
}

for (const requestedCount of [256, 1000, 4096, 5500, 16384, 65536]) {
  const layout = skullParticleLayout(requestedCount);
  assert.equal(layout.count, requestedCount, "Non-square particle counts are preserved exactly");
  assert(layout.textureSize ** 2 >= requestedCount, "Every visible particle has a simulation texel");
  assert((layout.textureSize - 1) ** 2 < requestedCount, "Simulation storage stays bounded by the requested count");
}
assert.equal(skullParticleLayout(0).count, CONFIG.model.PARTICLE_COUNT_MIN);
assert.equal(skullParticleLayout(1e9).count, CONFIG.model.PARTICLE_COUNT_MAX);
assert.equal(skullParticleLayout(NaN).count, CONFIG.model.PARTICLE_COUNT);

const source = new BufferGeometry();
source.setAttribute("position", new Float32BufferAttribute([
  0, 0, 0, 1, 0, 0, 0, 1, 0,
  4, 0, 0, 6, 0, 0, 4, 2, 0,
], 3));
source.computeVertexNormals();
const original = source.getAttribute("position").array.slice();
const samples = sampleSkullSurface(source, 64);
const repeated = sampleSkullSurface(source, 64);
assert.deepEqual(samples, repeated, "Recreating the simulation preserves the particle arrangement");
assert.deepEqual(source.getAttribute("position").array, original, "Sampling never mutates the cached GLTF geometry");

let largeTriangleCount = 0;
const point = new Vector3();
const normal = new Vector3();
for (let i = 0; i < 64 * 64; i++) {
  point.fromArray(samples.positions, i * 4).add(new Vector3(3, 1, 0));
  assert(Math.abs(point.z) < 1e-6, "Particles stay on the original surface");
  if (point.x >= 4) {
    largeTriangleCount++;
    assert(point.y >= 0 && point.x - 4 + point.y <= 2.000001);
  } else {
    assert(point.x >= 0 && point.y >= 0 && point.x + point.y <= 1.000001);
  }
  normal.fromArray(samples.normals, i * 3);
  assert(Math.abs(normal.length() - 1) < 1e-6, "Surface shading retains unit normals");
  assert(samples.uvs[i * 2] > 0 && samples.uvs[i * 2] < 1);
  assert(samples.uvs[i * 2 + 1] > 0 && samples.uvs[i * 2 + 1] < 1);
}
assert(Math.abs(largeTriangleCount / (64 * 64) - 0.8) < 0.025,
  "Particles follow surface area instead of clustering on densely triangulated features");

const indexed = source.clone();
indexed.setIndex([0, 1, 2, 3, 4, 5]);
assert.deepEqual(sampleSkullSurface(indexed, 64), samples, "Indexed and expanded meshes preserve the same shape");
source.dispose();
indexed.dispose();
console.log("PASS: skull sampling preserves shape, surface density, normals, determinism, and cached geometry.");
