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

export default function Model() {
  const mesh = useRef<THREE.Group>(null);
  const { nodes } = useGLTF("/glbs/torrus.glb");
  const width = useThree((state) => state.viewport.width);

  useFrame((state, delta) => {
    if (mesh.current) {
      mesh.current.rotation.y += delta;
    }
  });

  const materialProps = useControls({
    thickness: { value: 0.2, min: 0, max: 3, step: 0.05 },
    roughness: { value: 0, min: 0, max: 1, step: 0.1 },
    transmission: { value: 1, min: 0, max: 1, step: 0.1 },
    ior: { value: 1.2, min: 0, max: 3, step: 0.1 },
    chromaticAberration: { value: 0.5, min: 0, max: 1, step: 0.01 },
    backside: { value: false },
  });

  return (
    <group scale={width / 10}>
      <Text key="text" position={[0, 0, -5]} scale={4}>
        Natan
      </Text>
      <Clone
        ref={mesh}
        object={nodes.Torus002}
        rotation={[Math.PI / 4, 0, Math.PI / 4]}
      >
        <MeshTransmissionMaterial {...materialProps} />
      </Clone>
    </group>
  );
}
