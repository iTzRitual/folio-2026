"use client";

import { Canvas } from "@react-three/fiber";
import { useRef } from "react";
import { EffectComposer } from "@react-three/postprocessing";
import Model from "./Model";
import { HeroText } from "./HeroText";
import { HeroLayoutProvider } from "./HeroLayoutProvider";
import { CustomAberration } from "./Effects/CustomAberration";
import { Environment } from "@react-three/drei";
import { Details } from "./Details";
import { HeroTransitionProvider } from "./HeroTransitionProvider";
import { Suspense } from "react";
import { Stats } from "@react-three/drei";
import { GridOverlay } from "./HeroScene/GridOverlay";
import { THEME } from "../config/constants";

function SceneContent({
  startAnimation,
  isMobile,
}: {
  startAnimation: boolean;
  isMobile: boolean;
}) {
  return (
    <HeroLayoutProvider startAnimation={startAnimation}>
      <HeroTransitionProvider>
        <color attach="background" args={[THEME.darkest]} />
        <directionalLight intensity={3} position={[0, 3, 2]} />
        <Environment preset="city" />

        <Suspense fallback={null}>
          <Model isMobile={isMobile} />
        </Suspense>

        {!isMobile && <HeroText />}
        {!isMobile && <Details />}
        {!isMobile && (
          <EffectComposer multisampling={0}>
            <CustomAberration />
          </EffectComposer>
        )}
      </HeroTransitionProvider>
    </HeroLayoutProvider>
  );
}

export default function Scene({
  startAnimation,
  isMobile,
}: {
  startAnimation: boolean;
  isMobile: boolean;
}) {
  const eventWrapperRef = useRef<HTMLDivElement>(null!);

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
        dpr={[1, 1.5]}
      >
        <SceneContent startAnimation={startAnimation} isMobile={isMobile} />
        <Stats />
      </Canvas>
      <GridOverlay />
    </div>
  );
}
