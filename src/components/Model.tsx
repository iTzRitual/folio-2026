import {
  Clone,
  useGLTF,
  Text,
  MeshTransmissionMaterial,
} from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { useControls } from "leva";
import { Title } from "./HeroScene/Title";
import { Subtitle } from "./HeroScene/Subtitle";
import { ProfessionLabel } from "./HeroScene/ProfessionLabel";

export default function Model() {
  const mesh = useRef<THREE.Group>(null);
  const { nodes } = useGLTF("/glbs/torrus.glb");
  const width = useThree((state) => state.viewport.width);
  const { size, viewport } = useThree();

  const pxTo3DWidth = viewport.width / size.width;
  const pxTo3DHeight = viewport.height / size.height;
  const marginX = 60 * pxTo3DWidth;
  const marginY = 210 * pxTo3DHeight;

  const margin = 0.5;
  const positionY = -width / 2 + margin;

  const middleSpaceHeight = viewport.height - 2 * marginY;
  const frHeight = middleSpaceHeight / 3;

  const row3TopY = viewport.height / 2 - marginY - frHeight;
  const row3BottomY = -viewport.height / 2 + marginY + frHeight;

  const leftX = -viewport.width / 2 + marginX;
  const rightX = viewport.width / 2 - marginX;
  const lineY = -viewport.height / 2 + marginY;

  useFrame((state, delta) => {
    if (mesh.current) {
      mesh.current.rotation.y += delta;
    }
  });

  const materialProps = useControls({
    thickness: { value: 3, min: 0, max: 3, step: 0.05 },
    roughness: { value: 0.2, min: 0, max: 1, step: 0.1 },
    transmission: { value: 1, min: 0, max: 1, step: 0.1 },
    ior: { value: 0.8, min: 0, max: 3, step: 0.1 },
    chromaticAberration: { value: 0.45, min: 0, max: 1, step: 0.01 },
    backside: { value: true },
    scale: { value: 0.9, min: 0, max: 3, step: 0.1 },
  });

  const viewportMinDimension = Math.min(viewport.width, viewport.height);
  const responsiveScale = (viewportMinDimension / 8) * materialProps.scale;

  return (
    <group>
      <Clone
        ref={mesh}
        object={nodes.Torus002}
        rotation={[Math.PI / 4, 0, Math.PI / 4]}
        position={[0, 0, 2]}
        scale={responsiveScale}
      >
        <MeshTransmissionMaterial {...materialProps} />
      </Clone>
      <Title>Natan Mokrzycki</Title>
      <Subtitle>
        Bridging the gap between technical performance and high-end visual
        aesthetics.
      </Subtitle>
      <ProfessionLabel
        position={[leftX, row3TopY, 0]}
        align="left"
        verticalPos="below"
      >
        Software Engineer
      </ProfessionLabel>

      <ProfessionLabel
        position={[rightX, row3BottomY, 0]}
        align="right"
        verticalPos="above"
      >
        Creative Technologist
      </ProfessionLabel>
    </group>
  );
}
