import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const raw = readFileSync(process.argv[2] ?? "public/glbs/skateboard-deck.glb");
const jsonLength = raw.readUInt32LE(12);
const asset = JSON.parse(raw.subarray(20, 20 + jsonLength).toString());
const binary = raw.subarray(28 + jsonLength);

function vectors(index) {
  const accessor = asset.accessors[index];
  const view = asset.bufferViews[accessor.bufferView];
  assert.equal(accessor.componentType, 5126);
  assert.equal(accessor.type, "VEC3");
  const start = (accessor.byteOffset ?? 0) + (view.byteOffset ?? 0);
  return Array.from({ length: accessor.count }, (_, vertex) => [0, 1, 2].map(axis =>
    binary.readFloatLE(start + vertex * (view.byteStride ?? 12) + axis * 4)));
}

const wheels = asset.nodes.filter(node => node.name?.startsWith("Wheel_"));
assert.equal(wheels.length, 4);
for (const wheel of wheels) {
  for (const primitive of asset.meshes[wheel.mesh].primitives) {
    const positions = vectors(primitive.attributes.POSITION);
    const normals = vectors(primitive.attributes.NORMAL);
    const center = [1, 2].map(axis => {
      const values = positions.map(position => position[axis]);
      return (Math.min(...values) + Math.max(...values)) / 2;
    });
    positions.forEach((position, index) => {
      const y = position[1] - center[0], z = position[2] - center[1];
      const radius = Math.hypot(y, z);
      const normal = normals[index];
      assert(Math.abs(Math.hypot(...normal) - 1) < 0.001, "Wheel normals are normalized");
      assert(Math.abs((-z * normal[1] + y * normal[2]) / radius) < 0.001,
        "Wheel shading stays rotationally symmetric without spokes or seams");
      if (radius > 0.015) {
        assert((y * normal[1] + z * normal[2]) / radius >= -0.001,
          "Wheel shoulders do not shade inward and produce a dark pinched rim");
      }
    });
    const material = asset.materials[primitive.material].pbrMetallicRoughness;
    assert(!material.baseColorTexture, "Wheels have no printed graphics");
    assert(material.roughnessFactor >= 0.7 && material.metallicFactor === 0, "Urethane is matte and nonmetallic");
  }
}
assert(!asset.nodes.some(node => /brand|print/i.test(node.name ?? "")), "Truck lettering geometry is removed");
assert(!asset.materials.some(material => /brand/i.test(material.name ?? "")), "Truck branding material is removed");
const truck = asset.materials.find(material => material.name.startsWith("Truck |")).pbrMetallicRoughness;
assert(!truck.baseColorTexture && truck.metallicFactor === 0 && truck.roughnessFactor >= 0.6, "Black truck coating is plain and matte");
const deck = asset.materials.find(material => material.name.startsWith("Nervous |")).pbrMetallicRoughness;
assert(deck.baseColorTexture && deck.roughnessFactor >= 0.8, "Worn deck retains its photograph with a diffuse finish");
assert(deck.baseColorFactor.slice(0, 3).every(value => value > 0.65 && value < 0.9), "Photographed albedo is attenuated without clipping detail");
assert(asset.materials.every(material => !material.emissiveFactor?.some(value => value > 0)), "Skateboard materials do not emit light");
console.log("PASS: skateboard wheel normals, smooth shoulders, unprinted hardware and matte non-emissive materials.");
