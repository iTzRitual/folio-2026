"use client";

import { MathUtils } from "three";
import { Text } from "@react-three/drei";
import { CONFIG } from "@/config/constants";
import { useDebugSettings } from "@/context/DebugSettingsContext";
import type { ThreeElements } from "@react-three/fiber";

type Point = { x: number; y: number; z: number };
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

function Ellipsoid({ size, color = bone, ...props }: ThreeElements["mesh"] & { size: [number, number, number]; color?: string }) {
  return <mesh {...props} scale={size} raycast={noRaycast}>
    <sphereGeometry args={[1, 16, 10]} />
    <meshStandardMaterial color={color} roughness={0.72} envMapIntensity={0.15} />
  </mesh>;
}

function Cylinder({ radius, height, color = charcoal, ...props }: ThreeElements["mesh"] & { radius: number; height: number; color?: string }) {
  return <mesh {...props} raycast={noRaycast}>
    <cylinderGeometry args={[radius, radius, height, 16]} />
    <meshStandardMaterial color={color} roughness={0.7} envMapIntensity={0.15} />
  </mesh>;
}

const xyz = (p: Point, y: number): [number, number, number] => [p.x, p.y + y, p.z];

export function DesktopProxies({ supportY }: { supportY: number }) {
  const { workstation: w, lighting } = useDebugSettings();
  return <group name="DesktopAccessories">
    <group name="Mouse" position={xyz(w.mousePosition, supportY)} rotation={[0, MathUtils.degToRad(CONFIG.workstation.PROXY_YAW.mouse), 0]}>
      <Ellipsoid size={[0.032, 0.019, 0.054]} position={[0, 0.019, 0]} />
      <Cylinder radius={0.007} height={0.006} rotation={[0, 0, Math.PI / 2]} position={[0, 0.036, -0.017]} />
      <Block size={[0.001, 0.001, 0.025]} position={[0, 0.037, -0.019]} color={charcoal} />
    </group>
    <group name="Controller" position={xyz(w.controllerPosition, supportY)} rotation={[0, MathUtils.degToRad(CONFIG.workstation.PROXY_YAW.controller), 0]}>
      <Ellipsoid size={[0.062, 0.02, 0.028]} position={[0, 0.025, -0.008]} color={charcoal} />
      {[-1, 1].map(side => <group key={side}>
        <Ellipsoid size={[0.027, 0.024, 0.05]} position={[side * 0.05, 0.024, 0.015]} rotation={[0, side * -0.3, 0]} color={charcoal} />
        <Cylinder radius={0.011} height={0.008} position={[side * 0.025, 0.047, 0.009]} color="#797c73" />
      </group>)}
      <Block size={[0.023, 0.004, 0.007]} position={[-0.046, 0.045, -0.018]} color={bone} />
      <Block size={[0.007, 0.004, 0.023]} position={[-0.046, 0.046, -0.018]} color={bone} />
      {[[0.04, -0.025], [0.054, -0.013], [0.028, -0.013], [0.04, 0]].map(([x, z], i) => <Cylinder key={i} radius={0.004} height={0.004} position={[x, 0.045, z]} color={bone} />)}
    </group>
    <group name="DeskLamp" position={xyz(w.lampPosition, supportY)}>
      <Cylinder radius={0.073} height={0.018} position={[0, 0.009, 0]} />
      <Cylinder radius={0.009} height={0.25} position={[0.025, 0.13, 0]} rotation={[0, 0, -0.2]} />
      <Cylinder radius={0.009} height={0.23} position={[0.012, 0.358, 0]} rotation={[0, 0, 0.34]} />
      <group position={[-0.03, 0.49, 0.015]} rotation={[0.2, 0, -0.25]}>
        <mesh raycast={noRaycast}>
          <coneGeometry args={[0.075, 0.09, 24, 1, true]} />
          <meshStandardMaterial color="#6b7765" side={2} roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.035, 0]} rotation={[Math.PI / 2, 0, 0]} raycast={noRaycast}>
          <circleGeometry args={[0.061, 20]} />
          <meshBasicMaterial color={lighting.mode === "night" ? "#ffd28d" : "#b8ac90"} side={2} />
        </mesh>
      </group>
    </group>
  </group>;
}

export function MusicCabinet({ supportY, children }: { supportY: number; children: React.ReactNode }) {
  const { workstation: w } = useDebugSettings();
  const s = CONFIG.workstation.CABINET_SIZE;
  return <group name="MusicCabinet" position={xyz(w.cabinetPosition, supportY)}>
    <Block name="CabinetTop" size={[s.x, 0.025, s.z]} position={[0, -0.0125, 0]} />
    <Block size={[s.x, 0.025, s.z]} position={[0, -s.y + 0.06, 0]} />
    <Block size={[0.018, s.y - 0.075, s.z]} position={[0, -s.y / 2, 0]} />
    {[-1, 1].map(side => <Block key={side} size={[0.023, s.y, s.z]} position={[side * (s.x / 2 - 0.012), -s.y / 2, 0]} />)}
    <Block size={[s.x, s.y, 0.016]} position={[0, -s.y / 2, -s.z / 2 + 0.008]} color="#413a33" />
    {[-1, 1].map(side => <group name={`RecordCompartment${side}`} key={side} position={[side * 0.127, -s.y + 0.076, 0.035]}>
      {Array.from({ length: 7 }, (_, i) => <Block key={i} name="VinylSleeve" size={[0.008, 0.315, 0.315]} position={[-0.084 + i * 0.024, 0.158, 0.005 * (i % 3)]} rotation={[0, 0, i > 4 ? -0.055 : 0.012 * (i % 3)]} color={["#9b8b71", "#41494c", "#74786a", "#afa28d"][i % 4]} />)}
    </group>)}
    {children}
  </group>;
}

