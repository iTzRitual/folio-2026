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
import { HoldIndicator } from "./DetailsScene/HoldIndicator";
import { HeroTransitionProvider } from "../context/HeroTransitionProvider";
import { ProjectHoverProvider } from "../context/ProjectHoverContext";
import { Suspense } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import {
  ThemeBridge,
  useTheme,
  type ThemeContextValue,
} from "@/context/ThemeContext";
import {
  DebugSettingsBridge,
  type DebugSettings,
} from "@/context/DebugSettingsContext";
import type { BioVariant } from "@/data/content";

function SceneContent({
  startAnimation,
  isMobile,
  bioVariant,
}: {
  startAnimation: boolean;
  isMobile: boolean;
  bioVariant: BioVariant;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { palette } = useTheme();

  return (
    <HeroLayoutProvider startAnimation={startAnimation}>
      <HeroTransitionProvider>
        <ProjectHoverProvider>
        <color attach="background" args={[palette.bg]} />
        <directionalLight intensity={3} position={[0, 3, 2]} />
        <Environment files="/hdri/city.hdr" />

        <Suspense fallback={null}>
          <Model isMobile={isMobile} />
        </Suspense>

        {!isMobile && <Header />}
        {!isMobile && <HeroText />}
        {!isMobile && <Details bioVariant={bioVariant} />}
        {!isMobile && <CurlEdgeFade />}
        {!isMobile && <ProjectPreviewOverlay />}
        {!isMobile && <HoldIndicator />}
        {!isMobile && (
          <EffectComposer multisampling={0}>
            <>
              <HeaderExclusion />
              {!prefersReducedMotion && <CustomAberration />}
            </>
          </EffectComposer>
        )}
        </ProjectHoverProvider>
      </HeroTransitionProvider>
    </HeroLayoutProvider>
  );
}

export default function Scene({
  startAnimation,
  isMobile,
  isDebug,
  bioVariant,
  themeContext,
  debugSettings,
}: {
  startAnimation: boolean;
  isMobile: boolean;
  isDebug: boolean;
  bioVariant: BioVariant;
  themeContext: ThemeContextValue;
  debugSettings: DebugSettings;
}) {
  const eventWrapperRef = useRef<HTMLDivElement>(null!);

  const [dpr, setDpr] = useState(1);

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
        style={{ touchAction: "auto" }}
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
        <ThemeBridge value={themeContext}>
          <DebugSettingsBridge value={debugSettings}>
            <SceneContent
              startAnimation={startAnimation}
              isMobile={isMobile}
              bioVariant={bioVariant}
            />
          </DebugSettingsBridge>
        </ThemeBridge>
        {isDebug && <Stats />}
      </Canvas>
    </div>
  );
}
