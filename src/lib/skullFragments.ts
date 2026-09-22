import * as THREE from "three";
import { CONFIG } from "@/config/constants";
import { skullParticleLayout, type SkullSimulationUniforms } from "@/lib/skullParticles";

function cellSeed(x: number, y: number, z: number, channel: number) {
  let seed = Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791) ^ channel;
  seed = Math.imul(seed ^ (seed >>> 16), 2246822507);
  return ((seed ^ (seed >>> 13)) >>> 0) / 4294967296;
}

export function createSkullFragments(source: THREE.BufferGeometry, cells: number) {
  const expanded = source.index ? source.toNonIndexed() : source.clone();
  expanded.center();
  if (!expanded.attributes.normal) expanded.computeVertexNormals();
  expanded.computeBoundingBox();
  const size = expanded.boundingBox!.getSize(new THREE.Vector3());
  const pitch = Math.max(size.x, size.y, size.z) / cells;
  const positions = expanded.attributes.position;
  const normals = expanded.attributes.normal;
  const groups = new Map<string, { triangles: number[]; center: THREE.Vector3; area: number }>();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const centroid = new THREE.Vector3();
  for (let index = 0; index < positions.count; index += 3) {
    a.fromBufferAttribute(positions, index);
    b.fromBufferAttribute(positions, index + 1);
    c.fromBufferAttribute(positions, index + 2);
    const area = ab.subVectors(b, a).cross(ac.subVectors(c, a)).length();
    if (area < 1e-12) continue;
    centroid.copy(a).add(b).add(c).multiplyScalar(1 / 3);
    const gx = Math.floor(centroid.x / pitch);
    const gy = Math.floor(centroid.y / pitch);
    const gz = Math.floor(centroid.z / pitch);
    let distance = Infinity;
    let key = "";
    for (let x = gx - 1; x <= gx + 1; x++) {
      for (let y = gy - 1; y <= gy + 1; y++) {
        for (let z = gz - 1; z <= gz + 1; z++) {
          const dx = centroid.x - (x + 0.2 + cellSeed(x, y, z, 1) * 0.6) * pitch;
          const dy = centroid.y - (y + 0.2 + cellSeed(x, y, z, 2) * 0.6) * pitch;
          const dz = centroid.z - (z + 0.2 + cellSeed(x, y, z, 3) * 0.6) * pitch;
          const candidate = dx * dx + dy * dy + dz * dz;
          if (candidate < distance) {
            distance = candidate;
            key = `${x},${y},${z}`;
          }
        }
      }
    }
    let group = groups.get(key);
    if (!group) {
      group = { triangles: [], center: new THREE.Vector3(), area: 0 };
      groups.set(key, group);
    }
    group.triangles.push(index);
    group.center.addScaledVector(centroid, area);
    group.area += area;
  }

  const count = groups.size;
  const { textureSize } = skullParticleLayout(count);
  const samples = {
    positions: new Float32Array(textureSize ** 2 * 4),
    normals: new Float32Array(textureSize ** 2 * 3),
    uvs: new Float32Array(textureSize ** 2 * 2),
  };
  const vertices: number[] = [];
  const shading: number[] = [];
  const particleUvs: number[] = [];
  const point = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const depth = pitch * CONFIG.model.FRAGMENTS.DEPTH_RATIO;
  const weldKey = (index: number) => [positions.getX(index), positions.getY(index), positions.getZ(index)]
    .map((value) => Math.round(value / (pitch * 1e-4))).join(",");
  let fragment = 0;
  for (const group of groups.values()) {
    group.center.divideScalar(group.area);
    group.center.toArray(samples.positions, fragment * 4);
    samples.normals[fragment * 3 + 2] = 1;
    const u = ((fragment % textureSize) + 0.5) / textureSize;
    const v = (Math.floor(fragment / textureSize) + 0.5) / textureSize;
    samples.uvs.set([u, v], fragment * 2);
    const edges = new Map<string, { a: number; b: number; count: number }>();
    const getPoint = (index: number, inside: boolean, target: THREE.Vector3) => {
      target.fromBufferAttribute(positions, index).sub(group.center)
        .multiplyScalar(1 - CONFIG.model.FRAGMENTS.GAP).add(group.center);
      if (inside) target.addScaledVector(normal.fromBufferAttribute(normals, index), -depth);
      return target;
    };
    const append = (index: number, inside: boolean, sideNormal?: THREE.Vector3) => {
      getPoint(index, inside, point);
      samples.positions[fragment * 4 + 3] = Math.max(samples.positions[fragment * 4 + 3], point.distanceTo(group.center));
      vertices.push(point.x, point.y, point.z);
      if (sideNormal) normal.copy(sideNormal);
      else normal.fromBufferAttribute(normals, index).multiplyScalar(inside ? -1 : 1);
      shading.push(normal.x, normal.y, normal.z);
      particleUvs.push(u, v);
    };
    for (const triangle of group.triangles) {
      for (const offset of [0, 1, 2]) append(triangle + offset, false);
      for (const offset of [2, 1, 0]) append(triangle + offset, true);
      for (let edge = 0; edge < 3; edge++) {
        const a = triangle + edge;
        const b = triangle + (edge + 1) % 3;
        const key = [weldKey(a), weldKey(b)].sort().join("/");
        const existing = edges.get(key);
        if (existing) existing.count++;
        else edges.set(key, { a, b, count: 1 });
      }
    }
    for (const edge of edges.values()) {
      if (edge.count !== 1) continue;
      getPoint(edge.a, false, a);
      getPoint(edge.b, false, b);
      getPoint(edge.a, true, c);
      const sideNormal = ab.subVectors(c, a).cross(ac.subVectors(b, a)).normalize();
      append(edge.a, false, sideNormal);
      append(edge.a, true, sideNormal);
      append(edge.b, false, sideNormal);
      append(edge.b, false, sideNormal);
      append(edge.a, true, sideNormal);
      append(edge.b, true, sideNormal);
    }
    fragment++;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(shading, 3));
  geometry.setAttribute("particleUv", new THREE.Float32BufferAttribute(particleUvs, 2));
  geometry.computeBoundingSphere();
  expanded.dispose();
  return { geometry, samples, count };
}

