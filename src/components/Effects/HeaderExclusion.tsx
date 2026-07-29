import { forwardRef, useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { HEADER_LAYER, HeaderExclusionEffect } from "./HeaderExclusionEffect";
import { useDebugSettings } from "@/context/DebugSettingsContext";

export const HeaderExclusion = forwardRef<HeaderExclusionEffect>((_, ref) => {
  const { strength, threshold, softness } = useDebugSettings().headerExclusion;
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
