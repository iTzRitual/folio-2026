"use client";

import { createPortal, useFrame } from "@react-three/fiber";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import * as THREE from "three";
import { CONFIG } from "@/config/constants";
import { useHeroTransition } from "@/context/HeroTransitionContext";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import {
  createMonitorUniforms,
  createMonitorScreenRuntime,
  mapMonitorScreenUv,
  monitorShader,
} from "@/lib/monitorScreen";
import type { MonitorState } from "@/lib/monitorState";
import { crtMorph } from "@/lib/crtScreen";
import { useSceneCapabilities } from "@/context/SceneCapabilitiesContext";

const vertexShader = `
attribute float screenEdge;
attribute vec2 screenUv;
varying float vEdge;
varying vec2 vUv;
varying vec2 vScreenUv;
varying vec3 vNormal;
varying vec3 vView;
void main() {
  vUv = uv;
  vScreenUv = screenUv;
  vEdge = screenEdge;
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vView = normalize(-view.xyz);
  gl_Position = projectionMatrix * view;
}
`;

const fragmentShader = `
varying float vEdge;
uniform sampler2D desktop;
uniform vec2 texel;
uniform float amount;
uniform float vignette;
uniform float scanlines;
uniform float scanStrength;
uniform float phosphor;
uniform float chromatic;
uniform float noise;
uniform float glow;
uniform float reflection;
varying vec2 vUv;
varying vec2 vScreenUv;
varying vec3 vNormal;
varying vec3 vView;
${monitorShader}
void main() {
  vec2 p = vScreenUv * 2.0 - 1.0;
  #ifdef BLACK_GLASS_MARGIN
  vec3 color = vec3(0.0);
  #else
  vec2 raster = (vUv - 0.5) / monitorPowerSize + 0.5;
  raster = (raster - 0.5) / monitorUnderScan + 0.5;
  float rasterMask = step(0.0, raster.x) * step(raster.x, 1.0) * step(0.0, raster.y) * step(raster.y, 1.0);
  if (monitorDelay > 0.5) {
    raster = fract(raster + vec2(${CONFIG.monitor.HV_HORIZONTAL_SHIFT.toFixed(8)}, 0.5));
    rasterMask *= step(${CONFIG.monitor.HV_HORIZONTAL_BLANK.toFixed(8)}, raster.x) * step(${CONFIG.monitor.HV_VERTICAL_BLANK.toFixed(8)}, raster.y);
  }
  if (monitorSync > 0.0) {
    float roll = fract(monitorTime * ${CONFIG.monitor.SYNC_ROLL_SPEED.toFixed(8)}) * monitorSync;
    float drift = (sin(monitorTime * 2.1) * ${CONFIG.monitor.SYNC_DRIFT.toFixed(8)} + sin(raster.y * 18.0 + monitorTime) * 0.001) * monitorSync;
    float jump = step(0.985, sin(monitorTime * 1.7)) * ${CONFIG.monitor.SYNC_JUMP.toFixed(8)} * monitorSync;
    raster = fract(raster + vec2(drift + jump, roll));
  }
  vec2 split = p * dot(p,p) * chromatic * amount;
  vec3 color = monitorSample(raster);
  color.r = monitorSample(clamp(raster + split, 0.0, 1.0)).r;
  color.b = monitorSample(clamp(raster - split, 0.0, 1.0)).b;
  vec3 halo = monitorSample(raster + vec2(texel.x,0.0));
  halo += monitorSample(raster - vec2(texel.x,0.0));
  halo += monitorSample(raster + vec2(0.0,texel.y));
  halo += monitorSample(raster - vec2(0.0,texel.y));
  if (monitorInput != 1.0 && monitorAperture != 0.0) color += (color - halo * 0.25) * monitorAperture * ${CONFIG.monitor.APERTURE_STRENGTH.toFixed(8)};
  color += max(halo * 0.25 - 0.65, 0.0) * glow * amount;
  float scanFootprint = fwidth(vUv.y) * scanlines;
  float scanVisibility = 1.0 - smoothstep(0.35, 0.9, scanFootprint);
  float scan = 0.5 + 0.5 * cos(vUv.y * scanlines * 6.2831853);
  color *= 1.0 - scan * scanStrength * scanVisibility * amount;
  vec3 triad = 0.5 + 0.5 * cos(vec3(0.0,2.0944,4.1888) + vUv.x / texel.x * 6.2831853 / 3.0);
  float triadVisibility = 1.0 - smoothstep(0.5, 1.5, fwidth(vUv.x) / texel.x);
  color *= 1.0 - triad * phosphor * triadVisibility * amount;
  color *= 1.0 - vignette * pow(dot(p,p) * 0.5, 1.6) * amount;
  float grain = fract(sin(dot(floor(vUv / texel), vec2(12.9898,78.233))) * 43758.5453) - 0.5;
  color += grain * noise * amount;
  vec2 distanceToEdge = abs(vUv * 2.0 - 1.0) - 1.0;
  vec2 antialias = max(fwidth(distanceToEdge), vec2(0.000001));
  vec2 coverage = 1.0 - smoothstep(-antialias, vec2(0.0), distanceToEdge);
  float image = coverage.x * coverage.y;
  color = monitorColor(color);
  color = mix(color, vec3(0.8), monitorPowerFlash);
  color *= image * rasterMask * monitorPowerLevel;
  #endif
  vec3 reflected = reflect(-normalize(vView), normalize(vNormal));
  float softbox = exp(-pow((reflected.x + 0.32) * 7.0, 2.0) - pow((reflected.y - 0.45) * 2.0, 2.0));
  float fresnel = pow(1.0 - max(dot(normalize(vNormal), normalize(vView)), 0.0), 3.0);
  color += vec3(0.75,0.86,1.0) * reflection * (softbox + fresnel) * amount;
  gl_FragColor = vec4(max(color,0.0),1.0);
  #include <colorspace_fragment>
}
`;

