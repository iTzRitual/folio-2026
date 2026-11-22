"use client";

import { useMemo } from "react";
import { MathUtils, Mesh, MeshStandardMaterial, type Texture } from "three";
import { useLoader, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { WorkstationTextureLoader } from "./Workstation/WorkstationTextureLoader";
import { CONFIG } from "@/config/constants";
import { useDebugSettings } from "@/context/DebugSettingsContext";
import { PersonalProps } from "./WorkstationPersonalProps";
import { LevitatingLamp } from "./LevitatingLamp";
import { WorkstationAsset } from "./WorkstationAsset";
import { DeskCollectionProps } from "./WorkstationDeskProps";
import { WorkstationController } from "./WorkstationController";
import { Block, Ellipsoid } from "./WorkstationPrimitives";
export { Block } from "./WorkstationPrimitives";

type Point = { x: number; y: number; z: number };
const bone = "#b9b4a7";
const noRaycast = () => null;

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

export function DesktopProxies({ supportY, worldScale }: { supportY: number; worldScale: number }) {
  const { workstation: w } = useDebugSettings();
  return <group name="DesktopAccessories">
    <DeskCollectionProps supportY={supportY} />
    <group name="StudioHeadphones" position={xyz(CONFIG.workstation.HEADPHONES_POSITION, supportY)}
      rotation={[0, MathUtils.degToRad(CONFIG.workstation.HEADPHONES_YAW), 0]}>
      <WorkstationAsset url={CONFIG.workstation.HEADPHONES_MODEL_URL} intensity={CONFIG.workstation.MOUSE_ENV_INTENSITY} />
    </group>
    <group name="MousePad" position={[
      CONFIG.workstation.MOUSE_PAD_CENTER.x,
      supportY,
      CONFIG.workstation.MOUSE_PAD_CENTER.z,
    ]}>
      <WorkstationAsset url={CONFIG.workstation.MOUSE_PAD_MODEL_URL} intensity={CONFIG.workstation.MOUSE_ENV_INTENSITY} />
    </group>
    <group name="Mouse" position={xyz(w.mousePosition, supportY + CONFIG.workstation.MOUSE_PAD_THICKNESS)} rotation={[0, MathUtils.degToRad(CONFIG.workstation.PROXY_YAW.mouse), 0]}>
      <WorkstationAsset url={CONFIG.workstation.MOUSE_MODEL_URL} intensity={CONFIG.workstation.MOUSE_ENV_INTENSITY} />
    </group>
    <WorkstationController supportY={supportY} />
    <LevitatingLamp supportY={supportY} worldScale={worldScale} />
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
  const [portraitArtwork, ronaldoArtwork] = useLoader(WorkstationTextureLoader, [
    CONFIG.workstation.ARTWORK_PORTRAIT_URL,
    CONFIG.workstation.ARTWORK_RONALDO_URL,
  ]);
  const view = CONFIG.workstation.WINDOW_VIEW;
  const city = useLoader(WorkstationTextureLoader, view.url);
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
      <WorkstationAsset url={CONFIG.workstation.WINDOW_MODEL_URL} intensity={CONFIG.workstation.WINDOW_ENV_INTENSITY} />
      <mesh name="ShinjukuSkyline" position={[view.offset.x, view.offset.y, view.offset.z]} raycast={noRaycast}>
        <planeGeometry args={[view.width, view.height]} />
        <meshBasicMaterial map={city} color={view.tint[lighting.mode]} toneMapped={false} fog={false} />
      </mesh>
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
      <WorkstationAsset url={CONFIG.workstation.SKATEBOARD_MODEL_URL} intensity={CONFIG.workstation.SKATEBOARD_ENV_INTENSITY} />
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
