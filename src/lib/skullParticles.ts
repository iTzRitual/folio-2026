import * as THREE from "three";
import { MeshSurfaceSampler } from "three/addons/math/MeshSurfaceSampler.js";
import { GPUComputationRenderer } from "three/addons/misc/GPUComputationRenderer.js";
import { CONFIG } from "@/config/constants";
import { projectOrbitCollisionShader } from "@/lib/projectOrbitCollision";
import { createSkullEntranceMotion } from "@/lib/skullEntrance";

export interface SkullSimulationUniforms {
  positions: THREE.Uniform<THREE.Texture | null>;
  restPosition: THREE.Uniform<THREE.Texture | null>;
}

const velocityShader = `
uniform sampler2D restPosition;
uniform float delta;
uniform float spring;
uniform float damping;
uniform vec3 cursorOrigin;
uniform vec3 cursorDirection;
uniform vec3 cursorVelocity;
uniform float cursorRadius;
uniform float cursorStrength;
uniform float repulsion;
uniform float cursorActive;
uniform float heatGain;
uniform float heatDecay;
void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec3 position = texture2D(texturePosition, uv).xyz;
  vec4 previous = texture2D(textureVelocity, uv);
  vec3 rest = texture2D(restPosition, uv).xyz;
  vec3 cursorForce = vec3(0.0);
  if (cursorActive > 0.5) {
    vec3 toParticle = position - cursorOrigin;
    vec3 radial = toParticle - cursorDirection * dot(toParticle, cursorDirection);
    float distanceToCursor = length(radial);
    float influence = 1.0 - smoothstep(0.0, cursorRadius, distanceToCursor);
    cursorForce = cursorVelocity * cursorStrength;
    cursorForce += radial / max(distanceToCursor, 0.001) * repulsion;
    cursorForce *= influence;
  }
  vec3 velocity = previous.xyz + ((rest - position) * spring + cursorForce) * delta;
  velocity *= exp(-damping * delta);
  float heat = previous.w * exp(-heatDecay * delta);
  heat = min(1.0, heat + length(cursorForce) * heatGain * delta);
  gl_FragColor = vec4(velocity, heat);
}`;

const positionShader = `
uniform float delta;
void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec3 position = texture2D(texturePosition, uv).xyz;
  vec3 velocity = texture2D(textureVelocity, uv).xyz;
  gl_FragColor = vec4(position + velocity * delta, 1.0);
}`;

function fragmentSimulationShader(output: "position" | "velocity") {
  return velocityShader.replace("void main() {", `uniform float entranceVelocity;\n${projectOrbitCollisionShader}\nvoid main() {`)
    .replace("velocity *= exp(-damping * delta);", `
      velocity += rest * entranceVelocity * ${CONFIG.model.FRAGMENTS.ENTRANCE_MOMENTUM.toFixed(4)} * delta;
      velocity *= exp(-damping * delta);
    `)
    .replace("gl_FragColor = vec4(velocity, heat);", `
      vec3 nextPosition = position + velocity * delta;
      collideOrbit(position, rest, texture2D(restPosition, uv).w, delta, nextPosition, velocity);
      gl_FragColor = ${output === "position" ? "vec4(nextPosition, 1.0)" : "vec4(velocity, heat)"};
    `);
}

const vertexShader = `
uniform sampler2D positions;
uniform sampler2D velocities;
uniform float pointRadius;
uniform float viewportHeight;
attribute vec2 particleUv;
varying float vHeat;
varying float vLight;
#include <clipping_planes_pars_vertex>
void main() {
  vec3 transformed = texture2D(positions, particleUv).xyz;
  vHeat = texture2D(velocities, particleUv).w;
  vec3 surfaceNormal = normalize(normalMatrix * normal);
  vLight = 0.48 + 0.52 * abs(dot(surfaceNormal, normalize(vec3(-0.4, 0.7, 1.0))));
  vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
  float worldScale = length(modelMatrix[0].xyz);
  gl_PointSize = max(1.0, pointRadius * worldScale * viewportHeight * projectionMatrix[1][1] / max(0.01, -mvPosition.z));
  gl_Position = projectionMatrix * mvPosition;
  #include <clipping_planes_vertex>
}`;

