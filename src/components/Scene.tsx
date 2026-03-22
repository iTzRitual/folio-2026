"use client";

import { Canvas } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import Model from "./Model";
import { HeroText } from "./HeroText";
import { HeroLayoutProvider } from "./HeroLayoutProvider";
import { CustomAberration } from "./Effects/CustomAberration";
import { Environment } from "@react-three/drei";
import { GridOverlay } from "./HeroScene/GridOverlay";

function SceneContent({ startAnimation }: { startAnimation: boolean }) {
  return (
    <HeroLayoutProvider startAnimation={startAnimation}>
      <color attach="background" args={["#1D1D1D"]} />
      <directionalLight intensity={3} position={[0, 3, 2]} />
      <Environment preset="city" />
      {/* <Background /> */}
      <Model />
      <HeroText />
      <EffectComposer>
        <CustomAberration />
      </EffectComposer>
    </HeroLayoutProvider>
  );
}

export default function Scene({ startAnimation }: { startAnimation: boolean }) {
  return (
    <>
      <Canvas className="bg-[#1D1D1D]" key="main-canvas">
        <SceneContent startAnimation={startAnimation} />
      </Canvas>
      {/* <GridOverlay /> */}
    </>
  );
}
