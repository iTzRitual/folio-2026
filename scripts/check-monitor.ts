import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BufferGeometry, BufferAttribute, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { createMonitorControls, MONITOR_CONTROLS } from '../src/lib/monitorControls';
import { createMonitorState, MONITOR_DEFAULTS, toggleMonitorButton, setMonitorKnob, resetMonitorKnob, type MonitorKnob } from '../src/lib/monitorState';
import { createMonitorScreenRuntime, createMonitorUniforms } from '../src/lib/monitorScreen';

const file = readFileSync('public/glbs/crt-monitor.glb');
const jsonSize = file.readUInt32LE(12);
const gltf = JSON.parse(file.subarray(20, 20 + jsonSize).toString());
const binary = file.subarray(28 + jsonSize);
const model = new Group();
const arrayTypes = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array, 5121: Uint8Array };
const sizes = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
function attribute(index: number) {
  const accessor = gltf.accessors[index];
  const view = gltf.bufferViews[accessor.bufferView];
  const Type = arrayTypes[accessor.componentType as keyof typeof arrayTypes];
  const size = sizes[accessor.type as keyof typeof sizes];
  assert(!view.byteStride);
  const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const bytes = binary.subarray(start, start + accessor.count * size * Type.BYTES_PER_ELEMENT);
  const copy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return new BufferAttribute(new Type(copy), size, accessor.normalized ?? false);
}
for (const node of gltf.nodes) {
  const primitive = gltf.meshes[node.mesh].primitives[0];
  const geometry = new BufferGeometry();
  for (const [semantic, index] of Object.entries(primitive.attributes)) {
    const names: Record<string, string> = { POSITION: 'position', NORMAL: 'normal', TEXCOORD_0: 'uv', COLOR_0: 'color' };
    if (names[semantic]) geometry.setAttribute(names[semantic], attribute(index as number));
  }
  if (primitive.indices !== undefined) geometry.setIndex(attribute(primitive.indices));
  const mesh = new Mesh(geometry, new MeshStandardMaterial());
  mesh.name = node.name;
  model.add(mesh);
}
const originalVertices = new Map<string, number>();
for (const name of new Set(MONITOR_CONTROLS.flatMap(control => control.sources))) {
  const geometry = (model.getObjectByName(name) as Mesh).geometry;
  originalVertices.set(name, geometry.index?.count ?? geometry.getAttribute('position').count);
}
const controls = createMonitorControls(model);
assert.equal(controls.controls.length, 18);
for (const [name, count] of originalVertices) {
  const vertices = controls.controls.flatMap(control => control.group.children.filter(mesh => mesh.name === `${name}_${control.id}`)).reduce((sum, object) => sum + (object as Mesh).geometry.getAttribute('position').count, 0);
  assert.equal(vertices, count, `${name} preserves every triangle`);
}
const state = createMonitorState();
const screen = createMonitorScreenRuntime();
const uniforms = createMonitorUniforms();
screen.update(uniforms, state, 1 / 60, false);
assert.equal(uniforms.monitorPowerFlash.value, 0);
assert.deepEqual(uniforms.monitorPowerSize.value.toArray(), [1, 1]);
const knobs = controls.controls.filter(control => control.kind === 'knob');
assert.equal(knobs.length, 11);
for (const knob of knobs) {
  const key = knob.id as MonitorKnob;
  setMonitorKnob(state, key, 10);
  controls.syncPhysicalControlsFromState(state, 1, false);
  assert(Math.abs(knob.group.rotation.z + Math.PI * 0.75) < 0.00001);
  assert.equal(controls.resolve(knob.group.children[0]), knob);
  const before = { ...state };
  resetMonitorKnob(state, key);
  assert.deepEqual(state, { ...before, [key]: MONITOR_DEFAULTS[key] });
  setMonitorKnob(state, key, -1);
}
for (const control of controls.controls.filter(control => control.kind === 'button' && control.id !== 'power')) {
  toggleMonitorButton(state, control.id as Parameters<typeof toggleMonitorButton>[1]);
}
screen.update(uniforms, state, 1, false);
toggleMonitorButton(state, 'power');
assert.deepEqual(state, { ...MONITOR_DEFAULTS, power: false });
for (const knob of knobs) setMonitorKnob(state, knob.id as MonitorKnob, 1);
toggleMonitorButton(state, 'blueOnly');
assert.deepEqual(state, { ...MONITOR_DEFAULTS, power: false });
screen.update(uniforms, state, 0.35, false);
assert.equal(uniforms.monitorPowerLevel.value, 0);
toggleMonitorButton(state, 'power');
assert.deepEqual(state, MONITOR_DEFAULTS);
screen.update(uniforms, state, 0.48, false);
assert.equal(uniforms.monitorPowerLevel.value, 1);
for (let i = 0; i < 100; i++) {
  toggleMonitorButton(state, 'blueOnly');
  controls.syncPhysicalControlsFromState(state, 1, false);
}
controls.syncPhysicalControlsFromState(state, 1, false);
for (const control of controls.controls) {
  assert(control.group.position.distanceTo(control.originalPosition) < 1e-8);
  assert(control.group.quaternion.angleTo(control.originalRotation) < 1e-8);
}
assert.equal(uniforms.monitorSync.value, 0);
assert.equal(uniforms.monitorUnderScan.value, 1);
assert(uniforms.monitorGain.value.equals(new Vector3(1, 1, 1)));
controls.dispose();
for (const name of originalVertices.keys()) assert(model.getObjectByName(name)?.visible);
console.log('PASS: 18 controls, 11 knobs, triangle preservation, bounds, isolated resets, off-state lockout, power cycle, neutral uniforms, drift, disposal.');
