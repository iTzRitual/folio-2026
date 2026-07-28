"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Color, ShaderMaterial } from "three";
import { useHeroLayout } from "@/context/HeroLayoutContext";
import { useTheme } from "@/context/ThemeContext";
import { useHeroTransition } from "@/context/HeroTransitionContext";
import { curlUniforms } from "@/lib/detailsCurl";
import { CONFIG } from "@/config/constants";

const VERTEX = /* glsl */ `
varying float vWorldY;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldY = worldPosition.y;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uTopY;
uniform float uTopSpan;
uniform float uTopCutY;
uniform float uTopCutSpan;
uniform float uBottomY;
uniform float uBottomSpan;
uniform float uStrength;
varying float vWorldY;

void main() {
  float top =
    smoothstep(uTopY - uTopSpan, uTopY, vWorldY) *
    (1.0 - smoothstep(uTopCutY, uTopCutY + uTopCutSpan, vWorldY));
  float bottom = 1.0 - smoothstep(uBottomY, uBottomY + uBottomSpan, vWorldY);
  float alpha = clamp(max(top, bottom), 0.0, 1.0) * uStrength;
  gl_FragColor = vec4(uColor, alpha);
  #include <colorspace_fragment>
}
`;

export function CurlEdgeFade({
  topSpanMult = CONFIG.detailsCurl.EDGE_FADE_TOP_MULT,
  bottomSpanMult = CONFIG.detailsCurl.EDGE_FADE_BOTTOM_MULT,
}: {
  topSpanMult?: number;
  bottomSpanMult?: number;
}) {
  const { viewport } = useHeroLayout();
  const { palette } = useTheme();
  const { progressRef } = useHeroTransition();
  const materialRef = useRef<ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uColor: { value: new Color() },
      uTopY: { value: 0 },
      uTopSpan: { value: 1 },
      uTopCutY: { value: 0 },
      uTopCutSpan: { value: 1 },
      uBottomY: { value: 0 },
      uBottomSpan: { value: 1 },
      uStrength: { value: 0 },
    }),
    [],
  );

  useFrame(() => {
    const material = materialRef.current;
    if (!material) return;

    const foldY = curlUniforms.uCurlFoldY.value;
    const radius = curlUniforms.uCurlRadius.value;

    material.uniforms.uColor.value.set(palette.bg);
    material.uniforms.uTopY.value = foldY;
    material.uniforms.uTopSpan.value = viewport.height * topSpanMult;
    material.uniforms.uTopCutY.value = foldY + radius;
    material.uniforms.uTopCutSpan.value = radius * CONFIG.detailsCurl.EDGE_FADE_CUT_MULT;
    material.uniforms.uBottomY.value = -viewport.height / 2;
    material.uniforms.uBottomSpan.value = viewport.height * bottomSpanMult;
    material.uniforms.uStrength.value = progressRef.current;
  });

  return (
    <mesh renderOrder={20} frustumCulled={false}>
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
