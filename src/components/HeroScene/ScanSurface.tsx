import { useFBO } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { CONFIG } from "@/config/constants";
import { useHeroTransition } from "@/context/HeroTransitionContext";
import { useSceneCapabilities } from "@/context/SceneCapabilitiesContext";
import { useDebugSettings } from "@/context/DebugSettingsContext";
import { scanProximity } from "@/lib/scanInteraction";
import { captureScanBackground } from "@/lib/scanTransmission";

export const SCAN_LAYER = 3;

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const fragmentShader = `
uniform sampler2D uSkull;
uniform vec2 uCenter;
uniform vec2 uScale;
uniform float uStrength;
uniform float uIdleStrength;
uniform float uHoverSpread;
uniform float uBands;
uniform float uFlow;
uniform vec2 uPointer;
uniform float uRadius;
uniform float uClipY;
varying vec2 vUv;
float scanHash(float n) { return fract(sin(n * 127.1) * 43758.5453); }
float scanNoise(float x) {
  float i = floor(x);
  return mix(scanHash(i), scanHash(i + 1.0), smoothstep(0.18, 0.82, fract(x)));
}
void main() {
  if (vUv.y > uClipY) discard;
  vec2 p = (vUv - uCenter) / uScale;
  float flow = sin(p.y * 7.0 + p.x * 3.0) * sin(p.y * 2.5 + 1.0);
  float lane = p.x * uBands + flow * uFlow;
  lane += (scanNoise(p.x * 9.0) - 0.5) * 2.8;
  float band = pow(scanNoise(lane), 3.0);
  float cursor = 1.0 - smoothstep(uRadius * 0.15, uRadius, distance(p, uPointer));
  float stretch = band * (uIdleStrength + uStrength * mix(cursor, 1.0, uHoverSpread));
  p.y /= 1.0 + stretch;
  p.y += (scanNoise(lane + 57.0) - 0.5) * stretch * 0.12;
  vec2 uv = uCenter + p * uScale;
  if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) discard;
  gl_FragColor = texture2D(uSkull, uv);
  if (gl_FragColor.a < 0.01) discard;
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function ScanSurface({ skull, background, enabled, pointer, clip }: {
  skull: RefObject<THREE.Mesh | null>;
  background: THREE.WebGLRenderTarget;
  enabled: RefObject<boolean>;
  pointer: RefObject<THREE.Vector2>;
  clip: THREE.Plane;
}) {
  const { size, viewport } = useThree();
  const { inputMode } = useSceneCapabilities();
  const { revealProgressRef, progressRef } = useHeroTransition();
  const { scan, material: materialSettings } = useDebugSettings();
  const amount = useRef(0);
  const idleAmount = useRef(0);
  const localPointer = useRef(new THREE.Vector2());
  const factor = Math.min(viewport.dpr, CONFIG.scan.MAX_DPR, CONFIG.scan.MAX_BUFFER_SIZE / Math.max(size.width, size.height));
  const target = useFBO(Math.round(size.width * factor), Math.round(size.height * factor), { samples: inputMode === "coarse" ? 0 : 2 });
  const backside = useFBO(background.width, background.height);
  const plane = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.ShaderMaterial>(null);
  const scratch = useMemo(() => ({
    position: new THREE.Vector3(),
    scale: new THREE.Vector3(),
    projected: new THREE.Vector3(),
    color: new THREE.Color(),
    depth: new THREE.Vector3(0, 0, CONFIG.model.DEPTH_Z),
    bounds: new THREE.Box3(),
    boundsSize: new THREE.Vector3(),
  }), []);
  const uniforms = useMemo(() => ({
    uSkull: { value: target.texture },
    uCenter: { value: new THREE.Vector2() },
    uScale: { value: new THREE.Vector2(1, 1) },
    uStrength: { value: 0 },
    uIdleStrength: { value: 0 },
    uHoverSpread: { value: CONFIG.scan.HOVER_SPREAD },
    uBands: { value: CONFIG.scan.BANDS },
    uFlow: { value: CONFIG.scan.FLOW },
    uPointer: { value: new THREE.Vector2() },
    uRadius: { value: CONFIG.scan.RADIUS },
    uClipY: { value: 1 },
  }), [target.texture]);

  useFrame(({ gl, scene, camera }, delta) => {
    const mesh = skull.current;
    if (!mesh || !plane.current || !material.current) return;
    mesh.updateWorldMatrix(true, false);
    mesh.getWorldPosition(scratch.position);
    mesh.getWorldScale(scratch.scale);
    const active = scratch.scale.y > CONFIG.model.TRANSMISSION_MIN_SCALE && revealProgressRef.current <= 0.001;
    plane.current.visible = false;
    if (!active) {
      mesh.layers.set(0);
      amount.current = 0;
      idleAmount.current = 0;
      return;
    }
    const surfaceViewport = viewport.getCurrentViewport(camera, scratch.depth);
    plane.current.scale.set(surfaceViewport.width, surfaceViewport.height, 1);
    const u = material.current.uniforms;
    const view = viewport.getCurrentViewport(camera, scratch.position);
    scratch.projected.copy(scratch.position).project(camera);
    u.uCenter.value.set(scratch.projected.x * 0.5 + 0.5, scratch.projected.y * 0.5 + 0.5);
    u.uScale.value.set(scratch.scale.y / view.width, scratch.scale.y / view.height);
    const pointerX = ((pointer.current.x + 1) * 0.5 - u.uCenter.value.x) / u.uScale.value.x;
    const pointerY = ((pointer.current.y + 1) * 0.5 - u.uCenter.value.y) / u.uScale.value.y;
    scratch.bounds.setFromObject(mesh);
    scratch.bounds.getSize(scratch.boundsSize);
    const proximity = enabled.current ? scanProximity(
      pointerX, pointerY,
      scratch.boundsSize.x / scratch.scale.y * 0.5,
      scratch.boundsSize.y / scratch.scale.y * 0.5,
      scan.proximity,
    ) : 0;
    const nextAmount = proximity * scan.strength;
    const heroPresence = 1 - THREE.MathUtils.smoothstep(
      progressRef.current, CONFIG.model.SCALE_OUT_START, CONFIG.model.SCALE_OUT_END,
    );
    const nextIdle = scan.enabled ? scan.idleStrength * heroPresence : 0;
    idleAmount.current = THREE.MathUtils.damp(idleAmount.current, nextIdle, scan.release, Math.min(delta, 0.05));
    if (nextIdle === 0 && idleAmount.current < 0.0001) idleAmount.current = 0;
    const response = nextAmount > amount.current ? scan.response : scan.release;
    amount.current = THREE.MathUtils.damp(amount.current, nextAmount, response, Math.min(delta, 0.05));
    if (nextAmount === 0 && amount.current < 0.0001) amount.current = 0;
    if (enabled.current) localPointer.current.set(pointerX, pointerY);
    u.uStrength.value = amount.current;
    u.uIdleStrength.value = idleAmount.current;
    u.uHoverSpread.value = scan.hoverSpread;
    u.uPointer.value.copy(localPointer.current);
    u.uRadius.value = scan.radius;
    u.uBands.value = scan.bands;
    u.uFlow.value = scan.flow;
    scratch.projected.set(0, clip.constant, CONFIG.model.DEPTH_Z).project(camera);
    u.uClipY.value = clip.constant > 100 ? 1 : scratch.projected.y * 0.5 + 0.5;
    const previousTarget = gl.getRenderTarget();
    const previousMask = camera.layers.mask;
    const previousBackground = scene.background;
    const previousTone = gl.toneMapping;
    const previousAlpha = gl.getClearAlpha();
    gl.getClearColor(scratch.color);
    gl.toneMapping = THREE.NoToneMapping;
    captureScanBackground(gl, scene, camera, mesh, background, backside, materialSettings.backside, SCAN_LAYER);
    const scanning = amount.current > 0 || idleAmount.current > 0;
    if (scanning) {
      scene.background = null;
      camera.layers.set(SCAN_LAYER);
      gl.setClearColor(0x000000, 0);
      gl.setRenderTarget(target);
      gl.clear();
      gl.render(scene, camera);
    }
    gl.setRenderTarget(previousTarget);
    gl.setClearColor(scratch.color, previousAlpha);
    gl.toneMapping = previousTone;
    camera.layers.mask = previousMask;
    scene.background = previousBackground;
    plane.current.visible = scanning;
    mesh.layers.set(scanning ? SCAN_LAYER : 0);
  });

  return (
    <mesh
      ref={plane}
      position={[0, 0, CONFIG.model.DEPTH_Z]}
      renderOrder={CONFIG.scan.RENDER_ORDER}
      frustumCulled={false}
      raycast={() => null}
    >
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}
