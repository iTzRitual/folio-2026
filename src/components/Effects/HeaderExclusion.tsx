import { forwardRef, useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { useControls } from "leva";
import { HEADER_LAYER, HeaderExclusionEffect } from "./HeaderExclusionEffect";

const EXCLUSION_DEFAULTS = {
  strength: 1,
  threshold: 0.05,
  softness: 0.15,
};

const EXCLUSION_LEVA_SCHEMA = {
  strength: { value: EXCLUSION_DEFAULTS.strength, min: 0, max: 1, step: 0.05 },
  threshold: { value: EXCLUSION_DEFAULTS.threshold, min: 0, max: 0.5, step: 0.005 },
  softness: { value: EXCLUSION_DEFAULTS.softness, min: 0.01, max: 0.6, step: 0.005 },
};

export const HeaderExclusion = forwardRef<
  HeaderExclusionEffect,
  { isDebug?: boolean }
>(({ isDebug = false }, ref) => {
  const levaExclusion = useControls("Header exclusion", EXCLUSION_LEVA_SCHEMA);
  const { strength, threshold, softness } = isDebug
    ? levaExclusion
    : EXCLUSION_DEFAULTS;
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);

  const effect = useMemo(
    () => new HeaderExclusionEffect(scene, camera),
    [scene, camera],
  );

  useEffect(() => {
    effect.uniforms.get("u_strength")!.value = strength;
    effect.uniforms.get("u_threshold")!.value = threshold;
    effect.uniforms.get("u_softness")!.value = softness;
  }, [effect, strength, threshold, softness]);

  useEffect(() => {
    camera.layers.disable(HEADER_LAYER);
    return () => {
      camera.layers.enable(HEADER_LAYER);
    };
  }, [camera]);

  return <primitive ref={ref} object={effect} dispose={null} />;
});

HeaderExclusion.displayName = "HeaderExclusion";