export function WallProxies({ supportY }: { supportY: number }) {
  const { workstation: w, lighting } = useDebugSettings();
  const win = w.windowPosition;
  const s = CONFIG.workstation.WINDOW_SIZE;
  const wallZ = win.z - 0.07;
  const halfWall = CONFIG.workstation.WALL_SIZE.x / 2;
  const left = win.x - s.x / 2;
  const right = win.x + s.x / 2;
  const wall = "#777c76";
  return <group name="RoomBlockout">
    <group name="RearWallOpening" position={[0, supportY, 0]}>
      <Block size={[left + halfWall, 4, 0.12]} position={[(left - halfWall) / 2, 0.5, wallZ]} color={wall} />
      <Block size={[halfWall - right, 4, 0.12]} position={[(halfWall + right) / 2, 0.5, wallZ]} color={wall} />
      <Block size={[s.x, win.y - s.y / 2 + 1.5, 0.12]} position={[win.x, (win.y - s.y / 2 - 1.5) / 2, wallZ]} color={wall} />
      <Block size={[s.x, 2.5 - win.y - s.y / 2, 0.12]} position={[win.x, (2.5 + win.y + s.y / 2) / 2, wallZ]} color={wall} />
    </group>
    <group name="Window" position={xyz(win, supportY)}>
      <mesh position={[0, 0, -0.13]} raycast={noRaycast}>
        <planeGeometry args={[s.x + 0.05, s.y + 0.05]} />
        <meshBasicMaterial color={lighting.mode === "day" ? "#93b7bc" : "#172c43"} />
      </mesh>
      {[-1, 1].map(side => <group key={side}>
        <Block size={[0.032, s.y + 0.06, 0.1]} position={[side * s.x / 2, 0, 0]} color={bone} />
        <Block size={[s.x, 0.032, 0.1]} position={[0, side * s.y / 2, 0]} color={bone} />
      </group>)}
      <Block size={[0.023, s.y, 0.065]} color={bone} />
      <Block size={[s.x, 0.018, 0.065]} position={[0, 0.03, 0]} color={bone} />
      <Block size={[s.x + 0.1, 0.028, 0.19]} position={[0, -s.y / 2, 0.035]} color={bone} />
      <Block size={[s.x, 0.13, 0.02]} position={[0, -0.3, -0.1]} color={lighting.mode === "day" ? "#758d83" : "#14232d"} />
    </group>
    <group name="BandPoster" position={xyz(w.posterPosition, supportY)} rotation={[0, 0, MathUtils.degToRad(CONFIG.workstation.PROXY_YAW.poster)]}>
      <Block size={[0.31, 0.4, 0.015]} color={charcoal} />
      <Block size={[0.28, 0.37, 0.003]} position={[0, 0, 0.009]} color="#b2ac8d" />
      <Text position={[0, 0.13, 0.014]} fontSize={0.034} color="#252e2b" anchorX="center" raycast={noRaycast}>THE PRODIGY</Text>
      <Block size={[0.16, 0.16, 0.003]} position={[0, -0.014, 0.014]} rotation={[0, 0, Math.PI / 4]} color="#424f43" />
      <Text position={[0, -0.14, 0.014]} fontSize={0.014} color="#252e2b" anchorX="center" raycast={noRaycast}>MUSIC FOR THE JILTED GENERATION</Text>
    </group>
    <group name="WallSkateboard" position={xyz(w.skateboardPosition, supportY)} rotation={[0, 0, MathUtils.degToRad(CONFIG.workstation.PROXY_YAW.skateboard)]}>
      <Block size={[0.18, 0.5, 0.022]} color="#8c7061" />
      {[-1, 1].map(side => <group key={side}>
        <Ellipsoid size={[0.09, 0.11, 0.012]} position={[0, side * 0.25, 0]} color="#8c7061" />
        <Block size={[0.13, 0.025, 0.035]} position={[0, side * 0.19, 0.04]} color="#a5aaa5" />
        {[-1, 1].map(x => <Cylinder key={x} radius={0.028} height={0.024} position={[x * 0.075, side * 0.19, 0.06]} rotation={[0, 0, Math.PI / 2]} color={bone} />)}
      </group>)}
      <Block size={[0.09, 0.17, 0.003]} position={[0, 0, 0.014]} rotation={[0, 0, -0.25]} color="#323d38" />
    </group>
    <group name="WindowsillPlant" position={xyz(w.plantPosition, supportY)}>
      <mesh position={[0, 0.047, 0]} raycast={noRaycast}>
        <cylinderGeometry args={[0.056, 0.042, 0.094, 16]} />
        <meshStandardMaterial color="#9c7864" roughness={0.9} envMapIntensity={0.15} />
      </mesh>
      {Array.from({ length: 7 }, (_, i) => <group key={i} rotation={[0, i * 2.4, 0]}>
        <Ellipsoid size={[0.019, 0.095, 0.009]} position={[0.035, 0.16 + (i % 2) * 0.025, 0]} rotation={[0, 0, -0.5]} color={i % 2 ? "#52634b" : "#728064"} />
      </group>)}
    </group>
  </group>;
}
