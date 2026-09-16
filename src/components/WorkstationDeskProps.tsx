"use client";

import { useMemo } from "react";
import { MathUtils, Mesh, SRGBColorSpace } from "three";
import { useGLTF, useTexture } from "@react-three/drei";
import { CONFIG } from "@/config/constants";
import { useDebugSettings } from "@/context/DebugSettingsContext";
import { Block, Cylinder } from "./WorkstationPrimitives";

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
  const speaker = CONFIG.workstation.SPEAKER_SIZE;
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
    {[w.leftSpeakerPosition, w.rightSpeakerPosition].map((p, i) => <group name={i ? "RightSpeaker" : "LeftSpeaker"} key={i} position={position(p)} rotation={[0, MathUtils.degToRad(CONFIG.workstation.SPEAKER_YAW) * (i ? -1 : 1), 0]}>
      <Block size={[speaker.x, speaker.y, speaker.z]} position={[0, speaker.y / 2, 0]} color="#63513e" />
      <Block size={[speaker.x - 0.018, speaker.y - 0.012, 0.008]} position={[0, speaker.y / 2, speaker.z / 2 + 0.002]} color="#292d2b" />
      <Cylinder radius={0.046} height={0.007} position={[0, 0.079, speaker.z / 2 + 0.01]} rotation={[Math.PI / 2, 0, 0]} color="#626761" />
      <Cylinder radius={0.032} height={0.01} position={[0, 0.079, speaker.z / 2 + 0.015]} rotation={[Math.PI / 2, 0, 0]} color="#363c38" />
      <Cylinder radius={0.016} height={0.008} position={[0, 0.177, speaker.z / 2 + 0.01]} rotation={[Math.PI / 2, 0, 0]} color="#767b70" />
      <Cylinder radius={0.009} height={0.011} position={[0, 0.177, speaker.z / 2 + 0.015]} rotation={[Math.PI / 2, 0, 0]} color="#242a27" />
    </group>)}
    <group name="MonsterEnergyCan" position={position(w.energyCanPosition)} rotation={[0, CONFIG.workstation.ENERGY_CAN_YAW, 0]}>
      <primitive object={canModel} />
    </group>
  </group>;
}
