"use client";

import { useMemo } from "react";
import { MathUtils, Mesh, SRGBColorSpace } from "three";
import { useGLTF, useTexture } from "@react-three/drei";
import { CONFIG } from "@/config/constants";
import { useDebugSettings } from "@/context/DebugSettingsContext";
import { Block } from "./WorkstationPrimitives";
import { EdifierSpeakers } from "./EdifierSpeakers";

const noRaycast = () => null;

export function DeskCollectionProps({ supportY }: { supportY: number }) {
  const { workstation: w } = useDebugSettings();
  const { scene: can } = useGLTF(CONFIG.workstation.ENERGY_CAN_MODEL_URL);
  const canModel = useMemo(() => {
    const model = can.clone(true);
    model.traverse(object => {
      if (object instanceof Mesh) object.raycast = noRaycast;
    });
    return model;
  }, [can]);
  const artwork = useTexture(CONFIG.workstation.RECORD_COVER_URL, texture => { texture.colorSpace = SRGBColorSpace; });
  const position = (p: { x: number; y: number; z: number }): [number, number, number] => [p.x, supportY + p.y, p.z];
  const recordSize = CONFIG.workstation.RECORD_SIZE;
  const thickness = CONFIG.workstation.RECORD_THICKNESS;
  const lean = MathUtils.degToRad(CONFIG.workstation.FEATURED_RECORD_LEAN);
  return <group name="DeskCollectionProps">
    <group name="FeaturedRecord" position={position(w.featuredRecordPosition)}>
      <group rotation={[0, MathUtils.degToRad(CONFIG.workstation.FEATURED_RECORD_YAW), 0]}>
        <group position={[0, thickness / 2 * Math.sin(lean), 0]} rotation={[-lean, 0, 0]}>
          <group position={[0, recordSize / 2, 0]}>
            <Block size={[recordSize, recordSize, thickness]} color="#232b2b" />
            <mesh position={[0, 0, thickness / 2 + 0.0001]} raycast={noRaycast}>
              <planeGeometry args={[recordSize, recordSize]} />
              <meshStandardMaterial map={artwork} roughness={0.66} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
    <EdifierSpeakers supportY={supportY} />
    <group name="MonsterEnergyCan" position={position(w.energyCanPosition)} rotation={[0, CONFIG.workstation.ENERGY_CAN_YAW, 0]}>
      <primitive object={canModel} />
    </group>
  </group>;
}
