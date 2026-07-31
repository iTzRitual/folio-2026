"use client";

import { Html, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useRef } from "react";
import gsap from "gsap";
import * as THREE from "three";
import type { Mesh } from "three";
import { AnimatedRevealText } from "../AnimatedRevealText";
import { CONFIG, FONTS } from "@/config/constants";
import { useSweptColor } from "@/context/ThemeContext";
import { mixHex } from "@/lib/oklab";
import { HEADER_LAYER } from "../Effects/HeaderExclusionEffect";

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
  const groupRef = useRef<THREE.Group>(null);
  const revealedRef = useRef(false);
  const hoveredRef = useRef(false);
  const restHex = useRef("");
  const hoverHex = useRef("");
  const hoverCursor = useRef(0);

  const restColor = useSweptColor(
    "textSecondary",
    groupRef,
    useCallback((hex: string) => {
      restHex.current = hex;
    }, []),
  );
  useSweptColor(
    "hover",
    groupRef,
    useCallback((hex: string) => {
      hoverHex.current = hex;
    }, []),
  );

  useFrame((_, delta) => {
    const material = materialRef.current;
    if (!material || !restHex.current) return;

    const wanted = hoveredRef.current ? 1 : 0;
    const step = delta / CONFIG.header.HOVER_DURATION;
    hoverCursor.current =
      wanted > hoverCursor.current
        ? Math.min(wanted, hoverCursor.current + step)
        : Math.max(wanted, hoverCursor.current - step);

    const t = hoverCursor.current;
    material.color.set(
      mixHex(restHex.current, hoverHex.current, t * t * (3 - 2 * t)),
    );
  });

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
    mesh.layers.set(HEADER_LAYER);
    if (!onMeasure || !mesh.geometry) return;
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox;
    if (box) onMeasure(box.max.x - box.min.x);
  };

  const handleEnter = () => {
    if (!revealedRef.current) return;
    hoveredRef.current = true;
    document.body.style.cursor = "pointer";
  };

  const handleLeave = () => {
    hoveredRef.current = false;
    document.body.style.cursor = "auto";
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
    <p className="m-0 p-0">{text}</p>
  );

  const hitPad = (
    <span
      aria-hidden
      className="absolute inset-x-0 block"
      style={{
        top: `${-CONFIG.header.HIT_PAD_EM}em`,
        bottom: `${-CONFIG.header.HIT_PAD_EM}em`,
      }}
    />
  );

  const twinBody =
    revealMode === "fade" ? (
      label
    ) : (
      <AnimatedRevealText
        delay={delay}
        blockColor="var(--text-secondary)"
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
    <group position={position} ref={groupRef}>
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
          color={restColor}
        />
      </Text>

      <Html
        as="div"
        className="pointer-events-none"
        zIndexRange={[CONFIG.header.HTML_Z_INDEX, CONFIG.header.HTML_Z_INDEX]}
      >
        {href ? (
          <a
            href={href}
            className={`${twinClass} relative`}
            style={twinStyle}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
          >
            {hitPad}
            {twinBody}
          </a>
        ) : onActivate ? (
          <button
            type="button"
            className={`${twinClass} relative bg-transparent border-0 cursor-pointer`}
            style={twinStyle}
            onClick={onActivate}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
          >
            {hitPad}
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
