"use client";

import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Box3, Group, MathUtils, Mesh, MeshStandardMaterial, Matrix4, Vector3 } from "three";
import { CONFIG } from "@/config/constants";
import { useDebugSettings } from "@/context/DebugSettingsContext";
import { getCRTReferenceFrame, getRequiredObject } from "@/lib/crtScreen";
import { createWorkstationShadow } from "@/lib/workstationShadow";
import { workstationToScreen } from "@/lib/workstationFrame";
import { Block, DesktopProxies, MusicCabinet, WallProxies } from "./WorkstationBlockout";

export function WorkstationEnvironment({ width }: { width: number }) {
  const { scene: crt } = useGLTF(CONFIG.workstation.CRT_MODEL_URL);
  const { scene: keyboard } = useGLTF(CONFIG.workstation.KEYBOARD_MODEL_URL);
  const { scene: turntable } = useGLTF(CONFIG.workstation.TURNTABLE_MODEL_URL);
  const { scene: desk } = useGLTF(CONFIG.workstation.DESK_MODEL_URL);
  const { workstation: w, lighting } = useDebugSettings();
  const gl = useThree((state) => state.gl);
  const accessories = useRef<Group>(null);
  const shadows = useMemo(() => [createWorkstationShadow(), createWorkstationShadow()], []);
  useEffect(() => () => shadows.forEach(shadow => shadow.dispose()), [shadows]);
  const resources = useMemo(() => {
    const frame = getCRTReferenceFrame(crt);
    const deskSize = new Box3().setFromObject(desk).getSize(new Vector3());
    const models = [keyboard, turntable, desk].map(source => {
      const model = source.clone(true);
      model.traverse(object => {
        if (!(object instanceof Mesh)) return;
        object.raycast = () => null;
        object.material = Array.isArray(object.material) ? object.material.map(m => m.clone()) : object.material.clone();
      });
      return model;
    });
    const shadowMonitor = crt.clone(true);
    for (const name of ["CRT_Screen", "CRT_Glass"]) getRequiredObject(shadowMonitor, name).visible = false;
    return { ...frame, deskSize, keyboardModel: models[0], turntableModel: models[1], deskModel: models[2], shadowMonitor };
  }, [crt, keyboard, turntable, desk]);
  useEffect(() => () => {
    for (const model of [resources.keyboardModel, resources.turntableModel, resources.deskModel]) {
      model.traverse(object => {
        if (object instanceof Mesh) (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => m.dispose());
      });
    }
  }, [resources]);
  useEffect(() => {
    for (const model of [resources.keyboardModel, resources.turntableModel, resources.deskModel]) {
      model.traverse(object => {
        if (!(object instanceof Mesh)) return;
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          if (material instanceof MeshStandardMaterial) material.envMapIntensity = lighting.mode === "day" ? 0.4 : 0.12;
        }
      });
    }
  }, [resources, lighting.mode]);
  const scale = width / resources.screenWidth;
  const matrix = useMemo(() => new Matrix4().makeScale(scale, scale, scale).multiply(workstationToScreen(resources, w)), [resources, scale, w]);
  const supportY = resources.supportY + w.deskPosition.y;
  const deskWidth = resources.deskSize.x * w.deskScale.x;
  const deskDepth = resources.deskSize.z * w.deskScale.z;
  const cabinet = CONFIG.workstation.CABINET_SIZE;
  const degrees = (r: { x: number; y: number; z: number }): [number, number, number] => [r.x, r.y, r.z].map(MathUtils.degToRad) as [number, number, number];
  useEffect(() => {
    const capture = () => {
      const monitor = resources.shadowMonitor.clone(true);
      monitor.position.set(w.monitorPosition.x, w.monitorPosition.y + w.deskPosition.y, w.monitorPosition.z);
      monitor.rotation.y = MathUtils.degToRad(w.monitorYaw);
      const desktop = [monitor, resources.keyboardModel.clone(true)];
      if (accessories.current) desktop.push(accessories.current.clone(true));
      shadows[0].capture(gl, desktop, new Vector3(w.deskPosition.x, supportY + CONFIG.workstation.CONTACT_SHADOW_OFFSET, w.deskPosition.z), deskWidth, deskDepth);
      const recordPlayer = resources.turntableModel.clone(true);
      recordPlayer.traverse(object => {
        if (!(object instanceof Mesh)) return;
        if ((Array.isArray(object.material) ? object.material : [object.material]).every(m => m.transparent)) object.visible = false;
      });
      shadows[1].capture(gl, [recordPlayer], new Vector3(0, CONFIG.workstation.CONTACT_SHADOW_OFFSET, 0), cabinet.x, cabinet.z);
    };
    const id = requestAnimationFrame(capture);
    return () => cancelAnimationFrame(id);
  }, [gl, resources, shadows, w, supportY, deskWidth, deskDepth, cabinet]);
  const night = lighting.mode === "night";
  return <group name="WorkstationEnvironment" matrix={matrix} matrixAutoUpdate={false}>
    <group name="MainDesk">
      <primitive object={resources.deskModel} position={[w.deskPosition.x, supportY, w.deskPosition.z]} scale={[w.deskScale.x, w.deskScale.y, w.deskScale.z]} />
      {[-1, 1].flatMap(x => [-1, 1].map(z => <Block key={`${x}:${z}`} size={[0.038, 0.68, 0.038]} position={[w.deskPosition.x + x * (deskWidth / 2 - 0.065), supportY - 0.38, w.deskPosition.z + z * (deskDepth / 2 - 0.08)]} color="#353a37" />))}
      <primitive object={resources.keyboardModel} position={[w.keyboardPosition.x, supportY + w.keyboardPosition.y, w.keyboardPosition.z]} rotation={degrees(w.keyboardRotation)} scale={w.keyboardScale} />
      <group ref={accessories}><DesktopProxies supportY={supportY} /></group>
      <mesh name="DeskContactShadow" position={[w.deskPosition.x, supportY + CONFIG.workstation.CONTACT_SHADOW_OFFSET, w.deskPosition.z]} rotation={[Math.PI / 2, 0, 0]} material={shadows[0].material} raycast={() => null}>
        <planeGeometry args={[deskWidth, deskDepth]} />
      </mesh>
    </group>
    <MusicCabinet supportY={supportY}>
      <primitive object={resources.turntableModel} position={[w.turntablePosition.x, w.turntablePosition.y, w.turntablePosition.z]} rotation={degrees(w.turntableRotation)} scale={w.turntableScale} />
      <mesh name="TurntableContactShadow" position={[0, CONFIG.workstation.CONTACT_SHADOW_OFFSET, 0]} rotation={[Math.PI / 2, 0, 0]} material={shadows[1].material} raycast={() => null}>
        <planeGeometry args={[cabinet.x, cabinet.z]} />
      </mesh>
    </MusicCabinet>
    <WallProxies supportY={supportY} />
    <Block name="Floor" size={[CONFIG.workstation.WALL_SIZE.x, 0.04, 6]} position={[0, supportY - 0.74, 0]} color="#51554f" />
    <ambientLight intensity={lighting.fillLight * (night ? CONFIG.workstation.LIGHT_NIGHT_FILL_MULT : 1)} color={night ? "#a8b9db" : "#e1dfd0"} />
    <pointLight name="WindowLight" position={[w.windowPosition.x, supportY + w.windowPosition.y, w.windowPosition.z + CONFIG.workstation.LIGHT_WINDOW_OFFSET_Z]} intensity={lighting.windowLight * (night ? CONFIG.workstation.LIGHT_NIGHT_WINDOW_MULT : 1) * scale * scale} distance={3 * scale} decay={2} color={night ? "#6c94ce" : "#d9eceb"} />
    <pointLight name="LampLight" position={[w.lampPosition.x + CONFIG.workstation.LIGHT_LAMP_OFFSET.x, supportY + w.lampPosition.y + CONFIG.workstation.LIGHT_LAMP_OFFSET.y, w.lampPosition.z + CONFIG.workstation.LIGHT_LAMP_OFFSET.z]} intensity={lighting.lampLight * (night ? 1 : CONFIG.workstation.LIGHT_DAY_LAMP_MULT) * scale * scale * CONFIG.workstation.LIGHT_LAMP_POWER_MULT} distance={1.2 * scale} decay={2} color="#ffd096" />
  </group>;
}
