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

function SceneContent({ startAnimation }: { startAnimation: boolean }) {
  return (
    <HeroLayoutProvider startAnimation={startAnimation}>
      <HeroTransitionProvider>
        <color attach="background" args={["#1D1D1D"]} />
        <directionalLight intensity={3} position={[0, 3, 2]} />
        <Environment preset="city" />
        {/* <Background /> */}
        <Suspense fallback={null}>
          <Model />
        </Suspense>
        <HeroText />
        <Details />
        <EffectComposer>
          <CustomAberration />
        </EffectComposer>
      </HeroTransitionProvider>
    </HeroLayoutProvider>
  );
}

export default function Scene({ startAnimation }: { startAnimation: boolean }) {
  const eventWrapperRef = useRef<HTMLDivElement>(null!);

  return (
    <div
      ref={eventWrapperRef}
      className="absolute inset-0 w-full h-full overflow-hidden"
    >
      <Canvas
        className="bg-[#1D1D1D]"
        key="main-canvas"
        eventSource={eventWrapperRef}
        eventPrefix="client"
        style={{ touchAction: "auto" }}
      >
        <SceneContent startAnimation={startAnimation} />
      </Canvas>
    </div>
  );
}
