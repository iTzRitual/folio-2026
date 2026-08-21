"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Color, type Mesh, Vector3 } from "three";
import { CONFIG, THEMES } from "@/config/constants";
import { useHeroTransition } from "@/context/HeroTransitionContext";
import { useTheme, type ThemeRole } from "@/context/ThemeContext";
import { mixHex } from "@/lib/oklab";
import {
  SWEEP_GLSL,
  sweepCoord,
  sweepFront,
  sweepProgress,
  sweepUniforms,
} from "@/lib/themeSweep";

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
export const THEME_SWEEP_LAYER = 2;

export function ThemeSweep() {
  const { camera, viewport } = useThree();
  const { revealProgressRef } = useHeroTransition();
  const { runRef, targetsRef } = useTheme().sweep;
  const projected = useRef(new Vector3());
  const backdrop = useRef<Color>(null);
  const sweepPlane = useRef<Mesh>(null);
  const wasPhase2Active = useRef(false);

  useEffect(() => {
    camera.layers.enable(THEME_SWEEP_LAYER);
    sweepPlane.current?.layers.set(THEME_SWEEP_LAYER);

    return () => camera.layers.disable(THEME_SWEEP_LAYER);
  }, [camera]);

  useFrame((_, delta) => {
    const phase2Active =
      revealProgressRef.current >= CONFIG.phase2.BROWSER_REVEAL_START;
    const run = runRef.current;
    const { style } = document.documentElement;

    camera.layers.enable(THEME_SWEEP_LAYER);
    if (phase2Active) camera.layers.disable(THEME_SWEEP_LAYER);

    if (!phase2Active && wasPhase2Active.current) {
      backdrop.current?.set(run.to.bg);
      for (const [, name] of CSS_VARS) style.removeProperty(name);
    }

    wasPhase2Active.current = phase2Active;

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

      if (!finished && object) {
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

    if (!phase2Active) {
      const centre = sweepProgress(front, sweepCoord(0.5, 0.5));
      backdrop.current?.set(mixHex(run.from.bg, run.to.bg, centre));

      for (const [role, name] of CSS_VARS) {
        if (finished) style.removeProperty(name);
        else style.setProperty(name, mixHex(run.from[role], run.to[role], centre));
      }
    }

    sweepUniforms.uSweepFront.value = front;
    sweepUniforms.uSweepActive.value = finished ? 0 : 1;
    sweepUniforms.uSweepBefore.value.set(finished ? run.to.bg : run.from.bg);
    sweepUniforms.uSweepAfter.value.set(run.to.bg);

    if (finished) run.settled = true;
  });

  const plane = viewport.getCurrentViewport(camera, PLANE_DEPTH);

  return (
    <>
      <color attach="background" ref={backdrop} args={[THEMES.Dark.bg]} />
      <mesh
        ref={sweepPlane}
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
    </>
  );
}
