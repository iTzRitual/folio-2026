"use client";

import { Html, Text } from "@react-three/drei";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import * as THREE from "three";
import type { Mesh } from "three";
import { AnimatedRevealText } from "../AnimatedRevealText";
import { CONFIG, FONTS, THEME } from "@/config/constants";

interface HeaderItemProps {
  text: string;
  position: [number, number, number];
  anchorX: "left" | "right";
  calculatedFontSize: number;
  pixelFontSize: number;
  startTrigger: boolean;
  bold?: boolean;
  delay?: number;
  revealMode?: "block" | "fade";
  href?: string;
  onActivate?: () => void;
  onMeasure?: (width: number) => void;
}

export function HeaderItem({
  text,
  position,
  anchorX,
  calculatedFontSize,
  pixelFontSize,
  startTrigger,
  bold = false,
  delay = 0,
  revealMode = "block",
  href,
  onActivate,
  onMeasure,
}: HeaderItemProps) {
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const revealedRef = useRef(false);

  const font = bold ? FONTS.karlaExtraBold : FONTS.karlaLight;
  const weightClass = bold ? "font-extrabold" : "font-light";
  const direction = anchorX === "right" ? "rightToLeft" : "leftToRight";

  useEffect(() => {
    if (revealMode !== "fade" || !startTrigger) return;
    const material = materialRef.current;
    if (!material) return;

    const tween = gsap.to(material, {
      opacity: 1,
      duration: CONFIG.header.FADE_DURATION,
      delay,
      ease: "power2.out",
      onStart: () => {
        revealedRef.current = true;
      },
    });
    return () => {
      tween.kill();
    };
  }, [revealMode, startTrigger, delay]);

  const handleSync = (mesh: Mesh) => {
    if (!onMeasure || !mesh.geometry) return;
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox;
    if (box) onMeasure(box.max.x - box.min.x);
  };

  const tintTo = (color: string) => {
    if (!materialRef.current) return;
    gsap.to(materialRef.current.color, {
      ...new THREE.Color(color),
      duration: CONFIG.header.HOVER_DURATION,
      ease: "power2.out",
      overwrite: true,
    });
  };

  const handleEnter = () => {
    if (!revealedRef.current) return;
    document.body.style.cursor = "pointer";
    tintTo(CONFIG.header.HOVER_COLOR);
  };

  const handleLeave = () => {
    document.body.style.cursor = "auto";
    tintTo(THEME.dark);
  };

  const twinClass = `whitespace-nowrap m-0 p-0 pointer-events-auto font-karla ${weightClass} leading-none block no-underline outline-none ${
    anchorX === "right" ? "-translate-x-full" : "left-0"
  } -translate-y-1/2`;
  const twinStyle = {
    fontSize: `${pixelFontSize}px`,
    letterSpacing: `${
      CONFIG.header.LETTER_SPACING + CONFIG.header.HTML_LETTER_SPACING_OFFSET
    }em`,
    color: "transparent",
  } as React.CSSProperties;

  const label = (
    <p className="m-0 p-0 selection:bg-[#BCBCBC] selection:text-[#1D1D1D]">
      {text}
    </p>
  );

  const twinBody =
    revealMode === "fade" ? (
      label
    ) : (
      <AnimatedRevealText
        delay={delay}
        blockColor={THEME.dark}
        direction={direction}
        startTrigger={startTrigger}
        onReveal={() => {
          revealedRef.current = true;
          if (materialRef.current) materialRef.current.opacity = 1;
        }}
      >
        {label}
      </AnimatedRevealText>
    );

  return (
    <group position={position}>
      <Text
        anchorX={anchorX}
        anchorY="middle"
        fontSize={calculatedFontSize}
        font={font}
        lineHeight={1}
        letterSpacing={CONFIG.header.LETTER_SPACING}
        onSync={handleSync}
      >
        {text}
        <meshBasicMaterial
          ref={materialRef}
          transparent
          opacity={0}
          color={THEME.dark}
        />
      </Text>

      <Html as="div" className="pointer-events-none">
        {href ? (
          <a
            href={href}
            className={twinClass}
            style={twinStyle}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
          >
            {twinBody}
          </a>
        ) : onActivate ? (
          <button
            type="button"
            className={`${twinClass} bg-transparent border-0 cursor-pointer`}
            style={twinStyle}
            onClick={onActivate}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
          >
            {twinBody}
          </button>
        ) : (
          <div className={twinClass} style={twinStyle}>
            {twinBody}
          </div>
        )}
      </Html>
    </group>
  );
}
