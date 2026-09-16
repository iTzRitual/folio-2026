"use client";

import { useMemo } from "react";
import { MathUtils, Mesh, MeshStandardMaterial, SRGBColorSpace, type Texture } from "three";
import { useThree } from "@react-three/fiber";
import { useGLTF, useTexture } from "@react-three/drei";
import { CONFIG } from "@/config/constants";
import { useDebugSettings } from "@/context/DebugSettingsContext";
import { PersonalProps } from "./WorkstationPersonalProps";
import { DeskCollectionProps } from "./WorkstationDeskProps";
import { Block, Cylinder, Ellipsoid } from "./WorkstationPrimitives";
export { Block } from "./WorkstationPrimitives";

type Point = { x: number; y: number; z: number };
const charcoal = "#282d30";
const bone = "#b9b4a7";
const noRaycast = () => null;
const configureArtworkTextures = (textures: Texture[]) => {
  for (const texture of textures) texture.colorSpace = SRGBColorSpace;
};

const xyz = (p: Point, y: number): [number, number, number] => [p.x, p.y + y, p.z];

function FramedArtwork({ name, position, size, rotation, texture }: {
  name: string;
  position: [number, number, number];
  size: { x: number; y: number };
  rotation: number;
  texture: Texture;
}) {
  const border = 0.014;
  return <group name={name} position={position} rotation={[0, 0, MathUtils.degToRad(rotation)]}>
    <Block size={[size.x, size.y, 0.014]} color="#252928" />
    <Block size={[size.x - border, size.y - border, 0.003]} position={[0, 0, 0.009]} color={bone} />
    <mesh position={[0, 0, 0.012]} raycast={noRaycast}>
      <planeGeometry args={[size.x - border * 2, size.y - border * 2]} />
      <meshStandardMaterial map={texture} roughness={0.88} envMapIntensity={0.08} />
    </mesh>
  </group>;
}

export function DesktopProxies({ supportY }: { supportY: number }) {
  const { workstation: w, lighting } = useDebugSettings();
  return <group name="DesktopAccessories">
    <DeskCollectionProps supportY={supportY} />
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
    <group name="DeskLamp" position={xyz(w.lampPosition, supportY)} scale={CONFIG.workstation.LAMP_SCALE}>
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
  const { scene } = useGLTF(CONFIG.workstation.CABINET_MODEL_URL);
  const anisotropy = useThree(state => Math.min(8, state.gl.capabilities.getMaxAnisotropy()));
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse(object => {
      object.raycast = noRaycast;
      if (!(object instanceof Mesh)) return;
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (!(material instanceof MeshStandardMaterial) || !material.map) continue;
        material.map.anisotropy = anisotropy;
        material.map.needsUpdate = true;
      }
    });
    return clone;
  }, [scene, anisotropy]);
  return <group name="MusicCabinet" position={xyz(w.cabinetPosition, supportY)}>
    <primitive object={model} />
    {children}
  </group>;
}

