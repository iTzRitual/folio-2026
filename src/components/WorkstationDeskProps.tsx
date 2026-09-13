"use client";

import { MathUtils } from "three";
import { Text } from "@react-three/drei";
import { CONFIG } from "@/config/constants";
import { useDebugSettings } from "@/context/DebugSettingsContext";
import { Block, Cylinder } from "./WorkstationPrimitives";

const noRaycast = () => null;

export function DeskCollectionProps({ supportY }: { supportY: number }) {
  const { workstation: w } = useDebugSettings();
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
            <Text position={[-0.14, 0.12, 0.007]} fontSize={0.035} anchorX="left" anchorY="top" color="#c4bba5" raycast={noRaycast}>{"MASSIVE\nATTACK"}</Text>
            <Block size={[0.16, 0.16, 0.003]} position={[0.025, -0.045, 0.007]} rotation={[0, 0, 0.45]} color="#596765" />
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
    <group name="MonsterEnergyCan" position={position(w.energyCanPosition)} rotation={[0, -0.12, 0]}>
      <Cylinder radius={0.033} height={0.164} position={[0, 0.084, 0]} color="#202722" />
      {[0.003, 0.167].map(y => <Cylinder key={y} radius={0.032} height={0.006} position={[0, y, 0]} color="#a0aaa4" />)}
      <Block size={[0.01, 0.002, 0.018]} position={[0, 0.172, -0.004]} color="#4d5751" />
      {[-1, 0, 1].map(i => <group key={i} position={[i * 0.01, 0.107, 0.032]}>
        <Block size={[0.004, 0.042, 0.002]} rotation={[0, 0, -0.14]} color="#85b944" />
        <Block size={[0.004, 0.026, 0.002]} position={[-0.002, -0.03, 0]} rotation={[0, 0, 0.2]} color="#85b944" />
      </group>)}
      <Text position={[0, 0.054, 0.034]} fontSize={0.009} anchorX="center" color="#d3d7c8" raycast={noRaycast}>MONSTER</Text>
      <Text position={[0, 0.041, 0.034]} fontSize={0.006} anchorX="center" color="#85b944" raycast={noRaycast}>ENERGY</Text>
    </group>
  </group>;
}
