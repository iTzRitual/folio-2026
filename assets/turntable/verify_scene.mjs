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

const crt = boundsModel('public/glbs/crt-monitor.glb');
const keyboard = boundsModel('public/glbs/keyboard.glb');
const desk = boundsModel('public/glbs/workstation-desk.glb');
const turntable = boundsModel('public/glbs/turntable.glb');
const frame = getCRTReferenceFrame(crt);
const C = CONFIG.workstation;
const d = C.DESK_POSITION, s = C.DESK_SCALE;
desk.position.set(d.x,frame.supportY+d.y,d.z);
desk.scale.set(s.x,s.y,s.z);
for (const [model,p,r,scale] of [[keyboard,C.KEYBOARD_POSITION,C.KEYBOARD_ROTATION,C.KEYBOARD_SCALE],[turntable,C.TURNTABLE_POSITION,C.TURNTABLE_ROTATION,C.TURNTABLE_SCALE]]) {
  model.position.set(p.x,frame.supportY+d.y+p.y,p.z);
  model.rotation.set(...[r.x,r.y,r.z].map(THREE.MathUtils.degToRad));
  model.scale.setScalar(scale);
}
const deskBounds = new THREE.Box3().setFromObject(desk);
const keyboardBounds = new THREE.Box3().setFromObject(keyboard);
const turntableBounds = new THREE.Box3().setFromObject(turntable);
const crtBounds = new THREE.Box3();
for (const name of ['CRT_Housing','CRT_RearCasing','CRT_RearPowerInlet','CRT_Handles','CRT_Stand']) {
  crtBounds.union(new THREE.Box3().setFromObject(crt.getObjectByName(name)));
}
assert(Math.abs(turntableBounds.min.y-deskBounds.max.y)<1e-6,'Feet meet desk');
assert(!turntableBounds.intersectsBox(keyboardBounds),'Keyboard clearance');
assert(!turntableBounds.intersectsBox(crtBounds),'CRT clearance including open cover');
for (const axis of ['x','z']) {
  assert(turntableBounds.min[axis]>deskBounds.min[axis] && turntableBounds.max[axis]<deskBounds.max[axis],`${axis} desk boundaries`);
}
const projected = [];
for (const [width,height] of [[1280,720],[1440,900],[1920,1080],[390,844]]) {
  const camera = new THREE.PerspectiveCamera(75,width/height,.1,1000);
  const viewportHeight = 2*Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)*CONFIG.scene.CAMERA_REST_Z;
  const planeWidth = Math.max(viewportHeight*camera.aspect,viewportHeight*(1+C.BROWSER_CHROME_HEIGHT_MULT)*C.PLANE_ASPECT);
  const planeHeight = planeWidth/C.PLANE_ASPECT;
  const restDistance = CONFIG.scene.CAMERA_REST_Z-C.PLANE_Z;
  const restHeight = 2*Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)*restDistance;
  const fit = Math.max(1,planeWidth/(restHeight*camera.aspect*C.REVEAL_CAMERA_FILL),planeHeight/(restHeight*C.REVEAL_CAMERA_FILL));
  const scale = planeWidth/frame.screenWidth;
  camera.position.set(0,C.WORKSTATION_CAMERA_Y*scale,C.PLANE_Z+restDistance*fit);
  camera.updateMatrixWorld(true);
  function project(model) {
    const points=[];
    model.updateWorldMatrix(true,true);
    model.traverse(ob => {
      if (!(ob instanceof THREE.Mesh)) return;
      const a=ob.geometry.getAttribute('position');
      for(let i=0;i<a.count;i++) {
        const v=new THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(ob.matrixWorld);
        points.push(new THREE.Vector3((v.x-frame.screenCenter.x)*scale,(v.y-frame.screenCenter.y)*scale,(v.z-frame.screenFront-C.CRT_SCREEN_CLEARANCE)*scale+C.PLANE_Z).project(camera));
      }
    });
    const b=new THREE.Box3().setFromPoints(points);
    return {left:(b.min.x+1)*width/2,right:(b.max.x+1)*width/2,top:(1-b.max.y)*height/2,bottom:(1-b.min.y)*height/2};
  }
  const pixels=project(turntable);
  const platter=project(turntable.getObjectByName('Platter_FeltMat'));
  const screen=project(crt.getObjectByName('CRT_Screen'));
  if(width>=1280) {
    assert(pixels.left>=0 && pixels.right<=width && pixels.top>=0 && pixels.bottom<=height,`Whole turntable visible at ${width}x${height}`);
    assert(platter.left>screen.right,`Platter stays beside screen at ${width}x${height}`);
  }
  projected.push({viewport:[width,height],turntable:pixels,platter,screen});
}
const report={passed:true,position:C.TURNTABLE_POSITION,rotation_degrees:C.TURNTABLE_ROTATION,scale:C.TURNTABLE_SCALE,
  support_y_m:frame.supportY+d.y,world_bounds_m:{min:turntableBounds.min.toArray(),max:turntableBounds.max.toArray()},
  desk_contact_gap_m:turntableBounds.min.y-deskBounds.max.y,crt_clearance_x_m:turntableBounds.min.x-crtBounds.max.x,
  keyboard_clearance_x_m:turntableBounds.min.x-keyboardBounds.max.x,wall_clearance_m:turntableBounds.min.z-deskBounds.min.z,
  front_desk_margin_m:deskBounds.max.z-turntableBounds.max.z,projected};
writeFileSync(path.join(output,'scene-validation.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));

