import React, { forwardRef, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector2, MathUtils } from "three";
import { CustomAberrationEffect } from "./CustomAberrationEffect";

export const CustomAberration = forwardRef<CustomAberrationEffect, unknown>(
  (props, ref) => {
    const effect = useMemo(() => new CustomAberrationEffect(), []);
    const { size } = useThree();

    const currentMouse = useRef(new Vector2(0.5, 0.5));
    const targetMouse = useRef(new Vector2(0.5, 0.5));
    const prevMouse = useRef(new Vector2(0.5, 0.5));
    const intensity = useRef(0.0);

    useEffect(() => {
      const aspectRatio = size.width / size.height;
      const columns = 40.0;
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

      const lerpFactor = 1 - Math.exp(-9.75 * delta);
      currentMouse.current.lerp(targetMouse.current, lerpFactor);

      intensity.current = MathUtils.lerp(
        intensity.current,
        0,
        1 - Math.exp(-3.0 * delta),
      );

      if (intensity.current < 0.005) {
        intensity.current = 0.0;
      }

      const safeDelta = Math.max(delta, 0.0001);
      const velX =
        intensity.current > 0
          ? (currentMouse.current.x - prevMouse.current.x) *
            (0.016666 / safeDelta)
          : 0;
      const velY =
        intensity.current > 0
          ? (currentMouse.current.y - prevMouse.current.y) *
            (0.016666 / safeDelta)
          : 0;

      effect.uniforms.get("u_mouse")!.value.copy(currentMouse.current);
      effect.uniforms.get("u_aberrationIntensity")!.value = intensity.current;
      effect.uniforms.get("u_mouseVelocity")!.value.set(velX, velY);
    });

    return <primitive ref={ref} object={effect} dispose={null} />;
  },
);

CustomAberration.displayName = "CustomAberration";
