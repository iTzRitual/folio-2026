"use client";

import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { MathUtils, Mesh, MeshStandardMaterial } from "three";
import { CONFIG } from "@/config/constants";
import { useDebugSettings } from "@/context/DebugSettingsContext";

export function EdifierSpeakers({ supportY }: { supportY: number }) {
  const { scene } = useGLTF(CONFIG.workstation.SPEAKER_MODEL_URL);
  const { workstation, lighting } = useDebugSettings();
  const models = useMemo(() => ["Edifier_Passive", "Edifier_Active"].map(name => {
    const source = scene.getObjectByName(name);
    if (!source) throw new Error(`Missing speaker model: ${name}`);
    const model = source.clone(true);
    model.traverse(object => {
      if (!(object instanceof Mesh)) return;
      object.raycast = () => null;
      object.material = Array.isArray(object.material) ? object.material.map(material => material.clone()) : object.material.clone();
    });
    return model;
  }), [scene]);
  useEffect(() => () => {
    for (const model of models) model.traverse(object => {
      if (object instanceof Mesh) (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => material.dispose());
    });
  }, [models]);
  useEffect(() => {
    for (const model of models) model.traverse(object => {
      if (!(object instanceof Mesh)) return;
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (material instanceof MeshStandardMaterial) material.envMapIntensity = CONFIG.workstation.SPEAKER_ENV_INTENSITY[lighting.mode];
      }
    });
  }, [models, lighting.mode]);
  return <>
    {[workstation.leftSpeakerPosition, workstation.rightSpeakerPosition].map((position, index) => <group
      key={index}
      name={index ? "RightSpeaker" : "LeftSpeaker"}
      position={[position.x, supportY + position.y, position.z]}
      rotation={[0, MathUtils.degToRad(CONFIG.workstation.SPEAKER_YAW) * (index ? -1 : 1), 0]}
    >
      <primitive object={models[index]} />
    </group>)}
  </>;
}