const fragmentShader = `
uniform vec3 color;
uniform vec3 hotColor;
varying float vHeat;
varying float vLight;
#include <clipping_planes_pars_fragment>
void main() {
  #include <clipping_planes_fragment>
  vec2 point = gl_PointCoord * 2.0 - 1.0;
  float radiusSquared = dot(point, point);
  if (radiusSquared > 1.0) discard;
  vec3 normal = vec3(point.x, -point.y, sqrt(1.0 - radiusSquared));
  float light = 0.45 + 0.55 * max(0.0, dot(normal, normalize(vec3(-0.4, 0.7, 1.0))));
  vec3 particleColor = mix(color * vLight, hotColor, vHeat);
  gl_FragColor = vec4(particleColor * light, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function sampleSkullSurface(source: THREE.BufferGeometry, size: number) {
  const geometry = source.clone();
  geometry.center();
  const surfaceMaterial = new THREE.MeshBasicMaterial();
  const surface = new THREE.Mesh(geometry, surfaceMaterial);
  const sampler = new MeshSurfaceSampler(surface).build() as MeshSurfaceSampler & {
    setRandomGenerator: (random: () => number) => MeshSurfaceSampler;
  };
  let seed = 42;
  sampler.setRandomGenerator(() => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  });
  const positions = new Float32Array(size * size * 4);
  const normals = new Float32Array(size * size * 3);
  const uvs = new Float32Array(size * size * 2);
  const point = new THREE.Vector3();
  const normal = new THREE.Vector3();
  for (let i = 0; i < size * size; i++) {
    sampler.sample(point, normal);
    point.toArray(positions, i * 4);
    positions[i * 4 + 3] = 1;
    normal.toArray(normals, i * 3);
    uvs[i * 2] = ((i % size) + 0.5) / size;
    uvs[i * 2 + 1] = (Math.floor(i / size) + 0.5) / size;
  }
  geometry.dispose();
  surfaceMaterial.dispose();
  return { positions, normals, uvs };
}

export function skullParticleLayout(requestedCount: number) {
  const count = THREE.MathUtils.clamp(
    Math.round(Number.isFinite(requestedCount) ? requestedCount : CONFIG.model.PARTICLE_COUNT),
    CONFIG.model.PARTICLE_COUNT_MIN,
    CONFIG.model.PARTICLE_COUNT_MAX,
  );
  return { count, textureSize: Math.ceil(Math.sqrt(count)) };
}

export function createSkullParticles(
  renderer: THREE.WebGLRenderer,
  source: THREE.BufferGeometry,
  requestedCount: number,
  clippingPlanes: THREE.Plane[],
  fragments?: {
    samples: ReturnType<typeof sampleSkullSurface>;
    uniforms: SkullSimulationUniforms;
  },
) {
  const config = CONFIG.model;
  const { count, textureSize: size } = skullParticleLayout(requestedCount);
  const samples = fragments?.samples ?? sampleSkullSurface(source, size);
  const compute = new GPUComputationRenderer(size, size, renderer);
  const rest = compute.createTexture();
  (rest.image.data as Float32Array).set(samples.positions);
  const initialVelocity = compute.createTexture();
  const positionsUniform = fragments?.uniforms.positions ?? new THREE.Uniform<THREE.Texture | null>(rest);
  positionsUniform.value = rest;
  if (fragments) fragments.uniforms.restPosition.value = rest;
  const position = compute.addVariable("texturePosition", fragments ? fragmentSimulationShader("position") : positionShader, rest);
  const velocity = compute.addVariable(
    "textureVelocity",
    fragments ? fragmentSimulationShader("velocity") : velocityShader,
    initialVelocity,
  );
  compute.setVariableDependencies(position, [position, velocity]);
  compute.setVariableDependencies(velocity, [position, velocity]);
  const uniforms = {
    entranceVelocity: { value: 0 },
    orbitActive: { value: 0 },
    orbitReveal: { value: 1 },
    orbitPhase: { value: 0 },
    orbitStart: { value: new THREE.Matrix4() },
    orbitEnd: { value: new THREE.Matrix4() },
    simulationFromOrbit: { value: new THREE.Matrix4() },
    orbitScale: { value: 1 },
    restPosition: { value: rest },
    delta: { value: config.PARTICLE_TIME_STEP },
    spring: new THREE.Uniform<number>(config.PARTICLE_RETURN_STRENGTH),
    damping: new THREE.Uniform<number>(config.PARTICLE_DAMPING),
    cursorOrigin: { value: new THREE.Vector3() },
    cursorDirection: { value: new THREE.Vector3(0, 0, -1) },
    cursorVelocity: { value: new THREE.Vector3() },
    cursorRadius: new THREE.Uniform<number>(config.PARTICLE_CURSOR_RADIUS),
    cursorStrength: new THREE.Uniform<number>(config.PARTICLE_CURSOR_STRENGTH),
    repulsion: { value: config.PARTICLE_REPULSION },
    cursorActive: { value: 0 },
    heatGain: { value: config.PARTICLE_HEAT_GAIN },
    heatDecay: { value: config.PARTICLE_HEAT_DECAY },
  };
  Object.assign(velocity.material.uniforms, uniforms);
  if (fragments) Object.assign(position.material.uniforms, uniforms);
  position.material.uniforms.delta = uniforms.delta;
  const error = compute.init();
  if (error) {
    compute.dispose();
    position.material.dispose();
    velocity.material.dispose();
    throw new Error(`Skull particle simulation: ${error}`);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      samples.positions.filter((_, i) => i % 4 !== 3),
      3,
    ),
  );
  geometry.setAttribute("normal", new THREE.BufferAttribute(samples.normals, 3));
  geometry.setAttribute("particleUv", new THREE.BufferAttribute(samples.uvs, 2));
  geometry.setDrawRange(0, count);
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    clipping: true,
    clippingPlanes,
    uniforms: {
      positions: positionsUniform,
      velocities: { value: initialVelocity as THREE.Texture },
      pointRadius: {
        value: config.PARTICLE_RADIUS,
      },
      viewportHeight: { value: 1 },
      color: { value: new THREE.Color(config.PARTICLE_COLOR) },
      hotColor: { value: new THREE.Color(config.PARTICLE_HOT_COLOR) },
    },
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.raycast = () => {};
  let wasReducedMotion = false;
  const entrance = createSkullEntranceMotion();
  let orbitInitialized = false;
  const previousOrbit = new THREE.Matrix4();
  const currentOrbit = new THREE.Matrix4();
  const orbitScale = new THREE.Vector3();
  let previousReveal = 1;
  let currentReveal = 1;
  let previousPhase = 0;
  let currentPhase = 0;
  const interpolateOrbit = (target: THREE.Matrix4, t: number) => {
    for (let i = 0; i < 16; i++) {
      target.elements[i] = THREE.MathUtils.lerp(previousOrbit.elements[i], currentOrbit.elements[i], t);
    }
  };
  return {
    points,
    uniforms,
    setEntranceScale(scale: number, delta: number, active: boolean) {
      uniforms.entranceVelocity.value = entrance.sample(scale, delta, active);
    },
    setOrbit(matrix: THREE.Matrix4, active: boolean, reveal = 1, phase = 0) {
      currentOrbit.copy(matrix);
      currentReveal = reveal;
      currentPhase = phase;
      if (!orbitInitialized || !active) {
        previousOrbit.copy(matrix);
        previousReveal = reveal;
        previousPhase = phase;
      }
      orbitInitialized = active;
      uniforms.orbitActive.value = active ? 1 : 0;
      uniforms.orbitScale.value = orbitScale.setFromMatrixScale(matrix).x;
    },
    update(delta: number, reducedMotion: boolean) {
      if (delta <= 0) return;
      if (reducedMotion) {
        previousOrbit.copy(currentOrbit);
        previousReveal = currentReveal;
        previousPhase = currentPhase;
        wasReducedMotion = true;
        material.uniforms.positions.value = rest;
        material.uniforms.velocities.value = initialVelocity;
        return;
      }
      if (wasReducedMotion) {
        for (const target of position.renderTargets) {
          compute.renderTexture(rest, target);
        }
        for (const target of velocity.renderTargets) {
          compute.renderTexture(initialVelocity, target);
        }
        wasReducedMotion = false;
      }
      const elapsed = Math.min(delta, config.PARTICLE_MAX_DELTA);
      const steps = Math.max(1, Math.ceil(elapsed / config.PARTICLE_TIME_STEP));
      uniforms.delta.value = elapsed / steps;
      for (let i = 0; i < steps; i++) {
        if (fragments && orbitInitialized) {
          uniforms.orbitReveal.value = THREE.MathUtils.lerp(previousReveal, currentReveal, (i + 1) / steps);
          uniforms.orbitPhase.value = THREE.MathUtils.lerp(previousPhase, currentPhase, (i + 1) / steps);
          interpolateOrbit(uniforms.orbitStart.value, i / steps);
          interpolateOrbit(uniforms.orbitEnd.value, (i + 1) / steps);
          uniforms.simulationFromOrbit.value.copy(uniforms.orbitEnd.value).invert();
        }
        compute.compute();
      }
      previousOrbit.copy(currentOrbit);
      previousReveal = currentReveal;
      previousPhase = currentPhase;
      material.uniforms.positions.value = compute.getCurrentRenderTarget(position).texture;
      material.uniforms.velocities.value = compute.getCurrentRenderTarget(velocity).texture;
    },
    dispose() {
      compute.dispose();
      position.material.dispose();
      velocity.material.dispose();
      geometry.dispose();
      material.dispose();
    },
  };
}
