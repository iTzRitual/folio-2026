"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Box3, MathUtils, Mesh, Vector3 } from "three";
import { CONFIG } from "@/config/constants";
import { useDebugSettings } from "@/context/DebugSettingsContext";
import { useHeroTransition } from "@/context/HeroTransitionContext";
import { getCRTReferenceFrame } from "@/lib/crtScreen";
import { createWorkstationShadow } from "@/lib/workstationShadow";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

export function Phase2Workstation({ width }: { width: number }) {
  const { scene: crt } = useGLTF(CONFIG.phase2.CRT_MODEL_URL);
  const { scene: keyboard } = useGLTF(CONFIG.phase2.KEYBOARD_MODEL_URL);
  const { scene: desk } = useGLTF(CONFIG.phase2.DESK_MODEL_URL);
  const { workstation } = useDebugSettings();
  const { revealProgressRef } = useHeroTransition();
  const reducedMotion = usePrefersReducedMotion();
  const shadow = useMemo(() => createWorkstationShadow(), []);
  const shadowRef = useRef<Mesh>(null);
  const capturedSettings = useRef<typeof workstation | null>(null);
  useEffect(() => () => shadow.dispose(), [shadow]);
  const resources = useMemo(() => {
    const frame = getCRTReferenceFrame(crt);
    const deskSize = new Box3().setFromObject(desk).getSize(new Vector3());
    const keyboardModel = keyboard.clone(true);
    const deskModel = desk.clone(true);
    for (const model of [keyboardModel, deskModel]) {
      model.traverse(object => {
        if (object instanceof Mesh) object.raycast = () => null;
      });
    }
    return {
      ...frame,
      deskSize,
      keyboardModel,
      deskModel,
    };
  }, [crt, keyboard, desk]);
  const scale = width / resources.screenWidth;
  const { keyboardPosition, keyboardRotation, keyboardScale, deskPosition, deskScale } = workstation;
  const supportY = resources.supportY + deskPosition.y;
  useFrame(({ gl }) => {
    const reveal = revealProgressRef.current;
    if ((!reducedMotion && reveal < CONFIG.phase2.CONTACT_SHADOW_REVEAL) || reveal <= 0) return;
    if (capturedSettings.current === workstation) return;
    const monitor = crt.clone(true);
    for (const name of ["CRT_Screen", "CRT_Glass"]) monitor.getObjectByName(name)!.visible = false;
    const keyboardCapture = resources.keyboardModel.clone(true);
    shadow.capture(
      gl,
      [monitor, keyboardCapture],
      new Vector3(deskPosition.x, supportY + CONFIG.phase2.CONTACT_SHADOW_OFFSET, deskPosition.z),
      resources.deskSize.x * deskScale.x,
      resources.deskSize.z * deskScale.z,
    );
    capturedSettings.current = workstation;
    if (shadowRef.current) shadowRef.current.visible = true;
  });

  return (
    <group
      name="Phase2Workstation"
      scale={scale}
      position={[
        -resources.screenCenter.x * scale,
        -resources.screenCenter.y * scale,
        -(resources.screenFront + CONFIG.phase2.CRT_SCREEN_CLEARANCE) * scale,
      ]}
    >
      <primitive
        object={resources.deskModel}
        position={[deskPosition.x, supportY, deskPosition.z]}
        scale={[deskScale.x, deskScale.y, deskScale.z]}
      />
      <primitive
        object={resources.keyboardModel}
        position={[keyboardPosition.x, supportY + keyboardPosition.y, keyboardPosition.z]}
        rotation={[
          MathUtils.degToRad(keyboardRotation.x),
          MathUtils.degToRad(keyboardRotation.y),
          MathUtils.degToRad(keyboardRotation.z),
        ]}
        scale={keyboardScale}
      />
      <mesh
        ref={shadowRef}
        position={[deskPosition.x, supportY + CONFIG.phase2.CONTACT_SHADOW_OFFSET, deskPosition.z]}
        rotation={[Math.PI / 2, 0, 0]}
        material={shadow.material}
        visible={false}
        raycast={() => null}
      >
        <planeGeometry args={[resources.deskSize.x * deskScale.x, resources.deskSize.z * deskScale.z]} />
      </mesh>
    </group>
  );
}
