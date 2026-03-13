"use client";

import { Canvas } from "@react-three/fiber";
import Model from "./Model";
import { GridOverlay } from "./HeroScene/GridOverlay";
import { Environment } from "@react-three/drei";

export default function Scene() {
  return (
    <>
      <Canvas className="bg-[#292929]" key="main-canvas">
        <directionalLight intensity={3} position={[0, 3, 2]} />
        <Environment preset="city" />
        <Model />
      </Canvas>
      <GridOverlay />
    </>
  );
}