export function applySkullFragmentShader(material: THREE.Material, uniforms: SkullSimulationUniforms) {
  const compile = material.onBeforeCompile;
  const cacheKey = material.customProgramCacheKey;
  material.onBeforeCompile = (shader, renderer) => {
    compile.call(material, shader, renderer);
    shader.uniforms.fragmentPositions = uniforms.positions;
    shader.uniforms.fragmentRest = uniforms.restPosition;
    shader.uniforms.fragmentSpin = { value: CONFIG.model.FRAGMENTS.SPIN };
    shader.vertexShader = `
      uniform sampler2D fragmentPositions;
      uniform sampler2D fragmentRest;
      uniform float fragmentSpin;
      attribute vec2 particleUv;
      mat3 fragmentRotation(vec3 axis, float angle) {
        float s = sin(angle);
        float c = cos(angle);
        float t = 1.0 - c;
        return mat3(
          t*axis.x*axis.x+c, t*axis.x*axis.y+s*axis.z, t*axis.x*axis.z-s*axis.y,
          t*axis.x*axis.y-s*axis.z, t*axis.y*axis.y+c, t*axis.y*axis.z+s*axis.x,
          t*axis.x*axis.z+s*axis.y, t*axis.y*axis.z-s*axis.x, t*axis.z*axis.z+c
        );
      }
    ` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace("#include <beginnormal_vertex>", `
      vec3 fragmentCenter = texture2D(fragmentPositions, particleUv).xyz;
      vec3 fragmentOrigin = texture2D(fragmentRest, particleUv).xyz;
      vec3 axis = normalize(vec3(sin(particleUv.x * 71.0), cos(particleUv.y * 53.0), 0.6));
      mat3 rotation = fragmentRotation(axis, length(fragmentCenter - fragmentOrigin) * fragmentSpin);
      #include <beginnormal_vertex>
      objectNormal = rotation * objectNormal;
    `).replace("#include <begin_vertex>", `
      vec3 transformed = rotation * (position - fragmentOrigin) + fragmentCenter;
    `);
  };
  material.customProgramCacheKey = () => `${cacheKey.call(material)}:skull-fragments-v1`;
  material.needsUpdate = true;
  return () => {
    material.onBeforeCompile = compile;
    material.customProgramCacheKey = cacheKey;
    material.needsUpdate = true;
  };
}
