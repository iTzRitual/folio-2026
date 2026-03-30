"use client";

import { Html, Text } from "@react-three/drei";
import { useMemo, useRef } from "react";
import { AnimatedRevealText } from "../AnimatedRevealText";
import type { Mesh } from "three";
import * as THREE from "three";

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
  animateOnScroll?: boolean;
  direction?: "leftToRight" | "rightToLeft";
  lineHeight?: number;
  letterSpacing?: number;
  htmlLetterSpacingOffset?: number;
  blockColor?: string;
  selectionClassName?: string;
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
  animateOnScroll = true,
  direction = "leftToRight",
  lineHeight = 1,
  letterSpacing = -0.03,
  htmlLetterSpacingOffset = -0.004,
  blockColor,
  selectionClassName = "selection:bg-[#BCBCBC] selection:text-[#1D1D1D]",
  onSync,
}: DetailsTextProps) {
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

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
    <group position={position}>
      <Text
        anchorX={anchorX}
        anchorY={anchorY}
        fontSize={calculatedFontSize}
        font={font}
        lineHeight={lineHeight}
        letterSpacing={letterSpacing}
        onSync={onSync}
      >
        {text}
        <meshBasicMaterial
          ref={materialRef}
          transparent
          opacity={0}
          color={color}
        />
      </Text>

      <Html as="div" className={`${xAlignClass} ${yAlignClass}`}>
        <div
          className={`whitespace-nowrap m-0 p-0 text-transparent pointer-events-auto font-karla ${fontWeightClass} leading-none`}
          style={{
            fontSize: `${pixelFontSize}px`,
            letterSpacing: `${letterSpacing + htmlLetterSpacingOffset}em`,
          }}
        >
          <AnimatedRevealText
            animateOnScroll={animateOnScroll}
            delay={delay}
            blockColor={revealColor}
            direction={direction}
            startTrigger={startTrigger}
            onReveal={() => {
              if (materialRef.current) materialRef.current.opacity = 1;
            }}
          >
            <p
              className={`m-0 p-0 ${selectionClassName}`}
              style={{ color: "transparent" }}
            >
              {text}
            </p>
          </AnimatedRevealText>
        </div>
      </Html>
    </group>
  );
}
