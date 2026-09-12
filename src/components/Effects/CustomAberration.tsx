import React, { forwardRef, useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils } from "three";
import { CustomAberrationEffect } from "./CustomAberrationEffect";
import { useDebugSettings } from "@/context/DebugSettingsContext";
import { CONFIG } from "../../config/constants";
import { useSceneCapabilities } from "@/context/SceneCapabilitiesContext";
import { useHeroTransition } from "@/context/HeroTransitionContext";
import { useSceneMotion } from "@/context/SceneMotionContext";

function affordableTaps(width: number, height: number) {
  const {
    SCROLL_TAPS,
    SCROLL_TAPS_MIN,
    SCROLL_TAP_PIXEL_BUDGET,
    SCROLL_TAP_DPR_CEILING,
  } = CONFIG.customAberration;

  const devicePixels = width * height * SCROLL_TAP_DPR_CEILING ** 2;
  if (devicePixels <= 0) return SCROLL_TAPS;

  return MathUtils.clamp(
    Math.round((SCROLL_TAPS * SCROLL_TAP_PIXEL_BUDGET) / devicePixels),
    SCROLL_TAPS_MIN,
    SCROLL_TAPS,
  );
}

export const CustomAberration = forwardRef<CustomAberrationEffect>((_, ref) => {
  const scroll = useDebugSettings().scrollBlur;
  const { inputMode } = useSceneCapabilities();
  const { revealProgressRef } = useHeroTransition();
  const {
    pointerRef,
    pointerVelocityRef,
    pointerIntensityRef,
    scrollVelocityRef,
  } = useSceneMotion();
  const { size } = useThree();
  const taps = Math.min(
    scroll.taps,
    affordableTaps(size.width, size.height),
    inputMode === "coarse" ? 4 : CONFIG.customAberration.SCROLL_TAPS,
  );
  const effect = useMemo(() => new CustomAberrationEffect(taps), [taps]);

  useEffect(() => {
    const aspectRatio = size.width / size.height;
    const columns = CONFIG.customAberration.COLUMNS;
    const rows = columns / aspectRatio;

    effect.setGrid(columns, rows, aspectRatio);
  }, [size, effect]);

  useFrame(() => {
    const phase2SurfaceActive =
      revealProgressRef.current >= CONFIG.phase2.BROWSER_REVEAL_START;
    effect.setPointer(
      pointerRef.current,
      !phase2SurfaceActive && inputMode === "fine"
        ? pointerIntensityRef.current
        : 0,
      phase2SurfaceActive ? 0 : pointerVelocityRef.current.x,
      phase2SurfaceActive ? 0 : pointerVelocityRef.current.y,
    );
    const mobileIntensity = inputMode === "coarse" ? 0.55 : 1;
    effect.setScroll(
      phase2SurfaceActive ? 0 : scrollVelocityRef.current,
      scroll.blur * mobileIntensity,
      scroll.split * mobileIntensity,
      scroll.vignetteXWeight,
      scroll.vignetteInner,
      scroll.vignetteOuter,
      scroll.vignetteFloor,
    );
  });

  return <primitive ref={ref} object={effect} dispose={null} />;
},
);

CustomAberration.displayName = "CustomAberration";
