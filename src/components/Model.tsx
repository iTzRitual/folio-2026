import {
  Clone,
  useGLTF,
  MeshTransmissionMaterial,
  Center,
} from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { useControls } from "leva";
import { Title } from "./HeroScene/Title";
import { Subtitle } from "./HeroScene/Subtitle";
import { ProfessionLabel } from "./HeroScene/ProfessionLabel";

import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

interface ModelProps {
  startAnimation: boolean;
}

export default function Model({ startAnimation }: ModelProps) {
  const animGroupRef = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Group>(null);
  const { nodes } = useGLTF("/glbs/czaszka2.glb");
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

  useGSAP(() => {
    if (!animGroupRef.current) return;

    if (!startAnimation) {
      animGroupRef.current.scale.set(0, 0, 0);
      return;
    }

    gsap.to(animGroupRef.current.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 1.5,
      ease: "elastic.out(1, 0.5)",
      delay: 1,
    });
  }, [startAnimation]);

  useFrame((state, delta) => {
    if (mesh.current) {
      const t = state.clock.getElapsedTime();

      mesh.current.rotation.z += delta * 1.2;
      mesh.current.rotation.x = Math.sin(t * 2) * 0.2;
      mesh.current.rotation.y = Math.cos(t * 2) * 0.1;
    }
  });

  // const materialProps = useControls({
  //   thickness: { value: 0.1, min: 0, max: 3, step: 0.05 },
  //   roughness: { value: 0.6, min: 0, max: 1, step: 0.1 },
  //   transmission: { value: 1, min: 0, max: 1, step: 0.1 },
  //   ior: { value: 1.1, min: 0, max: 3, step: 0.1 },
  //   chromaticAberration: { value: 0.08, min: 0, max: 1, step: 0.01 },
  //   backside: { value: true },
  //   scale: { value: 1.3, min: 0, max: 3, step: 0.05 },
  // });

  const materialProps = useControls({
    thickness: { value: 3, min: 0, max: 5, step: 0.05 },
    roughness: { value: 0, min: 0, max: 1, step: 0.1 },
    transmission: { value: 0.9, min: 0, max: 1, step: 0.1 },
    ior: { value: 0.9, min: 0, max: 3, step: 0.1 },
    chromaticAberration: { value: 0.0, min: 0, max: 1, step: 0.01 },
    backside: { value: false },
    scale: { value: 0.8, min: 0, max: 3, step: 0.05 },
  });

  const skullRotation = useControls("Skull Rotation", {
    x: { value: -1.3, min: -Math.PI, max: Math.PI, step: 0.05 },
    y: { value: -3.13, min: -Math.PI, max: Math.PI, step: 0.05 },
    z: { value: 0.85, min: -Math.PI, max: Math.PI, step: 0.05 },
  });

  const viewportMinDimension = Math.min(viewport.width, viewport.height);
  const responsiveScale = (viewportMinDimension / 8) * materialProps.scale;

  return (
    <group>
      <group position={[0, 0.1, 2]} ref={animGroupRef}>
        <group rotation={[skullRotation.x, skullRotation.y, skullRotation.z]}>
          <Center>
            <Clone ref={mesh} object={nodes.Sphere} scale={responsiveScale}>
              <MeshTransmissionMaterial {...materialProps} />
            </Clone>
          </Center>
        </group>
      </group>

      <Title startTrigger={startAnimation}>Natan Mokrzycki</Title>
      <Subtitle startTrigger={startAnimation}>
        Bridging the gap between technical performance and high-end visual
        aesthetics.
      </Subtitle>
      <ProfessionLabel
        position={[leftX, row3TopY, 0]}
        align="left"
        verticalPos="below"
        direction="leftToRight"
        startTrigger={startAnimation}
      >
        Software Engineer
      </ProfessionLabel>

      <ProfessionLabel
        position={[rightX, row3BottomY, 0]}
        align="right"
        verticalPos="above"
        direction="rightToLeft"
        startTrigger={startAnimation}
      >
        Creative Technologist
      </ProfessionLabel>
    </group>
  );
}
