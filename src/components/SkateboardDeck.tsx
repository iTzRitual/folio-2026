"use client";

import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { Mesh, MeshStandardMaterial } from "three";
import { CONFIG } from "@/config/constants";
import { useDebugSettings } from "@/context/DebugSettingsContext";

export function SkateboardDeck() {
  const { scene } = useGLTF(CONFIG.workstation.SKATEBOARD_MODEL_URL);
  const { lighting } = useDebugSettings();
  const anisotropy = useThree(state => Math.min(8, state.gl.capabilities.getMaxAnisotropy()));
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse(object => {
      object.raycast = () => null;
      if (!(object instanceof Mesh)) return;
      const materials = (Array.isArray(object.material) ? object.material : [object.material]).map(material => material.clone());
      object.material = Array.isArray(object.material) ? materials : materials[0];
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
        if (!(material instanceof MeshStandardMaterial)) continue;
        material.envMapIntensity = CONFIG.workstation.SKATEBOARD_ENV_INTENSITY[lighting.mode];
        if (material.map) {
          material.map.anisotropy = anisotropy;
          material.map.needsUpdate = true;
        }
      }
    });
  }, [model, lighting.mode, anisotropy]);
  return <primitive object={model} />;
}
