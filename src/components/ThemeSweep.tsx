"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import { Vector3 } from "three";
import { CONFIG } from "@/config/constants";
import { useTheme, type ThemeRole } from "@/context/ThemeContext";
import { mixHex } from "@/lib/oklab";
import {
  SWEEP_GLSL,
  sweepCoord,
  sweepFront,
  sweepProgress,
  sweepUniforms,
} from "@/lib/themeSweep";

// Written from one canonical progress, never from the per-element loop: several
// elements share a role and hold different progress at the same instant.
const CSS_VARS: [ThemeRole, string][] = [
  ["bg", "--bg"],
  ["textPrimary", "--text-primary"],
  ["textSecondary", "--text-secondary"],
  ["textBody", "--text-body"],
  ["textHint", "--text-hint"],
  ["textStacked", "--text-stacked"],
];

const VERTEX = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT =
  SWEEP_GLSL +
  /* glsl */ `
varying vec2 vUv;

void main() {
  gl_FragColor = vec4(themeSweptColor(vUv), 1.0);
  #include <colorspace_fragment>
}
`;

const PLANE_DEPTH = new Vector3(0, 0, CONFIG.themeSweep.PLANE_Z);

export function ThemeSweep() {
  const { camera, viewport } = useThree();
  const { runRef, targetsRef } = useTheme().sweep;
  const projected = useRef(new Vector3());

  useFrame((_, delta) => {
    const run = runRef.current;
    if (!run.active && run.settled) return;

    if (run.active) {
      run.elapsed += delta;
      if (run.elapsed >= CONFIG.themeSweep.DURATION) {
        run.elapsed = CONFIG.themeSweep.DURATION;
        run.active = false;
      }
    }

    const front = sweepFront(run.elapsed / CONFIG.themeSweep.DURATION);
    const finished = !run.active;
    const ndc = projected.current;

    for (const target of targetsRef.current) {
      const object = target.object.current;
      let progress = 1;

      if (object) {
        ndc.setFromMatrixPosition(object.matrixWorld).project(camera);
        progress = sweepProgress(
          front,
          sweepCoord((ndc.x + 1) / 2, (ndc.y + 1) / 2),
        );
      }

      target.apply(
        mixHex(run.from[target.role], run.to[target.role], progress),
      );
    }

    const centre = sweepProgress(front, sweepCoord(0.5, 0.5));
    const { style } = document.documentElement;
    for (const [role, name] of CSS_VARS) {
      if (finished) style.removeProperty(name);
      else style.setProperty(name, mixHex(run.from[role], run.to[role], centre));
    }

    sweepUniforms.uSweepFront.value = front;
    sweepUniforms.uSweepActive.value = finished ? 0 : 1;
    sweepUniforms.uSweepBefore.value.set(finished ? run.to.bg : run.from.bg);
    sweepUniforms.uSweepAfter.value.set(run.to.bg);

    if (finished) run.settled = true;
  });

  const plane = viewport.getCurrentViewport(camera, PLANE_DEPTH);

  return (
    <mesh
      position={[0, 0, CONFIG.themeSweep.PLANE_Z]}
      scale={[plane.width, plane.height, 1]}
    >
      <planeGeometry />
      <shaderMaterial
        uniforms={sweepUniforms}
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT}
        toneMapped={false}
      />
    </mesh>
  );
}
