"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { ShaderMaterial } from "three";
import { useHeroLayout } from "@/context/HeroLayoutContext";
import { useDebugSettings } from "@/context/DebugSettingsContext";
import { useHeroTransition } from "@/context/HeroTransitionContext";
import { caseStudyStage } from "@/lib/caseStudyStage";
import { curlUniforms } from "@/lib/detailsCurl";
import { SWEEP_GLSL, sweepUniforms } from "@/lib/themeSweep";
import { CONFIG } from "@/config/constants";

const VERTEX = /* glsl */ `
varying float vWorldY;
varying vec2 vUv;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldY = worldPosition.y;
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const FRAGMENT =
  SWEEP_GLSL +
  /* glsl */ `
uniform float uTopY;
uniform float uTopSpan;
uniform float uTopCutY;
uniform float uTopCutSpan;
uniform float uBottomY;
uniform float uBottomSpan;
uniform float uTopStrength;
uniform float uPresence;
varying float vWorldY;
varying vec2 vUv;

void main() {
  float top =
    smoothstep(uTopY, uTopY + uTopSpan, vWorldY) *
    (1.0 - smoothstep(uTopCutY, uTopCutY + uTopCutSpan, vWorldY));
  float bottom = 1.0 - smoothstep(uBottomY, uBottomY + uBottomSpan, vWorldY);
  float alpha = clamp(max(top * uTopStrength, bottom), 0.0, 1.0) * uPresence;
  gl_FragColor = vec4(themeSweptColor(vUv), alpha);
  #include <colorspace_fragment>
}
`;

export function CurlEdgeFade() {
  const { topSpanMult, bottomSpanMult } = useDebugSettings().edgeFade;
  const { viewport } = useHeroLayout();
  const { progressRef, revealProgressRef } = useHeroTransition();
  const materialRef = useRef<ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      ...sweepUniforms,
      uTopY: { value: 0 },
      uTopSpan: { value: 1 },
      uTopCutY: { value: 0 },
      uTopCutSpan: { value: 1 },
      uBottomY: { value: 0 },
      uBottomSpan: { value: 1 },
      uTopStrength: { value: 0 },
      uPresence: { value: 1 },
    }),
    [],
  );

  useFrame(() => {
    const material = materialRef.current;
    if (!material) return;

    const foldY = curlUniforms.uCurlFoldY.value;
    const radius = curlUniforms.uCurlRadius.value;

    material.uniforms.uTopY.value = foldY;
    material.uniforms.uTopSpan.value = radius * topSpanMult;
    material.uniforms.uTopCutY.value = foldY + radius;
    material.uniforms.uTopCutSpan.value = radius * CONFIG.detailsCurl.EDGE_FADE_CUT_MULT;
    material.uniforms.uBottomY.value = -viewport.height / 2;
    material.uniforms.uBottomSpan.value = viewport.height * bottomSpanMult;
    material.uniforms.uTopStrength.value = progressRef.current;
    // Both scrims are authored against the sheet's world Y. Once the camera has
    // left the sheet they are two bands lying across the case study, so they go
    // out with the rest of the list.
    material.uniforms.uPresence.value =
      (1 - caseStudyStage.dim) * (1 - revealProgressRef.current);
  });

  return (
    <mesh
      renderOrder={CONFIG.detailsCurl.EDGE_FADE_RENDER_ORDER}
      frustumCulled={false}
    >
      <planeGeometry args={[viewport.width, viewport.height]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT}
        transparent
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}
