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
import {
  DebugSettingsBridge,
  type DebugSettings,
} from "@/context/DebugSettingsContext";
import type { BioVariant } from "@/data/content";
import {
  SceneCapabilitiesProvider,
  useSceneCapabilities,
} from "@/context/SceneCapabilitiesContext";
import type {
  SceneInputMode,
  SceneQualityTier,
} from "@/lib/responsiveScene";

function SceneContent({
  startAnimation,
  bioVariant,
}: {
  startAnimation: boolean;
  bioVariant: BioVariant;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { qualityTier } = useSceneCapabilities();

  return (
    <HeroLayoutProvider startAnimation={startAnimation}>
      <HeroTransitionProvider>
        <ProjectHoverProvider>
        <CaseStudyProvider>
        <ThemeSweep />
        <directionalLight intensity={3} position={[0, 3, 2]} />
        <Environment files="/hdri/city.hdr" />

        <Suspense fallback={null}>
          <Model />
        </Suspense>

        <Header />
        <HeroText />
        <Details bioVariant={bioVariant} />
        <CurlEdgeFade />
        <ProjectPreviewOverlay />
        <CaseStudyScene />
        {(
          <EffectComposer multisampling={0}>
            <>
              <HeaderExclusion />
              {!prefersReducedMotion && qualityTier !== "low" && (
                <CustomAberration />
              )}
            </>
          </EffectComposer>
        )}
        </CaseStudyProvider>
        </ProjectHoverProvider>
      </HeroTransitionProvider>
    </HeroLayoutProvider>
  );
}

export default function Scene({
  startAnimation,
  inputMode,
  isDebug,
  bioVariant,
  themeContext,
  debugSettings,
}: {
  startAnimation: boolean;
  inputMode: SceneInputMode;
  isDebug: boolean;
  bioVariant: BioVariant;
  themeContext: ThemeContextValue;
  debugSettings: DebugSettings;
}) {
  const eventWrapperRef = useRef<HTMLDivElement>(null!);

  const [dpr, setDpr] = useState(1);
  const [qualityTier, setQualityTier] = useState<SceneQualityTier>("balanced");

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
          bounds={() => [45, 55]}
          step={1}
          onDecline={() => {
            setQualityTier("low");
            setDpr((prevDpr) => {
              if (prevDpr >= 1.5) {
                return 1.0;
              }
              if (prevDpr > 0.75) {
                return 0.75;
              }
              return prevDpr;
            });
          }}
          onIncline={() => {
            setQualityTier("high");
            setDpr((prevDpr) => {
              if (prevDpr <= 0.75) {
                return 1.0;
              }
              if (prevDpr < 1.5) {
                return 1.5;
              }
              return prevDpr;
            });
          }}
          // Not a "this device is struggling" signal: drei increments `flipped`
          // on every incline *and* decline, and keeps incrementing once the
          // factor has saturated, so onFallback fires on healthy machines too.
          // It only exists here to stop DPR oscillating; nothing may hang off
          // it.
          flipflops={3}
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
              />
            </DebugSettingsBridge>
          </ThemeBridge>
        </SceneCapabilitiesProvider>
        {isDebug && <Stats />}
      </Canvas>
    </div>
  );
}
