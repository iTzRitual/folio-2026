"use client";

import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { MathUtils, Mesh, MeshStandardMaterial } from "three";
import { CONFIG } from "@/config/constants";
import { useDebugSettings } from "@/context/DebugSettingsContext";

export function LogitechMouse({ supportY }: { supportY: number }) {
  const { scene } = useGLTF(CONFIG.workstation.MOUSE_MODEL_URL);
  const { workstation, lighting } = useDebugSettings();
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse(object => {
      object.raycast = () => null;
      if (!(object instanceof Mesh)) return;
      object.material = Array.isArray(object.material) ? object.material.map(material => material.clone()) : object.material.clone();
    });
    return clone;
  }, [scene]);
  useEffect(() => () => {
    model.traverse(object => {
      if (object instanceof Mesh) (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => material.dispose());
    });
  }, [model]);
  useEffect(() => {
    model.traverse(object => {
      if (!(object instanceof Mesh)) return;
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (material instanceof MeshStandardMaterial) material.envMapIntensity = CONFIG.workstation.MOUSE_ENV_INTENSITY[lighting.mode];
      }
    });
  }, [model, lighting.mode]);
  const position = workstation.mousePosition;
  return <group
    name="Mouse"
    position={[position.x, supportY + position.y, position.z]}
    rotation={[0, MathUtils.degToRad(CONFIG.workstation.MOUSE_YAW), 0]}
  >
    <primitive object={model} />
  </group>;
}
