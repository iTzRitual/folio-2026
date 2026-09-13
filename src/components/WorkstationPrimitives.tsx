"use client";

import type { ThreeElements } from "@react-three/fiber";

const wood = "#615344";
const charcoal = "#282d30";
const bone = "#b9b4a7";
const noRaycast = () => null;

export function Block({ size, color = wood, ...props }: ThreeElements["mesh"] & { size: [number, number, number]; color?: string }) {
  return <mesh {...props} raycast={noRaycast}>
    <boxGeometry args={size} />
    <meshStandardMaterial color={color} roughness={0.85} envMapIntensity={0.15} />
  </mesh>;
}

export function Ellipsoid({ size, color = bone, ...props }: ThreeElements["mesh"] & { size: [number, number, number]; color?: string }) {
  return <mesh {...props} scale={size} raycast={noRaycast}>
    <sphereGeometry args={[1, 16, 10]} />
    <meshStandardMaterial color={color} roughness={0.72} envMapIntensity={0.15} />
  </mesh>;
}

export function Cylinder({ radius, height, color = charcoal, ...props }: ThreeElements["mesh"] & { radius: number; height: number; color?: string }) {
  return <mesh {...props} raycast={noRaycast}>
    <cylinderGeometry args={[radius, radius, height, 16]} />
    <meshStandardMaterial color={color} roughness={0.7} envMapIntensity={0.15} />
  </mesh>;
}

