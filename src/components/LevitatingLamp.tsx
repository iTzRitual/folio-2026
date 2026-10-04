"use client";

import { Html, useCursor, useTexture } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { CatmullRomCurve3, Color, Group, LatheGeometry, MathUtils, MeshStandardMaterial, PointLight, SRGBColorSpace, Vector2, Vector3 } from "three";
import { CONFIG } from "@/config/constants";
import { useDebugSettings } from "@/context/DebugSettingsContext";
import { useHeroTransition } from "@/context/HeroTransitionContext";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const lamp = CONFIG.workstation.LEVITATING_LAMP;
const noRaycast = () => null;
const cold = new Color(lamp.FILAMENT_COLD_COLOR);
const hot = new Color(lamp.FILAMENT_COLOR);
const baseProfile = [
  [0, 0], [lamp.BASE_RADIUS - lamp.BASE_BEVEL, 0],
  ...Array.from({ length: 9 }, (_, i) => {
    const angle = i / 8 * Math.PI / 2;
    return [lamp.BASE_RADIUS - lamp.BASE_BEVEL + Math.sin(angle) * lamp.BASE_BEVEL, lamp.BASE_BEVEL * (1 - Math.cos(angle))];
  }),
  ...Array.from({ length: 9 }, (_, i) => {
    const angle = i / 8 * Math.PI / 2;
    return [lamp.BASE_RADIUS - lamp.BASE_BEVEL + Math.cos(angle) * lamp.BASE_BEVEL, lamp.BASE_HEIGHT - lamp.BASE_BEVEL + Math.sin(angle) * lamp.BASE_BEVEL];
  }),
  [0, lamp.BASE_HEIGHT],
].map(([x, y]) => new Vector2(x, y));
const glassProfile = new CatmullRomCurve3(lamp.GLASS_PROFILE.map(([radius, y]) => new Vector3(radius, y, 0)))
  .getPoints(96).map(point => new Vector2(Math.max(0, point.x), point.y));
const filamentPath = new CatmullRomCurve3(lamp.FILAMENT_POINTS.map(([x, y, z]) => new Vector3(x, y, z)), false, "centripetal");
const filamentCurve = new CatmullRomCurve3(Array.from({ length: lamp.FILAMENT_TURNS * 12 + 1 }, (_, i) => {
  const t = i / (lamp.FILAMENT_TURNS * 12);
  const point = filamentPath.getPointAt(t);
  const tangent = filamentPath.getTangentAt(t);
  const normal = new Vector3(-tangent.y, tangent.x, 0).normalize();
  const phase = t * lamp.FILAMENT_TURNS * Math.PI * 2;
  return point.addScaledVector(normal, Math.cos(phase) * lamp.FILAMENT_COIL_RADIUS)
    .addScaledVector(new Vector3(0, 0, 1), Math.sin(phase) * lamp.FILAMENT_COIL_RADIUS);
}));