export function WallProxies({ supportY }: { supportY: number }) {
  const { workstation: w, lighting } = useDebugSettings();
  const [portraitArtwork, ronaldoArtwork] = useTexture([
    CONFIG.workstation.ARTWORK_PORTRAIT_URL,
    CONFIG.workstation.ARTWORK_RONALDO_URL,
  ], configureArtworkTextures);
  const win = w.windowPosition;
  const s = CONFIG.workstation.WINDOW_SIZE;
  const wallZ = win.z - 0.07;
  const halfWall = CONFIG.workstation.WALL_SIZE.x / 2;
  const cornerX = CONFIG.workstation.RIGHT_WALL_X;
  const wallDepth = CONFIG.workstation.RIGHT_WALL_DEPTH;
  const wallThickness = CONFIG.workstation.WALL_SIZE.z;
  const left = win.x - s.x / 2;
  const right = win.x + s.x / 2;
  const wall = "#777c76";
  return <group name="RoomBlockout">
    <group name="RearWallOpening" position={[0, supportY, 0]}>
      <Block size={[left + halfWall, 4, 0.12]} position={[(left - halfWall) / 2, 0.5, wallZ]} color={wall} />
      <Block size={[cornerX - right, 4, wallThickness]} position={[(cornerX + right) / 2, 0.5, wallZ]} color={wall} />
      <Block name="RightSideWall" size={[wallThickness, CONFIG.workstation.WALL_SIZE.y, wallDepth]} position={[cornerX + wallThickness / 2, 0.5, wallZ + (wallDepth - wallThickness) / 2]} color={CONFIG.workstation.RIGHT_WALL_COLOR} />
      <Block size={[s.x, win.y - s.y / 2 + 1.5, 0.12]} position={[win.x, (win.y - s.y / 2 - 1.5) / 2, wallZ]} color={wall} />
      <Block size={[s.x, 2.5 - win.y - s.y / 2, 0.12]} position={[win.x, (2.5 + win.y + s.y / 2) / 2, wallZ]} color={wall} />
    </group>
    <group name="Window" position={xyz(win, supportY)}>
      <mesh position={[0, 0, -0.13]} raycast={noRaycast}>
        <planeGeometry args={[s.x + 0.05, s.y + 0.05]} />
        <meshBasicMaterial color={lighting.mode === "day" ? "#93b7bc" : "#3b526e"} />
      </mesh>
      {[-1, 1].map(side => <group key={side}>
        <Block size={[0.032, s.y + 0.06, 0.1]} position={[side * s.x / 2, 0, 0]} color={bone} />
        <Block size={[s.x, 0.032, 0.1]} position={[0, side * s.y / 2, 0]} color={bone} />
      </group>)}
      <Block size={[0.023, s.y, 0.065]} color={bone} />
      <Block size={[s.x, 0.018, 0.065]} position={[0, 0.03, 0]} color={bone} />
      <Block size={[s.x + 0.1, 0.028, 0.19]} position={[0, -s.y / 2, 0.035]} color={bone} />
      <Block size={[s.x, 0.13, 0.02]} position={[0, -0.3, -0.1]} color={lighting.mode === "day" ? "#758d83" : "#273d46"} />
    </group>
    <PersonalProps supportY={supportY} />
    <FramedArtwork
      name="PortraitArtwork"
      position={xyz(w.portraitArtworkPosition, supportY)}
      size={CONFIG.workstation.ARTWORK_PORTRAIT_SIZE}
      rotation={CONFIG.workstation.ARTWORK_ROTATION.portrait}
      texture={portraitArtwork}
    />
    <FramedArtwork
      name="RonaldoArtwork"
      position={xyz(w.ronaldoArtworkPosition, supportY)}
      size={CONFIG.workstation.ARTWORK_RONALDO_SIZE}
      rotation={CONFIG.workstation.ARTWORK_ROTATION.ronaldo}
      texture={ronaldoArtwork}
    />
    <group name="WallSkateboard" position={xyz(w.skateboardPosition, supportY)} rotation={[0, 0, MathUtils.degToRad(CONFIG.workstation.PROXY_YAW.skateboard)]}>
      <Block size={[CONFIG.workstation.SKATEBOARD_SIZE.width, CONFIG.workstation.SKATEBOARD_SIZE.length - CONFIG.workstation.SKATEBOARD_SIZE.width, CONFIG.workstation.SKATEBOARD_SIZE.thickness]} color="#514d40" />
      {[-1, 1].map(side => <group key={side}>
        <Ellipsoid size={[CONFIG.workstation.SKATEBOARD_SIZE.width / 2, CONFIG.workstation.SKATEBOARD_SIZE.width / 2, CONFIG.workstation.SKATEBOARD_SIZE.thickness / 2]} position={[0, side * (CONFIG.workstation.SKATEBOARD_SIZE.length - CONFIG.workstation.SKATEBOARD_SIZE.width) / 2, 0]} color="#514d40" />
        <Block size={[0.14, 0.025, 0.035]} position={[0, side * 0.245, 0.04]} color="#a5aaa5" />
        {[-1, 1].map(x => <Cylinder key={x} radius={0.028} height={0.024} position={[x * 0.082, side * 0.245, 0.06]} rotation={[0, 0, Math.PI / 2]} color={bone} />)}
      </group>)}
      <Block size={[0.165, 0.27, 0.003]} position={[0, 0, 0.012]} color="#838779" />
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
