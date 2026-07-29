import React, { forwardRef, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector2, MathUtils } from "three";
import { useControls } from "leva";
import { CustomAberrationEffect } from "./CustomAberrationEffect";
import { CONFIG } from "../../config/constants";

const SCROLL_DEFAULTS = {
  velocityScale: CONFIG.customAberration.SCROLL_VEL_SCALE,
  blur: CONFIG.customAberration.SCROLL_BLUR,
  split: CONFIG.customAberration.SCROLL_SPLIT,
  taps: CONFIG.customAberration.SCROLL_TAPS,
  vignetteXWeight: CONFIG.customAberration.SCROLL_VIGNETTE_X_WEIGHT,
  vignetteInner: CONFIG.customAberration.SCROLL_VIGNETTE_INNER,
  vignetteOuter: CONFIG.customAberration.SCROLL_VIGNETTE_OUTER,
  vignetteFloor: CONFIG.customAberration.SCROLL_VIGNETTE_FLOOR,
  attack: CONFIG.customAberration.SCROLL_ATTACK_MULT,
  release: CONFIG.customAberration.SCROLL_RELEASE_MULT,
};

const SCROLL_LEVA_SCHEMA = {
  velocityScale: { value: SCROLL_DEFAULTS.velocityScale, min: 1, max: 60, step: 1 },
  blur: { value: SCROLL_DEFAULTS.blur, min: 0, max: 0.12, step: 0.001 },
  split: { value: SCROLL_DEFAULTS.split, min: 0, max: 0.03, step: 0.0005 },
  taps: { value: SCROLL_DEFAULTS.taps, min: 2, max: 16, step: 1 },
  vignetteXWeight: {
    value: SCROLL_DEFAULTS.vignetteXWeight,
    min: 0,
    max: 1.5,
    step: 0.05,
  },
  vignetteInner: { value: SCROLL_DEFAULTS.vignetteInner, min: 0, max: 0.7, step: 0.01 },
  vignetteOuter: { value: SCROLL_DEFAULTS.vignetteOuter, min: 0.05, max: 1.2, step: 0.01 },
  vignetteFloor: { value: SCROLL_DEFAULTS.vignetteFloor, min: 0, max: 1, step: 0.05 },
  attack: { value: SCROLL_DEFAULTS.attack, min: 5, max: 80, step: 1 },
  release: { value: SCROLL_DEFAULTS.release, min: 2, max: 40, step: 1 },
};

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

export const CustomAberration = forwardRef<CustomAberrationEffect, {
  isDebug?: boolean;
}>(({ isDebug = false }, ref) => {
    const levaScroll = useControls("Scroll blur", SCROLL_LEVA_SCHEMA);
    const scroll = isDebug ? levaScroll : SCROLL_DEFAULTS;
    const { size } = useThree();
    const taps = isDebug
      ? scroll.taps
      : affordableTaps(size.width, size.height);
    const effect = useMemo(() => new CustomAberrationEffect(taps), [taps]);

    const currentMouse = useRef(new Vector2(0.5, 0.5));
    const targetMouse = useRef(new Vector2(0.5, 0.5));
    const prevMouse = useRef(new Vector2(0.5, 0.5));
    const intensity = useRef(0.0);
    const prevScrollY = useRef<number | null>(null);
    const scrollVelocity = useRef(0.0);

    useEffect(() => {
      const aspectRatio = size.width / size.height;
      const columns = CONFIG.customAberration.COLUMNS;
      const rows = columns / aspectRatio;

      effect.uniforms.get("u_gridSize")!.value.set(columns, rows);
      effect.uniforms.get("u_aspect")!.value.set(aspectRatio, 1.0);
    }, [size, effect]);

    useFrame(({ pointer }, delta) => {
      const mappedX = (pointer.x + 1) / 2;
      const mappedY = (pointer.y + 1) / 2;

      const dx = mappedX - targetMouse.current.x;
      const dy = mappedY - targetMouse.current.y;

      if (Math.abs(dx) > 0.0001 || Math.abs(dy) > 0.0001) {
        intensity.current = 1.0;
      }

      targetMouse.current.set(mappedX, mappedY);
      prevMouse.current.copy(currentMouse.current);

      const lerpFactor = 1 - Math.exp(-CONFIG.customAberration.LERP_FACTOR_MULT * delta);
      currentMouse.current.lerp(targetMouse.current, lerpFactor);

      intensity.current = MathUtils.lerp(
        intensity.current,
        0,
        1 - Math.exp(-CONFIG.customAberration.INTENSITY_LERP_MULT * delta),
      );

      if (intensity.current < CONFIG.customAberration.INTENSITY_MIN) {
        intensity.current = 0.0;
      }

      const safeDelta = Math.max(delta, CONFIG.customAberration.SAFE_DELTA_MIN);
      const velX =
        intensity.current > 0
          ? (currentMouse.current.x - prevMouse.current.x) *
            (CONFIG.customAberration.VEL_MULT / safeDelta)
          : 0;
      const velY =
        intensity.current > 0
          ? (currentMouse.current.y - prevMouse.current.y) *
            (CONFIG.customAberration.VEL_MULT / safeDelta)
          : 0;

      const scrollY = window.scrollY;
      const scrollDelta =
        prevScrollY.current === null ? 0 : scrollY - prevScrollY.current;
      prevScrollY.current = scrollY;

      const targetScrollVel = MathUtils.clamp(
        (scrollDelta / size.height) *
          scroll.velocityScale *
          (CONFIG.customAberration.VEL_MULT / safeDelta),
        -CONFIG.customAberration.SCROLL_VEL_CLAMP,
        CONFIG.customAberration.SCROLL_VEL_CLAMP,
      );

      const scrollLerpMult =
        Math.abs(targetScrollVel) > Math.abs(scrollVelocity.current)
          ? scroll.attack
          : scroll.release;

      scrollVelocity.current = MathUtils.lerp(
        scrollVelocity.current,
        targetScrollVel,
        1 - Math.exp(-scrollLerpMult * delta),
      );

      if (Math.abs(scrollVelocity.current) < CONFIG.customAberration.SCROLL_MIN) {
        scrollVelocity.current = 0.0;
      }

      effect.uniforms.get("u_mouse")!.value.copy(currentMouse.current);
      effect.uniforms.get("u_aberrationIntensity")!.value = intensity.current;
      effect.uniforms.get("u_mouseVelocity")!.value.set(velX, velY);
      effect.uniforms.get("u_scrollVelocity")!.value = scrollVelocity.current;
      effect.uniforms.get("u_scrollBlur")!.value = scroll.blur;
      effect.uniforms.get("u_scrollSplit")!.value = scroll.split;
      effect.uniforms
        .get("u_scrollVignette")!
        .value.set(
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
