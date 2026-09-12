"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Box3, MathUtils, Mesh, Vector3 } from "three";
import { CONFIG } from "@/config/constants";
import { useDebugSettings } from "@/context/DebugSettingsContext";
import { useHeroTransition } from "@/context/HeroTransitionContext";
import { getCRTReferenceFrame, getRequiredObject } from "@/lib/crtScreen";
import { createWorkstationShadow } from "@/lib/workstationShadow";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

export function WorkstationEnvironment({ width }: { width: number }) {
  const { scene: crt } = useGLTF(CONFIG.workstation.CRT_MODEL_URL);
  const { scene: keyboard } = useGLTF(CONFIG.workstation.KEYBOARD_MODEL_URL);
  const { scene: desk } = useGLTF(CONFIG.workstation.DESK_MODEL_URL);
  const { workstation } = useDebugSettings();
  const { revealProgressRef } = useHeroTransition();
  const reducedMotion = usePrefersReducedMotion();
  const gl = useThree((state) => state.gl);
  const shadow = useMemo(() => createWorkstationShadow(), []);
  const shadowRef = useRef<Mesh>(null);
  const capturedSettings = useRef<typeof workstation | null>(null);
  useEffect(() => () => shadow.dispose(), [shadow]);
  const resources = useMemo(() => {
    const frame = getCRTReferenceFrame(crt);
    const deskSize = new Box3().setFromObject(desk).getSize(new Vector3());
    const keyboardModel = keyboard.clone(true);
    const deskModel = desk.clone(true);
    const shadowMonitor = crt.clone(true);
    for (const name of ["CRT_Screen", "CRT_Glass"]) {
      getRequiredObject(shadowMonitor, name).visible = false;
    }
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
      shadowMonitor,
    };
  }, [crt, keyboard, desk]);
  const scale = width / resources.screenWidth;
  const { keyboardPosition, keyboardRotation, keyboardScale, deskPosition, deskScale } = workstation;
  const supportY = resources.supportY + deskPosition.y;
  const deskDepth = resources.deskSize.z * deskScale.z;
  const wallSize = CONFIG.workstation.WALL_SIZE;
  useEffect(() => {
    const capture = () => {
      shadow.capture(
        gl,
        [resources.shadowMonitor, resources.keyboardModel.clone(true)],
        new Vector3(
          deskPosition.x,
          supportY + CONFIG.workstation.CONTACT_SHADOW_OFFSET,
          deskPosition.z,
        ),
        resources.deskSize.x * deskScale.x,
        deskDepth,
      );
      capturedSettings.current = workstation;
    };
    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(capture, { timeout: 1000 });
      return () => window.cancelIdleCallback(idleId);
    }
    const timeoutId = globalThis.setTimeout(capture, 200);
    return () => globalThis.clearTimeout(timeoutId);
  }, [
    deskDepth,
    deskPosition.x,
    deskPosition.z,
    deskScale.x,
    gl,
    resources,
    shadow,
    supportY,
    workstation,
  ]);

  useFrame(() => {
    const reveal = revealProgressRef.current;
    if (shadowRef.current) {
      shadowRef.current.visible =
        capturedSettings.current === workstation &&
        reveal > 0 &&
        (reducedMotion || reveal >= CONFIG.workstation.CONTACT_SHADOW_REVEAL);
    }
  });

  return (
    <group
      name="WorkstationEnvironment"
      scale={scale}
      position={[
        -resources.screenCenter.x * scale,
        -resources.screenCenter.y * scale,
        -(resources.screenFront + CONFIG.workstation.CRT_SCREEN_CLEARANCE) * scale,
      ]}
    >
      <mesh
        name="Workstation_Wall"
        position={[
          deskPosition.x,
          supportY + CONFIG.workstation.WALL_CENTER_Y,
          deskPosition.z - deskDepth / 2 - wallSize.z / 2,
        ]}
        raycast={() => null}
      >
        <boxGeometry args={[wallSize.x, wallSize.y, wallSize.z]} />
        <meshStandardMaterial
          color={CONFIG.workstation.WALL_COLOR}
          roughness={CONFIG.workstation.WALL_ROUGHNESS}
        />
      </mesh>
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
        position={[deskPosition.x, supportY + CONFIG.workstation.CONTACT_SHADOW_OFFSET, deskPosition.z]}
        rotation={[Math.PI / 2, 0, 0]}
        material={shadow.material}
        visible={false}
        raycast={() => null}
      >
        <planeGeometry args={[resources.deskSize.x * deskScale.x, deskDepth]} />
      </mesh>
    </group>
  );
}
