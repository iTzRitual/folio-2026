"use client";

import { Canvas } from "@react-three/fiber";
import { useRef, useState } from "react";
import { EffectComposer } from "@react-three/postprocessing";
import Model from "./Model";
import { HeroText } from "./HeroText";
import { Header } from "./Header";
import { HeroLayoutProvider } from "../context/HeroLayoutProvider";
import { CustomAberration } from "./Effects/CustomAberration";
import { HeaderExclusion } from "./Effects/HeaderExclusion";
import { Environment, Stats, PerformanceMonitor } from "@react-three/drei";
import { Details } from "./Details";
import { CurlEdgeFade } from "./DetailsScene/CurlEdgeFade";
import { ProjectPreviewOverlay } from "./DetailsScene/ProjectPreviewOverlay";
import { CaseStudyScene } from "./DetailsScene/CaseStudyScene";
import { HeroTransitionProvider } from "../context/HeroTransitionProvider";
import { ProjectHoverProvider } from "../context/ProjectHoverContext";
import { CaseStudyProvider } from "../context/CaseStudyContext";
import { ThemeSweep } from "./ThemeSweep";
import { Suspense } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { ThemeBridge, type ThemeContextValue } from "@/context/ThemeContext";
import { DebugSettingsBridge } from "@/context/DebugSettingsContext";
import type { DebugSettings } from "@/config/debugSettings";
import type { BioVariant } from "@/data/content";
import {
  SceneCapabilitiesProvider,
  useSceneCapabilities,
} from "@/context/SceneCapabilitiesContext";
import type {
  SceneInputMode,
  SceneQualityTier,
} from "@/lib/responsiveScene";
import { WorkstationScene } from "./WorkstationScene";
import { CONFIG } from "@/config/constants";
import { useStableSceneViewport } from "@/hooks/useStableSceneViewport";
import { SceneMotionProvider } from "@/context/SceneMotionContext";

function SceneContent({
  startAnimation,
  bioVariant,
  detailsOverflowViewports,
}: {
  startAnimation: boolean;
  bioVariant: BioVariant;
  detailsOverflowViewports: number;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { qualityTier } = useSceneCapabilities();
  useStableSceneViewport();

  return (
    <HeroLayoutProvider startAnimation={startAnimation}>
      <HeroTransitionProvider
        detailsOverflowViewports={detailsOverflowViewports}
      >
        <SceneMotionProvider>
          <ProjectHoverProvider>
            <CaseStudyProvider>
              <ThemeSweep />
              <directionalLight intensity={3} position={[0, 3, 2]} />
              <Environment files="/hdri/city.hdr" />

              <Suspense fallback={null}>
                <WorkstationScene>
                  <Model />

                  <Header />
                  <HeroText />
                  <Details bioVariant={bioVariant} />
                  <CurlEdgeFade />
                  <ProjectPreviewOverlay />
                  <CaseStudyScene />
                </WorkstationScene>
              </Suspense>
              <EffectComposer multisampling={0}>
                <>
                  <HeaderExclusion />
                  {!prefersReducedMotion && qualityTier !== "low" && (
                    <CustomAberration />
                  )}
                </>
              </EffectComposer>
            </CaseStudyProvider>
          </ProjectHoverProvider>
        </SceneMotionProvider>
      </HeroTransitionProvider>
    </HeroLayoutProvider>
  );
}

export default function Scene({
  startAnimation,
  inputMode,
  detailsOverflowViewports,
  isDebug,
  bioVariant,
  themeContext,
  debugSettings,
}: {
  startAnimation: boolean;
  inputMode: SceneInputMode;
  detailsOverflowViewports: number;
  isDebug: boolean;
  bioVariant: BioVariant;
  themeContext: ThemeContextValue;
  debugSettings: DebugSettings;
}) {
  const eventWrapperRef = useRef<HTMLDivElement>(null!);

  const [dpr, setDpr] = useState(1);
  const [qualityTier, setQualityTier] = useState<SceneQualityTier>("balanced");
  const qualityTierRef = useRef<SceneQualityTier>("balanced");
  const lastQualityChangeRef = useRef(0);

  const changeQuality = (
    direction: "incline" | "decline",
    cooldown: number,
  ) => {
    const now = performance.now();
    if (now - lastQualityChangeRef.current < cooldown) return;

    const current = qualityTierRef.current;
    const next: SceneQualityTier =
      direction === "decline"
        ? current === "high"
          ? "balanced"
          : "low"
        : current === "low"
          ? "balanced"
          : "high";

    if (next === current) return;

    qualityTierRef.current = next;
    lastQualityChangeRef.current = now;
    setQualityTier(next);
    setDpr(
      next === "low"
        ? CONFIG.performanceMonitor.LOW_DPR
        : next === "balanced"
          ? CONFIG.performanceMonitor.BALANCED_DPR
          : CONFIG.performanceMonitor.HIGH_DPR,
    );
  };

  return (
    <div
      ref={eventWrapperRef}
      className="absolute inset-0 w-full h-full overflow-hidden"
    >
      <Canvas
        className="bg-transparent"
        key="main-canvas"
        eventSource={eventWrapperRef}
        eventPrefix="client"
        style={{ touchAction: inputMode === "coarse" ? "pan-y" : "auto" }}
        dpr={dpr}
        gl={{
          // EffectComposer renders into its own targets, so MSAA on the default
          // framebuffer is paid for and then discarded.
          antialias: false,
          powerPreference: "high-performance",
        }}
        onCreated={(state) => {
          state.gl.localClippingEnabled = true;
        }}
      >
        <PerformanceMonitor
          bounds={() => [
            CONFIG.performanceMonitor.LOWER_FPS,
            CONFIG.performanceMonitor.UPPER_FPS,
          ]}
          step={1}
          onDecline={() => {
            changeQuality(
              "decline",
              CONFIG.performanceMonitor.DECLINE_COOLDOWN_MS,
            );
          }}
          onIncline={() => {
            changeQuality(
              "incline",
              CONFIG.performanceMonitor.INCLINE_COOLDOWN_MS,
            );
          }}
          flipflops={Infinity}
        />
        <SceneCapabilitiesProvider
          inputMode={inputMode}
          qualityTier={qualityTier}
        >
          <ThemeBridge value={themeContext}>
            <DebugSettingsBridge value={debugSettings}>
              <SceneContent
                startAnimation={startAnimation}
                bioVariant={bioVariant}
                detailsOverflowViewports={detailsOverflowViewports}
              />
            </DebugSettingsBridge>
          </ThemeBridge>
        </SceneCapabilitiesProvider>
        {isDebug && <Stats />}
      </Canvas>
    </div>
  );
}
