"use client";

import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { Box3, MathUtils, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { CONFIG } from "@/config/constants";
import { useDebugSettings } from "@/context/DebugSettingsContext";

export function WorkstationController({ supportY }: { supportY: number }) {
  const { scene } = useGLTF(CONFIG.workstation.CONTROLLER_MODEL_URL);
  const { workstation, lighting } = useDebugSettings();
  const model = useMemo(() => {
    const clone = scene.clone(true);
    const bounds = new Box3().setFromObject(clone);
    const center = bounds.getCenter(new Vector3());
    const scale = CONFIG.workstation.CONTROLLER_WIDTH / bounds.getSize(new Vector3()).x;
    clone.scale.setScalar(scale);
    clone.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    clone.traverse(object => {
      if (!(object instanceof Mesh)) return;
      object.raycast = () => null;
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
        if (material instanceof MeshStandardMaterial) material.envMapIntensity = CONFIG.workstation.CONTROLLER_ENV_INTENSITY[lighting.mode];
      }
    });
  }, [model, lighting.mode]);
  const position = workstation.controllerPosition;
  return <group
    name="Controller"
    position={[position.x, supportY + position.y, position.z]}
    rotation={[0, MathUtils.degToRad(CONFIG.workstation.CONTROLLER_YAW), 0]}
  >
    <primitive object={model} />
  </group>;
}
