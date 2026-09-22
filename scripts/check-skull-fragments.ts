import assert from "node:assert/strict";
import { IcosahedronGeometry, Vector3 } from "three";
import { createSkullFragments } from "@/lib/skullFragments";
import { skullParticleLayout } from "@/lib/skullParticles";

const source = new IcosahedronGeometry(1, 3);
const original = source.attributes.position.array.slice();
const fragments = createSkullFragments(source, 12);
const repeated = createSkullFragments(source, 12);
assert.deepEqual(source.attributes.position.array, original, "Fragmentation preserves the cached source geometry");
assert.deepEqual(fragments.samples, repeated.samples, "Fragment centers remain deterministic");
assert.deepEqual(fragments.geometry.attributes.position.array, repeated.geometry.attributes.position.array);
assert(fragments.count > 100, "The shell divides into many independent fragments");
assert(fragments.geometry.attributes.position.count > source.attributes.position.count * 2, "Fragments have inner surfaces and closed boundary walls");
const textureSize = skullParticleLayout(fragments.count).textureSize;
assert.equal(fragments.samples.positions.length, textureSize ** 2 * 4);
const uv = fragments.geometry.attributes.particleUv;
const normals = fragments.geometry.attributes.normal;
const normal = new Vector3();
const point = new Vector3();
const center = new Vector3();
for (let index = 0; index < uv.count; index += 3) {
  const x = Math.floor(uv.getX(index) * textureSize);
  const y = Math.floor(uv.getY(index) * textureSize);
  assert(x + y * textureSize < fragments.count, "Every triangle points to an active simulation texel");
  const sample = (x + y * textureSize) * 4;
  center.fromArray(fragments.samples.positions, sample);
  const radius = fragments.samples.positions[sample + 3];
  assert(radius > 0, "Active fragments have a collision radius");
  for (let offset = 0; offset < 3; offset++) {
    assert.equal(uv.getX(index + offset), uv.getX(index));
    assert.equal(uv.getY(index + offset), uv.getY(index));
    normal.fromBufferAttribute(normals, index + offset);
    assert(Math.abs(normal.length() - 1) < 1e-5, "Glass lighting receives unit normals");
    point.fromBufferAttribute(fragments.geometry.attributes.position, index + offset);
    assert(point.distanceTo(center) <= radius + 1e-6, "Collision sphere encloses every fragment vertex under any rotation");
  }
}
for (let index = fragments.count; index < textureSize ** 2; index++) {
  assert.equal(fragments.samples.positions[index * 4 + 3], 0, "Unused simulation texels cannot collide");
}
fragments.geometry.dispose();
repeated.geometry.dispose();
source.dispose();
console.log("PASS: skull fragments preserve source geometry, form deterministic thick shells, and share rigid simulation coordinates per triangle.");
