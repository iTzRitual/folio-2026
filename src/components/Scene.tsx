"use client";

import { Canvas, useThree } from "@react-three/fiber";
import Model from "./Model";
import { GridOverlay } from "./HeroScene/GridOverlay";
import { Environment, useTexture } from "@react-three/drei";

function Background() {
  const { viewport } = useThree();
  const texture = useTexture("/gemini_bg.png");

  return (
    <mesh
      scale={[viewport.width * 3, viewport.height * 3, 1]}
      position={[0, 0, -3]}
    >
      <planeGeometry />
      <meshBasicMaterial map={texture} depthTest={false} />
    </mesh>
  );
}

export default function Scene() {
  return (
    <>
      <Canvas className="bg-[#1D1D1D]" key="main-canvas">
        <directionalLight intensity={3} position={[0, 3, 2]} />
        <Environment preset="city" />
        <Background />
        <Model />
      </Canvas>
      {/* <GridOverlay /> */}
    </>
  );
}
