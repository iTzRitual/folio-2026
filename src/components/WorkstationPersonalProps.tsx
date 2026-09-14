"use client";

import { useDebugSettings } from "@/context/DebugSettingsContext";
import { Block } from "./WorkstationPrimitives";

const photos = [
  { x: -0.055, y: 0.115, tilt: 0.16, color: "#7b857e" },
  { x: 0.065, y: 0.205, tilt: -0.14, color: "#485767" },
  { x: 0.135, y: 0.065, tilt: -0.12, color: "#606d57" },
  { x: -0.08, y: -0.07, tilt: 0.12, color: "#566c75" },
  { x: 0.055, y: -0.125, tilt: -0.1, color: "#8a725d" },
  { x: 0.16, y: -0.215, tilt: 0.03, color: "#454b55" },
];

export function PersonalProps({ supportY }: { supportY: number }) {
  const { workstation: w } = useDebugSettings();
  const position = (p: { x: number; y: number; z: number }): [number, number, number] => [p.x, p.y + supportY, p.z];
  return <group name="PersonalBlockoutProps">
    <group name="TapedPolaroids" position={position(w.polaroidsPosition)} scale={0.8}>
      {photos.map((photo, i) => <group key={i} position={[photo.x, photo.y, i * 0.001]} rotation={[0, 0, photo.tilt]}>
        <Block size={[0.09, 0.12, 0.002]} color="#bdb6a3" />
        <Block size={[0.074, 0.078, 0.002]} position={[0, 0.01, 0.002]} color={photo.color} />
        <Block size={[0.074, 0.027, 0.002]} position={[0, -0.015, 0.004]} color="#303c3e" />
        <Block size={[0.025, 0.035, 0.002]} position={[0.003, 0.06, 0.003]} rotation={[0, 0, -0.12]} color="#a59171" />
      </group>)}
    </group>
    <group name="SillBooks" position={position(w.sillBooksPosition)}>
      {[0, 1, 2].map(i => <group key={i} position={[i * 0.006, i * 0.024, 0]} rotation={[0, (i - 1) * 0.045, 0]}>
        <Block size={[0.24, 0.022, 0.11]} position={[0, 0.011, 0]} color={["#403e35", "#5e6356", "#4c5053"][i]} />
        <Block size={[0.227, 0.014, 0.104]} position={[0.004, 0.011, 0.004]} color="#a8a18c" />
      </group>)}
    </group>
  </group>;
}
