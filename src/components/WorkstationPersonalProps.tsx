"use client";

import { useEffect, useMemo } from "react";
import { DoubleSide, Shape, ShapeGeometry } from "three";
import { CONFIG } from "@/config/constants";
import { useDebugSettings } from "@/context/DebugSettingsContext";
import { Block, Cylinder } from "./WorkstationPrimitives";

const noRaycast = () => null;
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
  const leaf = useMemo(() => {
    const shape = new Shape();
    shape.moveTo(0, -0.18);
    shape.quadraticCurveTo(-0.1, -0.12, -0.125, -0.055);
    shape.lineTo(-0.035, -0.035);
    shape.lineTo(-0.14, -0.01);
    shape.quadraticCurveTo(-0.155, 0.025, -0.14, 0.05);
    shape.lineTo(-0.04, 0.04);
    shape.lineTo(-0.135, 0.09);
    shape.bezierCurveTo(-0.12, 0.18, -0.025, 0.18, 0, 0.1);
    shape.bezierCurveTo(0.025, 0.18, 0.12, 0.18, 0.135, 0.09);
    shape.lineTo(0.04, 0.04);
    shape.lineTo(0.14, 0.05);
    shape.quadraticCurveTo(0.155, 0.025, 0.14, -0.01);
    shape.lineTo(0.035, -0.035);
    shape.lineTo(0.125, -0.055);
    shape.quadraticCurveTo(0.1, -0.12, 0, -0.18);
    return new ShapeGeometry(shape, 5);
  }, []);
  useEffect(() => () => leaf.dispose(), [leaf]);
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
    <group name="MonsteraFloorPlant" position={position(w.floorPlantPosition)}>
      <mesh position={[0, 0.13, 0]} raycast={noRaycast}>
        <cylinderGeometry args={[0.145, 0.115, 0.26, 16]} />
        <meshStandardMaterial color="#918474" roughness={0.9} envMapIntensity={0.1} />
      </mesh>
      <Cylinder radius={0.13} height={0.012} position={[0, 0.256, 0]} color="#3c3930" />
      <Cylinder radius={0.018} height={1.2} position={[0, 0.85, -0.015]} color="#70634a" />
      {Array.from({ length: 10 }, (_, i) => {
        const side = i % 2 ? -1 : 1;
        return <group key={i} position={[0, 0.36 + i * 0.105, 0]} rotation={[0, side * 0.28, side * -CONFIG.workstation.FLOOR_PLANT_SPREAD]}>
          <Cylinder radius={0.004} height={0.21} position={[0, 0.105, 0]} color="#526049" />
          <mesh geometry={leaf} position={[0, 0.3, 0.015]} rotation={[0.15 + (i % 3) * 0.1, side * 0.25, 0]} scale={CONFIG.workstation.FLOOR_PLANT_LEAF_SCALE + (i % 3) * 0.05} raycast={noRaycast}>
            <meshStandardMaterial color={i % 3 ? "#435537" : "#68734a"} side={DoubleSide} roughness={0.8} envMapIntensity={0.1} />
          </mesh>
        </group>;
      })}
    </group>
  </group>;
}
