import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import * as THREE from "three";
const root = process.cwd();
function moduleFromSource(file, dependencies = {}) {
  const code = ts.transpileModule(readFileSync(path.join(root, file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const loaded = { exports: {} };
  new Function("require", "module", "exports", code)(id => {
    assert(id in dependencies, `Unexpected dependency ${id}`);
    return dependencies[id];
  }, loaded, loaded.exports);
  return loaded.exports;
}
const { CONFIG } = moduleFromSource("src/config/constants.ts");
const { getCRTReferenceFrame } = moduleFromSource("src/lib/crtScreen.ts", { three: THREE, "@/config/constants": { CONFIG } });
const { workstationToScreen, createWorkstationCameraPath } = moduleFromSource("src/lib/workstationFrame.ts", { three: THREE, "@/config/constants": { CONFIG } });
function boundsModel(file) {
  const raw = readFileSync(path.join(root, file));
  const length = raw.readUInt32LE(12);
  const doc = JSON.parse(raw.subarray(20,20+length).toString());
  const binary = raw.subarray(28+length);
  function translations(index) {
    const a = doc.accessors[index], view = doc.bufferViews[a.bufferView];
    const start = (a.byteOffset ?? 0) + (view.byteOffset ?? 0);
    return Array.from({length:a.count}, (_, i) => new THREE.Vector3(...[0,1,2].map(axis => binary.readFloatLE(start+i*(view.byteStride ?? 12)+axis*4))));
  }
  const nodes = doc.nodes.map(node => {
    const group = new THREE.Group();
    group.name = node.name;
    group.position.fromArray(node.translation ?? [0,0,0]);
    group.quaternion.fromArray(node.rotation ?? [0,0,0,1]);
    group.scale.fromArray(node.scale ?? [1,1,1]);
    if (node.mesh !== undefined) {
      const instances = node.extensions?.EXT_mesh_gpu_instancing?.attributes;
      const offsets = instances ? translations(instances.TRANSLATION) : [new THREE.Vector3()];
      for (const primitive of doc.meshes[node.mesh].primitives) {
        const geometry = new THREE.BufferGeometry().setFromPoints(translations(primitive.attributes.POSITION));
        for (const offset of offsets) {
          const box = new THREE.Mesh(geometry);
          box.position.copy(offset);
          group.add(box);
        }
      }
    }
    return group;
  });
  doc.nodes.forEach((node,index) => node.children?.forEach(child => nodes[index].add(nodes[child])));
  const scene = new THREE.Group();
  doc.scenes[doc.scene ?? 0].nodes.forEach(index => scene.add(nodes[index]));
  scene.updateMatrixWorld(true);
  return scene;
}

const crt = boundsModel("public/glbs/crt-monitor.glb");
const keyboard = boundsModel("public/glbs/keyboard.glb");
const desk = boundsModel("public/glbs/workstation-desk.glb");
const turntable = boundsModel("public/glbs/turntable.glb");
const frame = getCRTReferenceFrame(crt);
const C = CONFIG.workstation;
const point = p => new THREE.Vector3(p.x, p.y, p.z);
const workstation = { monitorPosition: C.MONITOR_POSITION, monitorYaw: C.MONITOR_YAW, deskPosition: C.DESK_POSITION };
const settings = { workstation, sceneFraming: { finalFov: C.CAMERA_FINAL_FOV, cameraEnd: C.CAMERA_END, cameraTarget: C.CAMERA_TARGET, cameraCurve: C.CAMERA_CURVE, arcStart: C.CAMERA_ARC_START } };
const toScreen = workstationToScreen(frame, workstation);
const monitorTransform = new THREE.Matrix4().makeTranslation(C.MONITOR_POSITION.x, C.MONITOR_POSITION.y + C.DESK_POSITION.y, C.MONITOR_POSITION.z)
  .multiply(new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(C.MONITOR_YAW)));
const localScreen = new THREE.Vector3(frame.screenCenter.x, frame.screenCenter.y, frame.screenFront + C.CRT_SCREEN_CLEARANCE);
assert(localScreen.clone().applyMatrix4(monitorTransform).applyMatrix4(toScreen).length() < 1e-10, "Actual display maps exactly to the screen origin");
const normal = new THREE.Vector3(0, 0, 1).transformDirection(monitorTransform).transformDirection(toScreen);
assert(normal.distanceTo(new THREE.Vector3(0, 0, 1)) < 1e-10, "Display and interaction normals agree");
crt.applyMatrix4(monitorTransform);
crt.updateMatrixWorld(true);
desk.position.set(C.DESK_POSITION.x, frame.supportY + C.DESK_POSITION.y, C.DESK_POSITION.z);
desk.scale.copy(point(C.DESK_SCALE));
keyboard.position.set(C.KEYBOARD_POSITION.x, frame.supportY + C.KEYBOARD_POSITION.y, C.KEYBOARD_POSITION.z);
keyboard.rotation.y = THREE.MathUtils.degToRad(C.KEYBOARD_ROTATION.y);
turntable.position.set(C.CABINET_POSITION.x + C.TURNTABLE_POSITION.x, frame.supportY + C.CABINET_POSITION.y + C.TURNTABLE_POSITION.y, C.CABINET_POSITION.z + C.TURNTABLE_POSITION.z);
turntable.rotation.y = THREE.MathUtils.degToRad(C.TURNTABLE_ROTATION.y);
const bounds = model => new THREE.Box3().setFromObject(model);
const db = bounds(desk), kb = bounds(keyboard), tb = bounds(turntable), mb = new THREE.Box3();
for (const name of ["CRT_Housing", "CRT_RearCasing", "CRT_RearPowerInlet", "CRT_Handles", "CRT_Stand"]) mb.union(bounds(crt.getObjectByName(name)));
assert(Math.abs(kb.min.y - db.max.y) < 1e-6, "Keyboard rests on desk");
assert(Math.abs(bounds(crt.getObjectByName("CRT_Stand")).min.y - db.max.y) < 1e-6, "Rotated monitor rests on desk");
assert(Math.abs(tb.min.y - frame.supportY - C.CABINET_POSITION.y) < 1e-6, "Turntable rests on cabinet");
assert(!tb.intersectsBox(mb) && !tb.intersectsBox(kb), "Turntable clears monitor and keyboard");
assert(!mb.intersectsBox(kb), "Keyboard clears monitor");
for (const axis of ["x", "z"]) {
  assert(kb.min[axis] > db.min[axis] && kb.max[axis] < db.max[axis], "Keyboard stays on desktop");
  assert(tb.min[axis] > C.CABINET_POSITION[axis] - C.CABINET_SIZE[axis] / 2 && tb.max[axis] < C.CABINET_POSITION[axis] + C.CABINET_SIZE[axis] / 2, "Open turntable fits cabinet footprint");
}
assert(tb.min.z > C.WINDOW_POSITION.z + 0.1, "Open lid clears wall and sill");
assert(tb.max.x < db.min.x, "Cabinet music area clears main desk");
assert(Math.abs(C.CABINET_POSITION.y - C.CABINET_SIZE.y + 0.72) < 1e-6, "Raised cabinet remains grounded");
const speakerBounds = [C.LEFT_SPEAKER_POSITION, C.RIGHT_SPEAKER_POSITION].map((p, i) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(C.SPEAKER_SIZE.x, C.SPEAKER_SIZE.y, C.SPEAKER_SIZE.z));
  mesh.position.set(p.x, frame.supportY + p.y + C.SPEAKER_SIZE.y / 2, p.z);
  mesh.rotation.y = THREE.MathUtils.degToRad(C.SPEAKER_YAW) * (i ? -1 : 1);
  const box = bounds(mesh);
  assert(!box.intersectsBox(mb) && !box.intersectsBox(kb), "Rear speakers clear the monitor and keyboard");
  for (const axis of ["x", "z"]) assert(box.min[axis] > db.min[axis] && box.max[axis] < db.max[axis], "Speakers fit on desktop");
  mesh.geometry.dispose();
  mesh.material.dispose();
  return box;
});
assert(!speakerBounds[0].intersectsBox(speakerBounds[1]), "Speakers remain separate");
assert(Math.hypot(C.ENERGY_CAN_POSITION.x - C.MOUSE_POSITION.x, C.ENERGY_CAN_POSITION.z - C.MOUSE_POSITION.z) > 0.2, "Can leaves mouse working space");
const cubbyWidth = (C.CABINET_SIZE.x - C.CABINET_PANEL * 3) / 2;
const cubbyHeight = (C.CABINET_SIZE.y - C.CABINET_PLINTH - C.CABINET_PANEL * 3) / 2;
assert(Math.abs(cubbyWidth - cubbyHeight) < 1e-8 && cubbyWidth > C.RECORD_SIZE, "Four square cubbies fit LP sleeves");
const lean = Math.acos((C.CABINET_POSITION.y - C.FEATURED_RECORD_POSITION.y) / C.RECORD_SIZE);
const yaw = THREE.MathUtils.degToRad(C.FEATURED_RECORD_YAW);
const recordPoint = (x, y, z) => new THREE.Vector3(x, y, z)
  .applyAxisAngle(new THREE.Vector3(1, 0, 0), -lean)
  .add(new THREE.Vector3(0, C.RECORD_THICKNESS / 2 * Math.sin(lean), 0))
  .applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw)
  .add(point(C.FEATURED_RECORD_POSITION));
