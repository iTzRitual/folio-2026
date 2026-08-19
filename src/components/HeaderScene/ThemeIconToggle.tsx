"use client";

import { Html } from "@react-three/drei";
import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import * as THREE from "three";
import { CONFIG } from "@/config/constants";
import { useSweptColor } from "@/context/ThemeContext";
import type { ThemeOption } from "@/data/content";
import { HEADER_LAYER } from "@/components/Effects/HeaderExclusionEffect";

export function ThemeIconToggle({
  position,
  size,
  startTrigger,
  delay,
  theme,
  onToggle,
}: {
  position: [number, number, number];
  size: number;
  startTrigger: boolean;
  delay: number;
  theme: ThemeOption;
  onToggle: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const iconRef = useRef<THREE.MeshBasicMaterial>(null);
  const maskRef = useRef<THREE.MeshBasicMaterial>(null);
  const isLight = theme === "Light";
  const iconColor = useSweptColor("textSecondary", groupRef, (hex) => {
    iconRef.current?.color.set(hex);
  });
  const maskColor = useSweptColor("bg", groupRef, (hex) => {
    maskRef.current?.color.set(hex);
  });

  useLayoutEffect(() => {
    groupRef.current?.traverse((object) => object.layers.set(HEADER_LAYER));
  }, []);

  useLayoutEffect(() => {
    if (!startTrigger || !iconRef.current) return;
    const materials = [iconRef.current, maskRef.current].filter(
      (material): material is THREE.MeshBasicMaterial => material !== null,
    );
    const tweens = materials.map((material) =>
      gsap.to(material, {
        opacity: 1,
        delay,
        duration: CONFIG.header.FADE_DURATION,
        ease: "power2.out",
      }),
    );
    return () => tweens.forEach((tween) => tween.kill());
  }, [startTrigger, delay]);

  return (
    <group ref={groupRef} position={position}>
      <mesh raycast={() => null}>
        <circleGeometry args={[size * 0.42, 24]} />
        <meshBasicMaterial
          ref={iconRef}
          color={iconColor}
          transparent
          opacity={0}
          toneMapped={false}
        />
      </mesh>
      {!isLight && (
        <mesh position={[size * 0.22, size * 0.16, 0.001]} raycast={() => null}>
          <circleGeometry args={[size * 0.38, 24]} />
          <meshBasicMaterial
            ref={maskRef}
            color={maskColor}
            transparent
            opacity={0}
            toneMapped={false}
          />
        </mesh>
      )}
      <Html as="div" className="-translate-x-1/2 -translate-y-1/2">
        <button
          type="button"
          onClick={onToggle}
          aria-label={`Switch to ${isLight ? "dark" : "light"} theme`}
          className="pointer-events-auto block h-11 w-11 cursor-pointer border-0 bg-transparent p-0 outline-none"
        />
      </Html>
    </group>
  );
}
