"use client";

import { useEffect, useLayoutEffect, useMemo } from "react";
import { useEnvironment, useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { Mesh, MeshStandardMaterial, PMREMGenerator, type Material, type WebGLRenderer, type WebGLRenderTarget, type Texture } from "three";
import { CONFIG } from "@/config/constants";
import { useDebugSettings } from "@/context/DebugSettingsContext";

const environments = new WeakMap<WebGLRenderer, Map<Texture, { target: WebGLRenderTarget; users: number }>>();

function acquireEnvironment(gl: WebGLRenderer, texture: Texture) {
  const maps = environments.get(gl) ?? new Map<Texture, { target: WebGLRenderTarget; users: number }>();
  environments.set(gl, maps);
  let entry = maps.get(texture);
  if (!entry) {
    const generator = new PMREMGenerator(gl);
    entry = { target: generator.fromEquirectangular(texture), users: 0 };
    generator.dispose();
    maps.set(texture, entry);
  }
  const shared = entry;
  shared.users++;
  return {
    texture: shared.target.texture,
    release() {
      if (--shared.users === 0) {
        maps.delete(texture);
        shared.target.dispose();
      }
    },
  };
}

function applyEnvironment(materials: Material[], texture: Texture, anisotropy: number) {
  for (const material of materials) {
    if (!(material instanceof MeshStandardMaterial)) continue;
    material.setValues({ envMap: texture });
    if (material.map && material.map.anisotropy !== anisotropy) {
      material.map.anisotropy = anisotropy;
      material.map.needsUpdate = true;
    }
    material.needsUpdate = true;
  }
}

export function WorkstationAsset({ url, intensity }: { url: string; intensity: Record<"day" | "night", number> }) {
  const { scene } = useGLTF(url);
  const { lighting } = useDebugSettings();
  const gl = useThree(state => state.gl);
  const environment = useEnvironment({ files: CONFIG.workstation.ENVIRONMENT_URL });
  const anisotropy = useThree(state => Math.min(8, state.gl.capabilities.getMaxAnisotropy()));
  const { model, materials } = useMemo(() => {
    const model = scene.clone(true);
    const materials: Material[] = [];
    const copy = (material: Material) => {
      const clone = material.clone();
      materials.push(clone);
      return clone;
    };
    model.traverse(object => {
      object.raycast = () => null;
      if (!(object instanceof Mesh)) return;
      object.material = Array.isArray(object.material) ? object.material.map(copy) : copy(object.material);
    });
    return { model, materials };
  }, [scene]);
  useLayoutEffect(() => {
    const map = acquireEnvironment(gl, environment);
    applyEnvironment(materials, map.texture, anisotropy);
    return map.release;
  }, [materials, gl, environment, anisotropy]);
  useLayoutEffect(() => {
    for (const material of materials) {
      if (material instanceof MeshStandardMaterial) material.setValues({ envMapIntensity: intensity[lighting.mode] });
    }
  }, [materials, intensity, lighting.mode]);
  useEffect(() => () => materials.forEach(material => material.dispose()), [materials]);
  return <primitive object={model} />;
}
