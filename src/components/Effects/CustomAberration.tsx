import React, { forwardRef, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector2 } from "three";
import { CustomAberrationEffect } from "./CustomAberrationEffect";

export const CustomAberration = forwardRef((props, ref) => {
  const effect = useMemo(() => new CustomAberrationEffect(), []);
  const { size } = useThree();

  const currentMouse = useRef(new Vector2(0.5, 0.5));
  const targetMouse = useRef(new Vector2(0.5, 0.5));
  const prevMouse = useRef(new Vector2(0.5, 0.5));
  const intensity = useRef(0.0);

  useEffect(() => {
    effect.uniforms.get("u_resolution")!.value.set(size.width, size.height);
  }, [size, effect]);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const x = e.clientX / window.innerWidth;
      const y = 1.0 - e.clientY / window.innerHeight;

      targetMouse.current.set(x, y);

      intensity.current = 1.0;
    };

    window.addEventListener("pointermove", handlePointerMove);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, []);

  useFrame(() => {
    prevMouse.current.copy(currentMouse.current);
    currentMouse.current.lerp(targetMouse.current, 0.15);

    intensity.current = Math.max(0.0, intensity.current - 0.05);

    effect.uniforms.get("u_mouse")!.value.copy(currentMouse.current);
    effect.uniforms.get("u_prevMouse")!.value.copy(prevMouse.current);
    effect.uniforms.get("u_aberrationIntensity")!.value = intensity.current;
  });

  return <primitive ref={ref} object={effect} dispose={null} />;
});

CustomAberration.displayName = "CustomAberration";
