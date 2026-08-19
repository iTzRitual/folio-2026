"use client";

import { Html, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useCallback, useRef, type RefObject } from "react";
import * as THREE from "three";
import { CONFIG, FONTS } from "@/config/constants";
import { useSweptColor } from "@/context/ThemeContext";

const LABEL = "View project ↗";

export function CaseStudyExternalLink({
  href,
  positionRef,
  progressRef,
  em,
  pxPerUnit,
}: {
  href: string;
  positionRef: RefObject<THREE.Vector3>;
  progressRef: RefObject<number>;
  em: number;
  pxPerUnit: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const textRef = useRef<THREE.MeshBasicMaterial>(null);
  const plateRef = useRef<THREE.MeshBasicMaterial>(null);
  const twinRef = useRef<HTMLAnchorElement>(null);
  const fontSize = em * CONFIG.caseStudy.MOBILE_CTA_SIZE_EM;
  const width = fontSize * 7.8;
  const height = fontSize * 2.45;
  const textColor = useSweptColor(
    "textPrimary",
    groupRef,
    useCallback((hex: string) => textRef.current?.color.set(hex), []),
  );
  const plateColor = useSweptColor(
    "bg",
    groupRef,
    useCallback((hex: string) => plateRef.current?.color.set(hex), []),
  );

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    group.position.copy(positionRef.current);
    const opacity = THREE.MathUtils.clamp(
      (progressRef.current - 0.78) / 0.22,
      0,
      1,
    );
    if (textRef.current) textRef.current.opacity = opacity;
    if (plateRef.current) plateRef.current.opacity = opacity * 0.9;
    if (twinRef.current) {
      twinRef.current.style.visibility = opacity > 0.99 ? "visible" : "hidden";
      twinRef.current.style.pointerEvents = opacity > 0.99 ? "auto" : "none";
    }
  });

  return (
    <group ref={groupRef} visible>
      <mesh renderOrder={CONFIG.caseStudy.RENDER_ORDER} raycast={() => null}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          ref={plateRef}
          color={plateColor}
          transparent
          opacity={0}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <Text
        renderOrder={CONFIG.caseStudy.RENDER_ORDER + 1}
        anchorX="center"
        anchorY="middle"
        fontSize={fontSize}
        font={FONTS.karlaExtraBold}
        letterSpacing={CONFIG.detailsLayout.LETTER_SPACING}
      >
        {LABEL}
        <meshBasicMaterial
          ref={textRef}
          color={textColor}
          transparent
          opacity={0}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </Text>
      <Html
        as="div"
        className="-translate-x-1/2 -translate-y-1/2"
        zIndexRange={[
          CONFIG.caseStudy.MOBILE_CONTROL_Z_INDEX,
          CONFIG.caseStudy.MOBILE_CONTROL_Z_INDEX,
        ]}
      >
        <a
          ref={twinRef}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View project, opens in a new tab"
          className="pointer-events-none invisible flex min-h-11 items-center justify-center whitespace-nowrap font-karla font-extrabold leading-none text-transparent no-underline outline-none"
          style={{
            width: `${Math.max(width * pxPerUnit, 44)}px`,
            height: `${Math.max(height * pxPerUnit, 44)}px`,
            fontSize: `${fontSize * pxPerUnit}px`,
          }}
        >
          {LABEL}
        </a>
      </Html>
    </group>
  );
}