export function LevitatingLamp({ supportY, worldScale }: { supportY: number; worldScale: number }) {
  const wood = useTexture(lamp.WOOD_URL, texture => { texture.colorSpace = SRGBColorSpace; });
  const { workstation: w, lighting } = useDebugSettings();
  const { revealProgressRef } = useHeroTransition();
  const reducedMotion = usePrefersReducedMotion();
  const root = useRef<Group>(null);
  const bulb = useRef<Group>(null);
  const filament = useRef<MeshStandardMaterial>(null);
  const light = useRef<PointLight>(null);
  const button = useRef<HTMLButtonElement>(null);
  const [on, setOn] = useState(true);
  const [hovered, setHovered] = useState(false);
  const runtime = useRef({ elapsed: 0, power: 1 });
  useCursor(hovered);
  const base = useMemo(() => {
    const geometry = new LatheGeometry(baseProfile, 64);
    const { position, uv } = geometry.attributes;
    for (let i = 0; i < position.count; i++) {
      uv.setXY(i, position.getX(i) / (lamp.BASE_RADIUS * 2) + 0.5, position.getZ(i) / (lamp.BASE_RADIUS * 2) + 0.5);
    }
    return geometry;
  }, []);
  useEffect(() => () => base.dispose(), [base]);

  const interactive = () => {
    if (revealProgressRef.current < lamp.INTERACTION_REVEAL || !root.current) return false;
    let visible = root.current.visible;
    root.current.traverseAncestors(parent => { visible = visible && parent.visible; });
    return visible;
  };
  const toggle = (event: ThreeEvent<MouseEvent>) => {
    if (!interactive() || event.delta > 5) return;
    event.stopPropagation();
    setOn(value => !value);
  };

  useFrame((_, delta) => {
    if (!root.current || !bulb.current || !filament.current || !light.current) return;
    const enabled = interactive();
    if (button.current) button.current.hidden = !enabled;
    if (!enabled && hovered) setHovered(false);
    let visible = root.current.visible;
    root.current.traverseAncestors(parent => { visible = visible && parent.visible; });
    if (!visible) return;
    const dt = Math.min(delta, 1 / 20);
    if (!reducedMotion) runtime.current.elapsed += dt;
    const elapsed = runtime.current.elapsed;
    bulb.current.position.y = lamp.BULB_HEIGHT + (reducedMotion ? 0 : Math.sin(elapsed * Math.PI * 2 / lamp.FLOAT_PERIOD) * lamp.FLOAT_AMPLITUDE);
    bulb.current.rotation.y = lamp.INITIAL_YAW + elapsed * Math.PI * 2 / lamp.ROTATION_PERIOD;
    runtime.current.power = MathUtils.damp(runtime.current.power, on ? 1 : 0, lamp.SWITCH_DAMPING, dt);
    const power = runtime.current.power < 0.001 ? 0 : runtime.current.power;
    filament.current.color.copy(cold).lerp(hot, power);
    filament.current.emissiveIntensity = power * lamp.FILAMENT_INTENSITY;
    light.current.intensity = power * lighting.lampLight * (lighting.mode === "night" ? 1 : CONFIG.workstation.LIGHT_DAY_LAMP_MULT)
      * worldScale * worldScale * CONFIG.workstation.LIGHT_LAMP_POWER_MULT;
  });

  return <group ref={root} name="DeskLamp" position={[w.lampPosition.x, supportY + w.lampPosition.y, w.lampPosition.z]} scale={CONFIG.workstation.LAMP_SCALE}
    onClick={toggle}
    onPointerOver={event => { if (interactive()) { event.stopPropagation(); setHovered(true); } }}
    onPointerOut={() => setHovered(false)}
  >
    <mesh name="WalnutLampBase" geometry={base}>
      <meshStandardMaterial map={wood} color="#d5b493" roughness={0.38} metalness={0.05} />
    </mesh>
    <mesh position={[0, 0.003, 0]} raycast={noRaycast}>
      <cylinderGeometry args={[lamp.BASE_RADIUS - 0.005, lamp.BASE_RADIUS - 0.009, 0.005, 48]} />
      <meshStandardMaterial color="#201b16" roughness={0.8} />
    </mesh>
    <mesh name="LampTouchSwitch" position={[0.057, lamp.BASE_HEIGHT + 0.0005, 0.04]} rotation={[-Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.0055, 0.0006, 8, 32]} />
      <meshStandardMaterial color="#c8b79e" metalness={0.7} roughness={0.3} />
    </mesh>
    <Html wrapperClass="workstation-control-overlay" position={[0.057, lamp.BASE_HEIGHT, 0.04]} center zIndexRange={[2, 0]}>
      <button ref={button} type="button" hidden aria-label="Desk lamp" aria-pressed={on}
        className="sr-only focus:not-sr-only focus:rounded-full focus:bg-stone-900 focus:px-4 focus:py-2 focus:whitespace-nowrap focus:text-amber-100 focus:outline-2 focus:outline-amber-200"
        onClick={event => { event.stopPropagation(); if (interactive()) setOn(value => !value); }}
      >{on ? "Turn lamp off" : "Turn lamp on"}</button>
    </Html>
    <group ref={bulb} name="LevitatingBulb" position={[0, lamp.BULB_HEIGHT, 0]} rotation={[0, lamp.INITIAL_YAW, 0]}>
      <mesh name="BulbContact" position={[0, 0.002, 0]}>
        <sphereGeometry args={[0.009, 20, 12]} />
        <meshStandardMaterial color="#b5a084" metalness={0.85} roughness={0.22} />
      </mesh>
      <mesh position={[0, 0.021, 0]}>
        <cylinderGeometry args={[0.025, 0.019, 0.039, 40]} />
        <meshStandardMaterial color="#736854" metalness={0.92} roughness={0.23} />
      </mesh>
      {Array.from({ length: 5 }, (_, i) => <mesh key={i} position={[0, 0.008 + i * 0.007, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.022 + i * 0.0006, 0.0025, 8, 40]} />
        <meshStandardMaterial color="#c6bba5" metalness={0.95} roughness={0.2} />
      </mesh>)}
      <mesh name="BulbGlass">
        <latheGeometry args={[glassProfile, 64]} />
        <meshPhysicalMaterial {...lamp.GLASS} />
      </mesh>
      <mesh name="GlassStem" position={[0, 0.07, 0]} raycast={noRaycast}>
        <cylinderGeometry args={[0.004, 0.007, 0.06, 16]} />
        <meshPhysicalMaterial {...lamp.GLASS} />
      </mesh>
      {[-1, 1].map(side => <mesh key={side} position={[side * 0.012, 0.068, 0.009]} rotation={[0, 0, side * -0.35]} raycast={noRaycast}>
        <cylinderGeometry args={[0.0008, 0.0008, 0.068, 8]} />
        <meshStandardMaterial color="#6c5640" metalness={0.8} roughness={0.35} />
      </mesh>)}
      <mesh name="BulbFilament" raycast={noRaycast}>
        <tubeGeometry args={[filamentCurve, lamp.FILAMENT_TURNS * 12, lamp.FILAMENT_RADIUS, 5, false]} />
        <meshStandardMaterial ref={filament} color={lamp.FILAMENT_COLOR} emissive={lamp.FILAMENT_COLOR} emissiveIntensity={lamp.FILAMENT_INTENSITY} toneMapped={false} />
      </mesh>
      <pointLight ref={light} name="LampLight" position={[0, lamp.LIGHT_HEIGHT, 0]} color={lamp.FILAMENT_COLOR} distance={lamp.LIGHT_DISTANCE * worldScale} decay={2} intensity={0} />
    </group>
  </group>;
}
