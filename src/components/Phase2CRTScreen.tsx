"use client";

import { createPortal, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { CONFIG } from "@/config/constants";
import { useHeroTransition } from "@/context/HeroTransitionContext";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { crtMorph } from "@/lib/crtScreen";

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
uniform float border;
uniform float screenAspect;
uniform float edgeBow;
uniform float softness;
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
void main() {
  vec2 p = vScreenUv * 2.0 - 1.0;
  vec2 split = p * dot(p,p) * chromatic * amount;
  vec3 color = texture2D(desktop, vUv).rgb;
  color.r = texture2D(desktop, clamp(vUv + split, 0.0, 1.0)).r;
  color.b = texture2D(desktop, clamp(vUv - split, 0.0, 1.0)).b;
  vec3 halo = texture2D(desktop, vUv + vec2(texel.x,0.0)).rgb;
  halo += texture2D(desktop, vUv - vec2(texel.x,0.0)).rgb;
  halo += texture2D(desktop, vUv + vec2(0.0,texel.y)).rgb;
  halo += texture2D(desktop, vUv - vec2(0.0,texel.y)).rgb;
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
  vec2 imageHalfSize = vec2(screenAspect, 1.0) * (1.0 - border);
  vec2 raster = p * (1.0 + edgeBow * p.yx * p.yx);
  vec2 distanceToEdge = abs(raster * vec2(screenAspect, 1.0)) - imageHalfSize;
  vec2 antialias = max(vec2(softness), fwidth(distanceToEdge));
  vec2 coverage = 1.0 - smoothstep(-antialias, vec2(0.0), distanceToEdge);
  float image = coverage.x * coverage.y;
  color *= mix(1.0, image, amount);
  vec3 reflected = reflect(-normalize(vView), normalize(vNormal));
  float softbox = exp(-pow((reflected.x + 0.32) * 7.0, 2.0) - pow((reflected.y - 0.45) * 2.0, 2.0));
  float fresnel = pow(1.0 - max(dot(normalize(vNormal), normalize(vView)), 0.0), 3.0);
  color += vec3(0.75,0.86,1.0) * reflection * (softbox + fresnel) * amount;
  gl_FragColor = vec4(max(color,0.0),1.0);
  #include <colorspace_fragment>
}
`;

export function Phase2CRTScreen({ width, height, geometry, borderGeometry, children }: {
  width: number;
  height: number;
  geometry: THREE.BufferGeometry;

  borderGeometry: THREE.BufferGeometry;
  children: ReactNode;
}) {
  const { revealProgressRef } = useHeroTransition();
  const reducedMotion = usePrefersReducedMotion();
  const meshRef = useRef<THREE.Mesh>(null);


  const resources = useMemo(() => {
    const tuning = CONFIG.phase2;
    const target = new THREE.WebGLRenderTarget(tuning.CRT_TARGET_MAX_SIZE,
      Math.round(tuning.CRT_TARGET_MAX_SIZE / tuning.PLANE_ASPECT),
      { depthBuffer: false, stencilBuffer: false });
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0);
    const camera = new THREE.OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, 0.1, 10);
    camera.position.z = 1;
    const material = new THREE.ShaderMaterial({
      vertexShader, fragmentShader, toneMapped: false,
      uniforms: {
        amount: { value: 0 },
        desktop: { value: target.texture },
        texel: { value: new THREE.Vector2(1 / target.width, 1 / target.height) },
        border: { value: tuning.CRT_BORDER },
        screenAspect: { value: tuning.PLANE_ASPECT },
        edgeBow: { value: tuning.CRT_ACTIVE_EDGE_BOW },
        softness: { value: tuning.CRT_EDGE_SOFTNESS },
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
    return { scene, camera, material, target };
  }, [width, height]);

  useEffect(() => () => {
    resources.target.dispose();
    resources.material.dispose();
  }, [resources]);

  useFrame(({ gl, size }) => {
    if (!meshRef.current?.parent?.visible || revealProgressRef.current < CONFIG.phase2.BROWSER_REVEAL_START) return;
    const { target, scene, camera, material } = resources;
    material.uniforms.amount.value = crtMorph(revealProgressRef.current, reducedMotion);
    const targetWidth = Math.max(1, Math.min(CONFIG.phase2.CRT_TARGET_MAX_SIZE,
      Math.ceil(Math.max(size.width, size.height * CONFIG.phase2.PLANE_ASPECT) * gl.getPixelRatio())));
    const targetHeight = Math.round(targetWidth / CONFIG.phase2.PLANE_ASPECT);
    if (target.width !== targetWidth || target.height !== targetHeight) {
      target.setSize(targetWidth, targetHeight);
      material.uniforms.texel.value.set(1 / targetWidth, 1 / targetHeight);
    }
    const previousTarget = gl.getRenderTarget();
    const autoClear = gl.autoClear;
    try {
      gl.autoClear = true;
      gl.setRenderTarget(target);
      gl.render(scene, camera);
    } finally {
      gl.setRenderTarget(previousTarget);
      gl.autoClear = autoClear;
    }
  }, 0.75);

  return <>
    {createPortal(children, resources.scene)}
    <mesh name="CRT_BlackGlassMargin" geometry={borderGeometry}
      material={resources.material} raycast={() => null} />
    <mesh ref={meshRef} name="CRT_LiveScreen" geometry={geometry}
      material={resources.material} raycast={() => null} />

  </>;
}