export type CRTDisplayHandle = {
  mapContentUv(source: THREE.Vector2, target: THREE.Vector2): boolean;
};

export const CRTDisplay = forwardRef<CRTDisplayHandle, {
  monitorState: MonitorState;
  width: number;
  height: number;
  geometry: THREE.BufferGeometry;
  borderGeometry: THREE.BufferGeometry;
  children: ReactNode;
}>(function CRTDisplay(
  { width, height, geometry, borderGeometry, monitorState, children },
  ref,
) {
  const { revealProgressRef } = useHeroTransition();
  const reducedMotion = usePrefersReducedMotion();
  const monitorRuntime = useMemo(createMonitorScreenRuntime, []);
  const monitorUniforms = useMemo(createMonitorUniforms, []);
  const meshRef = useRef<THREE.Mesh>(null);
  const { qualityTier } = useSceneCapabilities();
  const projectedCorners = useMemo(
    () => [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()],
    [],
  );
  const targetQualityRef = useRef(qualityTier);

  useImperativeHandle(
    ref,
    () => ({
      mapContentUv: (source, target) =>
        mapMonitorScreenUv(source, target, monitorUniforms),
    }),
    [monitorUniforms],
  );

  const resources = useMemo(() => {
    const tuning = CONFIG.workstation;
    const target = new THREE.WebGLRenderTarget(tuning.CRT_TARGET_MAX_SIZE,
      Math.round(tuning.CRT_TARGET_MAX_SIZE / tuning.PLANE_ASPECT),
      { depthBuffer: false, stencilBuffer: false });
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0);
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;
    const material = new THREE.ShaderMaterial({
      vertexShader, fragmentShader, toneMapped: false,
      uniforms: {
        ...monitorUniforms,
        amount: { value: 0 },
        desktop: { value: target.texture },
        texel: { value: new THREE.Vector2(1 / target.width, 1 / target.height) },
        vignette: { value: tuning.CRT_VIGNETTE },
        scanlines: { value: tuning.CRT_SCANLINES },
        scanStrength: { value: tuning.CRT_SCANLINE_STRENGTH },
        phosphor: { value: tuning.CRT_PHOSPHOR_STRENGTH },
        chromatic: { value: tuning.CRT_CHROMATIC },
        noise: { value: tuning.CRT_NOISE },
        glow: { value: tuning.CRT_GLOW },
        reflection: { value: tuning.CRT_REFLECTION },
      },
    });
    const marginMaterial = new THREE.ShaderMaterial({
      vertexShader, fragmentShader, toneMapped: false,
      defines: { BLACK_GLASS_MARGIN: 1 },
      uniforms: material.uniforms,
    });
    return { scene, camera, material, marginMaterial, target };
  }, [monitorUniforms]);

  useEffect(() => () => {
    resources.target.dispose();
    resources.material.dispose();
    resources.marginMaterial.dispose();
  }, [resources]);

  useFrame(({ camera: mainCamera, gl, size }, delta) => {
    monitorRuntime.update(monitorUniforms, monitorState, delta, reducedMotion);
    if (!meshRef.current?.parent?.visible || revealProgressRef.current < CONFIG.workstation.BROWSER_REVEAL_START) return;
    const { target, scene, camera: screenCamera, material } = resources;
    const cameraLeft = -width / 2;
    const cameraRight = width / 2;
    const cameraTop = height / 2;
    const cameraBottom = -height / 2;
    if (
      screenCamera.left !== cameraLeft ||
      screenCamera.right !== cameraRight ||
      screenCamera.top !== cameraTop ||
      screenCamera.bottom !== cameraBottom
    ) {
      screenCamera.left = cameraLeft;
      screenCamera.right = cameraRight;
      screenCamera.top = cameraTop;
      screenCamera.bottom = cameraBottom;
      screenCamera.updateProjectionMatrix();
    }
    material.uniforms.amount.value = crtMorph(revealProgressRef.current, reducedMotion);
    const [center, right, top] = projectedCorners;
    meshRef.current.localToWorld(center.set(0, 0, 0)).project(mainCamera);
    meshRef.current.localToWorld(right.set(width / 2, 0, 0)).project(mainCamera);
    meshRef.current.localToWorld(top.set(0, height / 2, 0)).project(mainCamera);
    const projectedWidth = Math.abs(right.x - center.x) * size.width;
    const projectedHeight = Math.abs(top.y - center.y) * size.height;
    const qualityMax =
      qualityTier === "low"
        ? CONFIG.workstation.CRT_TARGET_LOW_MAX_SIZE
        : qualityTier === "balanced"
          ? CONFIG.workstation.CRT_TARGET_BALANCED_MAX_SIZE
          : CONFIG.workstation.CRT_TARGET_MAX_SIZE;
    const desiredWidth = Math.ceil(
      Math.max(projectedWidth, projectedHeight * CONFIG.workstation.PLANE_ASPECT) *
        gl.getPixelRatio() *
        CONFIG.workstation.CRT_TARGET_PROJECTED_SCALE,
    );
    const targetWidth = Math.max(
      CONFIG.workstation.CRT_TARGET_MIN_SIZE,
      Math.min(qualityMax, desiredWidth),
    );
    const targetHeight = Math.round(targetWidth / CONFIG.workstation.PLANE_ASPECT);
    const qualityChanged = targetQualityRef.current !== qualityTier;
    const resizeRatio = Math.abs(target.width - targetWidth) / target.width;
    if (
      qualityChanged ||
      resizeRatio >= CONFIG.workstation.TARGET_RESIZE_THRESHOLD
    ) {
      target.setSize(targetWidth, targetHeight);
      material.uniforms.texel.value.set(1 / targetWidth, 1 / targetHeight);
      targetQualityRef.current = qualityTier;
    }
    const previousTarget = gl.getRenderTarget();
    const autoClear = gl.autoClear;
    try {
      gl.autoClear = true;
      gl.setRenderTarget(target);
      gl.render(scene, screenCamera);
    } finally {
      gl.setRenderTarget(previousTarget);
      gl.autoClear = autoClear;
    }
  }, 0.75);

  return <>
    {createPortal(children, resources.scene)}
    <mesh name="CRT_BlackGlassMargin" geometry={borderGeometry}
      material={resources.marginMaterial} raycast={() => null} />
    <mesh ref={meshRef} name="CRT_LiveScreen" geometry={geometry}
      material={resources.material} raycast={() => null} />

  </>;
});