const bottom = [-1, 1].map(side => recordPoint(side * C.RECORD_SIZE / 2, 0, -C.RECORD_THICKNESS / 2));
for (const p of bottom) {
  assert(Math.abs(p.y) < 1e-8, "Entire record bottom edge rests on tabletop");
  assert(p.x >= db.min.x && p.x <= db.max.x && p.z >= db.min.z && p.z <= db.max.z, "Record bottom edge stays on desktop");
}
const top = [-1, 1].map(side => recordPoint(side * C.RECORD_SIZE / 2, C.RECORD_SIZE, -C.RECORD_THICKNESS / 2));
const cabinetCorner = point(C.CABINET_POSITION).add(new THREE.Vector3(C.CABINET_SIZE.x / 2, 0, C.CABINET_SIZE.z / 2));
const closest = new THREE.Line3(top[0], top[1]).closestPointToPoint(cabinetCorner, true, new THREE.Vector3());
assert(closest.distanceTo(cabinetCorner) < 0.00001, "Record top edge contacts cabinet corner");
for (let x = 0; x <= 10; x++) for (let y = 0; y < 10; y++) {
  const p = recordPoint((x / 10 - 0.5) * C.RECORD_SIZE, y / 10 * C.RECORD_SIZE, -C.RECORD_THICKNESS / 2);
  assert(p.x >= cabinetCorner.x || p.z >= cabinetCorner.z, "Leaning record stays outside cabinet volume");
}
const reports = [];
for (const [width, height] of [[1440, 900], [1920, 1080], [390, 844]]) {
  const camera = new THREE.PerspectiveCamera(CONFIG.scene.CAMERA_FOV, width / height, 0.1, 1000);
  const viewportHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * CONFIG.scene.CAMERA_REST_Z;
  const planeWidth = Math.max(viewportHeight * camera.aspect, viewportHeight * (1 + C.BROWSER_CHROME_HEIGHT_MULT) * C.PLANE_ASPECT);
  const scale = planeWidth / frame.screenWidth;
  const route = createWorkstationCameraPath(frame, settings, planeWidth, camera.aspect);
  const position = new THREE.Vector3(), target = new THREE.Vector3();
  const samples = [];
  for (let i = 0; i <= 100; i++) {
    route.sample(i / 100, position, target);
    samples.push([...position.toArray(), ...target.toArray()]);
    const native = position.clone().sub(new THREE.Vector3(0, 0, C.PLANE_Z)).divideScalar(scale).applyMatrix4(toScreen.clone().invert());
    assert(!mb.containsPoint(native) && !db.containsPoint(native) && !tb.containsPoint(native), "Camera clears physical assets");
  }
  for (let i = 100; i >= 0; i--) {
    route.sample(i / 100, position, target);
    assert.deepEqual([...position.toArray(), ...target.toArray()], samples[i], "Reverse scroll retraces exact poses");
  }
  assert(position.distanceTo(new THREE.Vector3(0, 0, CONFIG.scene.CAMERA_REST_Z)) < 1e-10, "Initial portfolio camera preserved");
  route.sample(1, camera.position, target);
  camera.fov = C.CAMERA_FINAL_FOV;
  camera.updateProjectionMatrix();
  camera.lookAt(target);
  camera.updateMatrixWorld(true);
  const project = p => p.clone().applyMatrix4(toScreen).multiplyScalar(scale).add(new THREE.Vector3(0, 0, C.PLANE_Z)).project(camera);
  const corners = [-1, 1].map(side => project(new THREE.Vector3(C.DESK_POSITION.x + side * (db.max.x - db.min.x) / 2, db.max.y, db.max.z)));
  assert(Math.abs(corners[0].y - corners[1].y) < 1e-8, "Desk front edge is horizontal");
  const boardRight = project(new THREE.Vector3(C.SKATEBOARD_POSITION.x + C.SKATEBOARD_SIZE.length / 2, frame.supportY + C.SKATEBOARD_POSITION.y, C.SKATEBOARD_POSITION.z));
  const posterLeft = project(new THREE.Vector3(C.POSTER_POSITION.x - C.POSTER_SIZE.x / 2, frame.supportY + C.SKATEBOARD_POSITION.y, C.POSTER_POSITION.z));
  assert(posterLeft.x - boardRight.x > 0.04, "Skateboard and poster have visible separation");
  const screenCenter = project(localScreen.clone().applyMatrix4(monitorTransform));
  assert(Math.abs(screenCenter.x) < 0.8 && Math.abs(screenCenter.y) < 0.8, "CRT remains in frame");
  reports.push({ viewport: [width, height], screenCenter: screenCenter.toArray() });
}
console.log("PASS: monitor/display frame alignment, support, open-lid clearances, frontal framing, camera collision samples, and exact reverse paths at three viewport sizes.");
assert.equal(reports.length, 3);
