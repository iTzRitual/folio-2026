import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import * as THREE from 'three';

const output = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(output, '../..');
function moduleFromSource(file, dependencies = {}) {
  const code = ts.transpileModule(readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const loadedModule = { exports: {} };
  new Function('require', 'module', 'exports', code)(id => {
    assert(id in dependencies, `Unexpected dependency ${id}`);
    return dependencies[id];
  }, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}
const { CONFIG } = moduleFromSource('src/config/constants.ts');
const { getCRTReferenceFrame } = moduleFromSource('src/lib/crtScreen.ts', { three: THREE, '@/config/constants': { CONFIG } });

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
        const accessor = doc.accessors[primitive.attributes.POSITION];
        const min = new THREE.Vector3(...accessor.min), max = new THREE.Vector3(...accessor.max);
        const size = max.clone().sub(min), center = max.clone().add(min).multiplyScalar(.5);
        const geometry = new THREE.BoxGeometry(size.x,size.y,size.z).translate(center.x,center.y,center.z);
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

const crt = boundsModel('public/glbs/crt-monitor.glb');
const keyboard = boundsModel('public/glbs/keyboard.glb');
const desk = boundsModel('public/glbs/workstation-desk.glb');
const frame = getCRTReferenceFrame(crt);
const k = CONFIG.phase2.KEYBOARD_POSITION, r = CONFIG.phase2.KEYBOARD_ROTATION;
const d = CONFIG.phase2.DESK_POSITION, s = CONFIG.phase2.DESK_SCALE;
desk.position.set(d.x, frame.supportY+d.y, d.z);
desk.scale.set(s.x,s.y,s.z);
keyboard.position.set(k.x,frame.supportY+d.y+k.y,k.z);
keyboard.rotation.set(...[r.x,r.y,r.z].map(THREE.MathUtils.degToRad));
keyboard.scale.setScalar(CONFIG.phase2.KEYBOARD_SCALE);
const keyboardBounds = new THREE.Box3().setFromObject(keyboard);
const deskBounds = new THREE.Box3().setFromObject(desk);
const standBounds = new THREE.Box3().setFromObject(crt.getObjectByName('CRT_Stand'));
const crtBounds = new THREE.Box3();
for (const name of ['CRT_Housing','CRT_RearCasing','CRT_RearPowerInlet','CRT_Handles']) {
  crtBounds.union(new THREE.Box3().setFromObject(crt.getObjectByName(name)));
}
assert(Math.abs(keyboardBounds.min.y-deskBounds.max.y) < 1e-6, 'Keyboard feet meet tabletop');
assert(Math.abs(standBounds.min.y-deskBounds.max.y) < 1e-6, 'CRT feet meet tabletop');
assert(keyboardBounds.min.z > crtBounds.max.z, 'Keyboard is in front of CRT');
for (const bounds of [keyboardBounds,crtBounds]) {
  for (const axis of ['x','z']) {
    assert(bounds.min[axis] > deskBounds.min[axis] && bounds.max[axis] < deskBounds.max[axis], `${axis} tabletop clearance`);
  }
}

const projected = [];
for (const [width,height] of [[1280,720],[1920,1080],[1440,900],[1024,768],[844,390],[390,844]]) {
  const camera = new THREE.PerspectiveCamera(75,width/height,.1,1000);
  const viewportHeight = 2*Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)*CONFIG.caseStudy.CAMERA_REST_Z;
  const planeWidth = Math.max(viewportHeight*camera.aspect,viewportHeight*(1+CONFIG.phase2.BROWSER_CHROME_HEIGHT_MULT)*CONFIG.phase2.PLANE_ASPECT);
  const planeHeight = planeWidth/CONFIG.phase2.PLANE_ASPECT;
  const restDistance = CONFIG.caseStudy.CAMERA_REST_Z-CONFIG.phase2.PLANE_Z;
  const restHeight = 2*Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)*restDistance;
  const fit = Math.max(1,planeWidth/(restHeight*camera.aspect*CONFIG.phase2.REVEAL_CAMERA_FILL),planeHeight/(restHeight*CONFIG.phase2.REVEAL_CAMERA_FILL));
  const scale = planeWidth/frame.screenWidth;
  camera.position.set(0,CONFIG.phase2.WORKSTATION_CAMERA_Y*scale,CONFIG.phase2.PLANE_Z+restDistance*fit);
  camera.updateMatrixWorld(true);
  const points = [];
  for (const x of [keyboardBounds.min.x,keyboardBounds.max.x]) {
    for (const y of [keyboardBounds.min.y,keyboardBounds.max.y]) {
      for (const z of [keyboardBounds.min.z,keyboardBounds.max.z]) {
        points.push(new THREE.Vector3((x-frame.screenCenter.x)*scale,(y-frame.screenCenter.y)*scale,
          (z-frame.screenFront-CONFIG.phase2.CRT_SCREEN_CLEARANCE)*scale+CONFIG.phase2.PLANE_Z).project(camera));
      }
    }
  }
  const box = new THREE.Box3().setFromPoints(points);
  assert(box.min.x >= -1 && box.max.x <= 1 && box.min.y >= -1 && box.max.y <= 1, `Keyboard visible at ${width}x${height}`);
  projected.push({viewport:[width,height],keyboard_pixels:{left:(box.min.x+1)*width/2,right:(box.max.x+1)*width/2,top:(1-box.max.y)*height/2,bottom:(1-box.min.y)*height/2}});
}
const report = {
  passed:true, support_y_m:frame.supportY, keyboard_desk_gap_m:keyboardBounds.min.y-deskBounds.max.y,
  crt_desk_gap_m:standBounds.min.y-deskBounds.max.y, keyboard_crt_clearance_m:keyboardBounds.min.z-crtBounds.max.z,
  crt_rear_desk_margin_m:crtBounds.min.z-deskBounds.min.z, keyboard_front_desk_margin_m:deskBounds.max.z-keyboardBounds.max.z,
  keyboard_screen_width_ratio:.308/frame.screenWidth, camera_fov:75, projected,
};
writeFileSync(path.join(output,'scene-validation.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
