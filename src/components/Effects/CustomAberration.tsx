import React, { forwardRef, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector2, MathUtils } from "three";
import { CustomAberrationEffect } from "./CustomAberrationEffect";
import { CONFIG } from "../../config/constants";

export const CustomAberration = forwardRef<CustomAberrationEffect, unknown>(
  (props, ref) => {
    const effect = useMemo(() => new CustomAberrationEffect(), []);
    const { size } = useThree();

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
          CONFIG.customAberration.SCROLL_VEL_SCALE *
          (CONFIG.customAberration.VEL_MULT / safeDelta),
        -CONFIG.customAberration.SCROLL_VEL_CLAMP,
        CONFIG.customAberration.SCROLL_VEL_CLAMP,
      );

      const scrollLerpMult =
        Math.abs(targetScrollVel) > Math.abs(scrollVelocity.current)
          ? CONFIG.customAberration.SCROLL_ATTACK_MULT
          : CONFIG.customAberration.SCROLL_RELEASE_MULT;

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
    });

    return <primitive ref={ref} object={effect} dispose={null} />;
  },
);

CustomAberration.displayName = "CustomAberration";
