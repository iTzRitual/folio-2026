"use client";

import { useFrame, useThree } from "@react-three/fiber";
import {
  createContext,
  useContext,
  useMemo,
  useRef,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { MathUtils, Vector2 } from "three";
import { CONFIG } from "@/config/constants";
import { useDebugSettings } from "@/context/DebugSettingsContext";
import { useHeroTransition } from "@/context/HeroTransitionContext";
import { useSceneCapabilities } from "@/context/SceneCapabilitiesContext";

type SceneMotionContextValue = {
  pointerRef: MutableRefObject<Vector2>;
  pointerVelocityRef: MutableRefObject<Vector2>;
  pointerIntensityRef: MutableRefObject<number>;
  scrollVelocityRef: MutableRefObject<number>;
};

const SceneMotionContext = createContext<SceneMotionContextValue | undefined>(
  undefined,
);

export function useSceneMotion() {
  const context = useContext(SceneMotionContext);
  if (!context) {
    throw new Error("useSceneMotion must be used within SceneMotionProvider");
  }
  return context;
}

export function SceneMotionProvider({ children }: { children: ReactNode }) {
  const scroll = useDebugSettings().scrollBlur;
  const { inputMode } = useSceneCapabilities();
  const { revealProgressRef } = useHeroTransition();
  const { size } = useThree();
  const pointerRef = useRef(new Vector2(0.5, 0.5));
  const targetPointerRef = useRef(new Vector2(0.5, 0.5));
  const previousPointerRef = useRef(new Vector2(0.5, 0.5));
  const pointerVelocityRef = useRef(new Vector2());
  const pointerIntensityRef = useRef(0);
  const previousScrollYRef = useRef<number | null>(null);
  const targetScrollVelocityRef = useRef(0);
  const scrollVelocityRef = useRef(0);

  const value = useMemo(
    () => ({
      pointerRef,
      pointerVelocityRef,
      pointerIntensityRef,
      scrollVelocityRef,
    }),
    [],
  );

  useFrame(({ pointer }, delta) => {
    const mappedX = (pointer.x + 1) / 2;
    const mappedY = (pointer.y + 1) / 2;
    const targetPointer = targetPointerRef.current;

    if (
      inputMode === "fine" &&
      (Math.abs(mappedX - targetPointer.x) > 0.0001 ||
        Math.abs(mappedY - targetPointer.y) > 0.0001)
    ) {
      pointerIntensityRef.current = 1;
    }

    targetPointer.set(mappedX, mappedY);
    previousPointerRef.current.copy(pointerRef.current);
    pointerRef.current.lerp(
      targetPointer,
      1 - Math.exp(-CONFIG.customAberration.LERP_FACTOR_MULT * delta),
    );
    pointerIntensityRef.current = MathUtils.lerp(
      pointerIntensityRef.current,
      0,
      1 - Math.exp(-CONFIG.customAberration.INTENSITY_LERP_MULT * delta),
    );
    if (
      pointerIntensityRef.current < CONFIG.customAberration.INTENSITY_MIN
    ) {
      pointerIntensityRef.current = 0;
    }

    const safeDelta = Math.max(delta, CONFIG.customAberration.SAFE_DELTA_MIN);
    const velocityScale = CONFIG.customAberration.VEL_MULT / safeDelta;
    pointerVelocityRef.current
      .subVectors(pointerRef.current, previousPointerRef.current)
      .multiplyScalar(
        pointerIntensityRef.current > 0 ? velocityScale : 0,
      );

    const scrollY = window.scrollY;
    const scrollDelta =
      previousScrollYRef.current === null
        ? 0
        : scrollY - previousScrollYRef.current;
    previousScrollYRef.current = scrollY;

    if (revealProgressRef.current > 0) {
      targetScrollVelocityRef.current *= Math.exp(
        -60 * CONFIG.scrollTimeline.LENIS_LERP * delta,
      );
    } else {
      targetScrollVelocityRef.current = MathUtils.clamp(
        (scrollDelta / size.height) * scroll.velocityScale * velocityScale,
        -CONFIG.customAberration.SCROLL_VEL_CLAMP,
        CONFIG.customAberration.SCROLL_VEL_CLAMP,
      );
    }
    if (
      Math.abs(targetScrollVelocityRef.current) <
      CONFIG.customAberration.SCROLL_MIN
    ) {
      targetScrollVelocityRef.current = 0;
    }

    const response =
      Math.abs(targetScrollVelocityRef.current) >
      Math.abs(scrollVelocityRef.current)
        ? scroll.attack
        : scroll.release;
    scrollVelocityRef.current = MathUtils.lerp(
      scrollVelocityRef.current,
      targetScrollVelocityRef.current,
      1 - Math.exp(-response * delta),
    );
    if (
      Math.abs(scrollVelocityRef.current) < CONFIG.customAberration.SCROLL_MIN
    ) {
      scrollVelocityRef.current = 0;
    }
  });

  return (
    <SceneMotionContext.Provider value={value}>
      {children}
    </SceneMotionContext.Provider>
  );
}
