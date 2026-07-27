"use client";

import { Html, Text } from "@react-three/drei";
import { useCallback, useMemo, useRef, useState } from "react";
import type { Mesh } from "three";
import * as THREE from "three";
import { CONFIG } from "@/config/constants";
import { applyCurlShader } from "@/lib/detailsCurl";
import { readTextBounds, type TextBounds } from "@/lib/textBounds";
import { CurlRevealBlock } from "./CurlRevealBlock";
import { useCurlFade } from "./useCurlFade";

interface DetailsTextProps {
  text: string;
  position: [number, number, number];
  anchorX: "left" | "center" | "right";
  anchorY: "top" | "middle" | "bottom";
  calculatedFontSize: number;
  pixelFontSize: number;
  font: string;
  fontWeightClass: "font-light" | "font-black";
  color: string;
  startTrigger: boolean;
  delay?: number;
  direction?: "leftToRight" | "rightToLeft";
  lineHeight?: number;
  letterSpacing?: number;
  htmlLetterSpacingOffset?: number;
  blockColor?: string;
  selectionColor?: string;
  selectionBgColor?: string;
  onSync?: (mesh: Mesh) => void;
}

export function DetailsText({
  text,
  position,
  anchorX,
  anchorY,
  calculatedFontSize,
  pixelFontSize,
  font,
  fontWeightClass,
  color,
  startTrigger,
  delay = 0,
  direction = "leftToRight",
  lineHeight = 1,
  letterSpacing = -0.03,
  htmlLetterSpacingOffset = -0.004,
  blockColor,
  selectionBgColor = "#BCBCBC",
  selectionColor = "#1D1D1D",
  onSync,
}: DetailsTextProps) {
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const blockMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const [bounds, setBounds] = useState<TextBounds | null>(null);

  const { groupRef, twinRef, revealedRef } = useCurlFade((opacity, curlFade) => {
    if (materialRef.current) materialRef.current.opacity = opacity;
    if (blockMaterialRef.current) blockMaterialRef.current.opacity = curlFade;
  });

  const handleSync = (mesh: Mesh) => {
    const measured = readTextBounds(mesh);
    if (measured) setBounds((current) => (current ? current : measured));
    onSync?.(mesh);
  };

  const handleHalfway = useCallback(() => {
    revealedRef.current = true;
  }, [revealedRef]);

  const xAlignClass = useMemo(() => {
    if (anchorX === "left") return "left-0";
    if (anchorX === "right") return "-translate-x-full";
    return "-translate-x-1/2";
  }, [anchorX]);

  const yAlignClass = useMemo(() => {
    if (anchorY === "top") return "top-0";
    if (anchorY === "bottom") return "-translate-y-full";
    return "-translate-y-1/2";
  }, [anchorY]);

  const revealColor = blockColor ?? color;
  return (
    <group position={position} ref={groupRef}>
      <Text
        anchorX={anchorX}
        anchorY={anchorY}
        fontSize={calculatedFontSize}
        font={font}
        lineHeight={lineHeight}
        letterSpacing={letterSpacing}
        glyphGeometryDetail={CONFIG.detailsCurl.GLYPH_DETAIL}
        onSync={handleSync}
      >
        {text}
        <meshBasicMaterial
          ref={materialRef}
          transparent
          opacity={0}
          color={color}
          onBeforeCompile={applyCurlShader}
        />
      </Text>

      {bounds && (
        <CurlRevealBlock
          bounds={bounds}
          color={revealColor}
          cornerRadius={
            (CONFIG.detailsReveal.BLOCK_RADIUS_PX * calculatedFontSize) /
            pixelFontSize
          }
          direction={direction}
          delay={delay}
          duration={CONFIG.copy.DURATION}
          startTrigger={startTrigger}
          materialRef={blockMaterialRef}
          onHalfway={handleHalfway}
        />
      )}

      <Html as="div" className={`${xAlignClass} ${yAlignClass}`}>
        <div
          ref={twinRef}
          className={`whitespace-nowrap m-0 p-0 text-transparent pointer-events-auto font-karla ${fontWeightClass} leading-none`}
          style={{
            fontSize: `${pixelFontSize}px`,
            letterSpacing: `${letterSpacing + htmlLetterSpacingOffset}em`,
          }}
        >
          <p
            className="m-0 p-0 selection:bg-(--selection-bg) selection:text-(--selection-color)"
            style={{
              color: "transparent",
              "--selection-bg": selectionBgColor,
              "--selection-color": selectionColor,
            } as React.CSSProperties}
          >
            {text}
          </p>
        </div>
      </Html>
    </group>
  );
}
