import { useLayoutEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils, NoToneMapping } from "three";
import { CONFIG } from "@/config/constants";
import { useDebugSettings } from "@/context/DebugSettingsContext";
import { useHeroTransition } from "@/context/HeroTransitionContext";
import { useSceneCapabilities } from "@/context/SceneCapabilitiesContext";
import { useSceneMotion } from "@/context/SceneMotionContext";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { HEADER_LAYER } from "./HeaderExclusionEffect";
import { PortfolioEffectPipeline } from "./PortfolioEffectPipeline";

function affordableTaps(width: number, height: number) {
  const config = CONFIG.customAberration;
  const devicePixels = width * height * config.SCROLL_TAP_DPR_CEILING ** 2;
  return devicePixels <= 0 ? config.SCROLL_TAPS : MathUtils.clamp(
    Math.round(config.SCROLL_TAPS * config.SCROLL_TAP_PIXEL_BUDGET / devicePixels),
    config.SCROLL_TAPS_MIN,
    config.SCROLL_TAPS,
  );
}

export function PortfolioEffects() {
  const pipelineRef = useRef<PortfolioEffectPipeline | null>(null);
  const { gl, scene, camera, size, viewport } = useThree();
  const { headerExclusion, scrollBlur } = useDebugSettings();
  const { inputMode, qualityTier } = useSceneCapabilities();
  const { revealProgressRef } = useHeroTransition();
  const motion = useSceneMotion();
  const reducedMotion = usePrefersReducedMotion();

  useLayoutEffect(() => {
    const pipeline = new PortfolioEffectPipeline(gl, scene, camera);
    pipelineRef.current = pipeline;
    const toneMapping = gl.toneMapping;
    const mask = camera.layers.mask;
    gl.toneMapping = NoToneMapping;
    camera.layers.disable(HEADER_LAYER);
    return () => {
      pipelineRef.current = null;
      gl.toneMapping = toneMapping;
      camera.layers.mask = mask;
      pipeline.dispose();
    };
  }, [gl, scene, camera]);

  useLayoutEffect(() => {
    pipelineRef.current?.composer.setSize(size.width, size.height);
  }, [gl, scene, camera, size.width, size.height, viewport.dpr]);

  useFrame((_, delta) => {
    const pipeline = pipelineRef.current;
    if (!pipeline) return;
    const workstationSurfaceActive = revealProgressRef.current >= CONFIG.workstation.BROWSER_REVEAL_START;
    const enabled = !workstationSurfaceActive && qualityTier !== "low" && !reducedMotion;
    pipeline.setAberrationEnabled(enabled);
    pipeline.header.configure(headerExclusion.strength, headerExclusion.threshold, headerExclusion.softness);
    pipeline.setAntialiasingMode(workstationSurfaceActive ? "workstation" : "msaa");
    pipeline.header.setActive(!workstationSurfaceActive);
    const effect = pipeline.aberration;
    effect.setTaps(Math.min(scrollBlur.taps, affordableTaps(size.width, size.height), inputMode === "coarse" ? CONFIG.customAberration.SCROLL_TAPS_COARSE : CONFIG.customAberration.SCROLL_TAPS));
    const aspect = size.width / size.height;
    effect.setGrid(CONFIG.customAberration.COLUMNS, CONFIG.customAberration.COLUMNS / aspect, aspect);
    effect.setPointer(
      motion.pointerRef.current,
      !workstationSurfaceActive && inputMode === "fine" ? motion.pointerIntensityRef.current : 0,
      workstationSurfaceActive ? 0 : motion.pointerVelocityRef.current.x,
      workstationSurfaceActive ? 0 : motion.pointerVelocityRef.current.y,
    );
    const intensity = inputMode === "coarse" ? CONFIG.customAberration.SCROLL_INTENSITY_COARSE : 1;
    effect.setScroll(
      workstationSurfaceActive ? 0 : motion.scrollVelocityRef.current,
      scrollBlur.blur * intensity,
      scrollBlur.split * intensity,
      scrollBlur.vignetteXWeight,
      scrollBlur.vignetteInner,
      scrollBlur.vignetteOuter,
      scrollBlur.vignetteFloor,
    );
    const autoClear = gl.autoClear;
    gl.autoClear = true;
    try {
      pipeline.composer.render(delta);
    } finally {
      gl.autoClear = autoClear;
    }
  }, 1);

  return null;
}
