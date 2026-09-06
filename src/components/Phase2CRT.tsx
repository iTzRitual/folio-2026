"use client";

import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import { Box3, Mesh, Vector3 } from "three";
import { CONFIG } from "@/config/constants";

export function Phase2CRT({ width }: { width: number }) {
  const { scene } = useGLTF(CONFIG.phase2.CRT_MODEL_URL);
  const { model, screenCenter, screenWidth, screenFront } = useMemo(() => {
    const model = scene.clone(true);
    const screen = model.getObjectByName("CRT_Screen")!;
    const bounds = new Box3().setFromObject(screen);

    model.traverse((object) => {
      if (object instanceof Mesh) {
        object.raycast = () => null;
      }
      if (object.name === "CRT_Screen" || object.name === "CRT_Glass") {
        object.visible = false;
      }
    });

    return {
      model,
      screenCenter: bounds.getCenter(new Vector3()),
      screenWidth: bounds.max.x - bounds.min.x,
      screenFront: bounds.max.z,
    };
  }, [scene]);
  const scale = width / screenWidth;

  return (
    <group
      name="Phase2CRT"
      scale={scale}
      position={[
        -screenCenter.x * scale,
        -screenCenter.y * scale,
        -(screenFront + CONFIG.phase2.CRT_SCREEN_CLEARANCE) * scale,
      ]}
      dispose={null}
    >
      <primitive object={model} />
    </group>
  );
}
