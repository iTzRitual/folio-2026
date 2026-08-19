"use client";

import { Html, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useCallback, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { AnimatedRevealText } from "@/components/AnimatedRevealText";
import { CONFIG, FONTS } from "@/config/constants";
import { useSweptColor } from "@/context/ThemeContext";
import { caseStudyStage } from "@/lib/caseStudyStage";

export function NarrowTitle({
  text,
  startTrigger,
  x,
  initialY,
  settledY,
  openingFontSize,
  openingPixelFontSize,
  settledFontSize,
  scrollProgressRef,
  transitionStart,
  transitionEnd,
}: {
  text: string;
  startTrigger: boolean;
  x: number;
  initialY: number;
  settledY: number;
  openingFontSize: number;
  openingPixelFontSize: number;
  settledFontSize: number;
  scrollProgressRef: MutableRefObject<number>;
  transitionStart: number;
  transitionEnd: number;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const movingRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const twinRef = useRef<HTMLDivElement>(null);
  const revealedRef = useRef(false);
  const settledScale = settledFontSize / openingFontSize;
  const letterSpacing = CONFIG.heroLayout.NARROW_TITLE_LETTER_SPACING;

  const color = useSweptColor(
    "textPrimary",
    rootRef,
    useCallback((hex: string) => {
      materialRef.current?.color.set(hex);
    }, []),
  );

  useFrame(() => {
    const range = Math.max(transitionEnd - transitionStart, 1e-4);
    const raw = THREE.MathUtils.clamp(
      (scrollProgressRef.current - transitionStart) / range,
      0,
      1,
    );
    const progress = raw * raw * (3 - 2 * raw);
    const present = 1 - caseStudyStage.dim;
    const scale = THREE.MathUtils.lerp(1, settledScale, progress);

    if (movingRef.current) {
      movingRef.current.position.y = THREE.MathUtils.lerp(
        initialY,
        settledY,
        progress,
      );
      movingRef.current.scale.setScalar(scale);
    }
    if (materialRef.current) {
      materialRef.current.opacity = revealedRef.current ? present : 0;
    }
    if (twinRef.current) {
      twinRef.current.style.opacity = String(present);
      twinRef.current.style.visibility =
        present > 0.01 ? "visible" : "hidden";
    }
  });

  return (
    <group ref={rootRef}>
      <group ref={movingRef} position={[x, initialY, 0]}>
        <Text
          renderOrder={CONFIG.detailsCurl.ABOVE_EDGE_FADE_RENDER_ORDER}
          anchorX="left"
          anchorY="top"
          fontSize={openingFontSize}
          font={FONTS.karlaExtraBold}
          letterSpacing={letterSpacing}
        >
          {text}
          <meshBasicMaterial
            ref={materialRef}
            transparent
            opacity={0}
            color={color}
            depthTest={false}
          />
        </Text>
        <Html as="div" className="left-0 top-0 pointer-events-auto">
          <div
            ref={twinRef}
            className="whitespace-nowrap text-red-500/0 font-karla font-extrabold leading-none"
            style={{
              fontSize: `${openingPixelFontSize}px`,
              letterSpacing: `${letterSpacing}em`,
            }}
          >
            <AnimatedRevealText
              delay={0}
              startTrigger={startTrigger}
              onReveal={() => {
                revealedRef.current = true;
              }}
            >
              <h1 className="m-0 whitespace-nowrap">{text}</h1>
            </AnimatedRevealText>
          </div>
        </Html>
      </group>
    </group>
  );
}
