"use client";

import { useEffect, useLayoutEffect, useMemo } from "react";
import { useEnvironment, useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { Mesh, MeshStandardMaterial, PMREMGenerator } from "three";
import { CONFIG } from "@/config/constants";
import { useDebugSettings } from "@/context/DebugSettingsContext";

export function SkateboardDeck() {
  const { scene } = useGLTF(CONFIG.workstation.SKATEBOARD_MODEL_URL);
  const { lighting } = useDebugSettings();
  const anisotropy = useThree(state => Math.min(8, state.gl.capabilities.getMaxAnisotropy()));
  const gl = useThree(state => state.gl);
  const environment = useEnvironment({ files: CONFIG.workstation.SKATEBOARD_ENVIRONMENT_URL });
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
  useLayoutEffect(() => {
    const generator = new PMREMGenerator(gl);
    const target = generator.fromEquirectangular(environment);
    generator.dispose();
    model.traverse(object => {
      if (!(object instanceof Mesh)) return;
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (!(material instanceof MeshStandardMaterial)) continue;
        material.envMap = target.texture;
        material.needsUpdate = true;
      }
    });
    return () => {
      model.traverse(object => {
        if (!(object instanceof Mesh)) return;
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          if (material instanceof MeshStandardMaterial) material.envMap = null;
        }
      });
      target.dispose();
    };
  }, [model, gl, environment]);
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
