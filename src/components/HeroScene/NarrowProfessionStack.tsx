"use client";

import { Html, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useCallback, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { AnimatedRevealText } from "@/components/AnimatedRevealText";
import { CONFIG, FONTS } from "@/config/constants";
import { useSweptColor } from "@/context/ThemeContext";
import { caseStudyStage } from "@/lib/caseStudyStage";

export function NarrowProfessionStack({
  roles,
  startTrigger,
  x,
  initialY,
  settledY,
  width,
  pixelWidth,
  fontSize,
  pixelFontSize,
  settledPixelFontSize,
  pxTo3DWidth,
  pxTo3DHeight,
  scrollProgressRef,
  transitionStart,
  transitionEnd,
}: {
  roles: readonly string[];
  startTrigger: boolean;
  x: number;
  initialY: number;
  settledY: number;
  width: number;
  pixelWidth: number;
  fontSize: number;
  pixelFontSize: number;
  settledPixelFontSize: number;
  pxTo3DWidth: number;
  pxTo3DHeight: number;
  scrollProgressRef: MutableRefObject<number>;
  transitionStart: number;
  transitionEnd: number;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const movingRef = useRef<THREE.Group>(null);
  const indexMaterialsRef = useRef<THREE.MeshBasicMaterial[]>([]);
  const roleMaterialsRef = useRef<THREE.MeshBasicMaterial[]>([]);
  const ruleMaterialsRef = useRef<THREE.MeshBasicMaterial[]>([]);
  const twinRef = useRef<HTMLDivElement>(null);
  const revealedRowsRef = useRef([false, false]);
  const revealElapsedRef = useRef(0);
  const settledScale = settledPixelFontSize / pixelFontSize;
  const rowPitch =
    CONFIG.heroLayout.NARROW_ROLE_ROW_PITCH_PX * pxTo3DHeight;
  const indexOffset =
    CONFIG.heroLayout.NARROW_ROLE_INDEX_OFFSET_PX * pxTo3DWidth;
  const ruleThickness = Math.max(pxTo3DHeight, pxTo3DWidth);

  const color = useSweptColor(
    "textStacked",
    rootRef,
    useCallback((hex: string) => {
      indexMaterialsRef.current.forEach((material) => material?.color.set(hex));
      roleMaterialsRef.current.forEach((material) => material?.color.set(hex));
      ruleMaterialsRef.current.forEach((material) => material?.color.set(hex));
    }, []),
  );

  useFrame((_, delta) => {
    const range = Math.max(transitionEnd - transitionStart, 1e-4);
    const raw = THREE.MathUtils.clamp(
      (scrollProgressRef.current - transitionStart) / range,
      0,
      1,
    );
    const progress = raw * raw * (3 - 2 * raw);
    const present = 1 - caseStudyStage.dim;
    const scale = THREE.MathUtils.lerp(1, settledScale, progress);

    if (startTrigger) revealElapsedRef.current += delta;
    const ruleReveal = THREE.MathUtils.clamp(
      (revealElapsedRef.current - CONFIG.professionLabel.DELAY) /
        CONFIG.heroLayout.NARROW_ROLE_RULE_REVEAL_DURATION,
      0,
      1,
    );

    if (movingRef.current) {
      movingRef.current.position.y = THREE.MathUtils.lerp(
        initialY,
        settledY,
        progress,
      );
      movingRef.current.scale.setScalar(scale);
    }
    indexMaterialsRef.current.forEach((material, index) => {
      if (material) {
        material.opacity = (revealedRowsRef.current[index] ? 1 : 0) * present;
      }
    });
    roleMaterialsRef.current.forEach((material, index) => {
      if (material) {
        material.opacity = (revealedRowsRef.current[index] ? 1 : 0) * present;
      }
    });
    ruleMaterialsRef.current.forEach((material) => {
      if (material) material.opacity = ruleReveal * 0.28 * present;
    });
    if (twinRef.current) {
      twinRef.current.style.opacity = String(present);
      twinRef.current.style.visibility =
        present > 0.01 ? "visible" : "hidden";
    }
  });

  return (
    <group ref={rootRef}>
      <group ref={movingRef} position={[x, initialY, 0]}>
        {[0, 1, 2].map((index) => (
          <mesh
            key={index}
            position={[width / 2, -index * rowPitch, 0]}
            renderOrder={CONFIG.detailsCurl.ABOVE_EDGE_FADE_RENDER_ORDER}
          >
            <planeGeometry args={[width, ruleThickness]} />
            <meshBasicMaterial
              ref={(material) => {
                if (material) ruleMaterialsRef.current[index] = material;
              }}
              transparent
              opacity={0}
              color={color}
              depthTest={false}
            />
          </mesh>
        ))}

        {roles.map((role, index) => (
          <group
            key={role}
            position={[0, -index * rowPitch - rowPitch * 0.5, 0]}
          >
            <Text
              anchorX="left"
              anchorY="middle"
              fontSize={fontSize * CONFIG.heroLayout.NARROW_ROLE_INDEX_SCALE}
              font={FONTS.karlaExtraBold}
              letterSpacing={CONFIG.heroLayout.NARROW_ROLE_INDEX_TRACKING}
              renderOrder={CONFIG.detailsCurl.ABOVE_EDGE_FADE_RENDER_ORDER}
            >
              {String(index + 1).padStart(2, "0")}
              <meshBasicMaterial
                ref={(material) => {
                  if (material) indexMaterialsRef.current[index] = material;
                }}
                transparent
                opacity={0}
                color={color}
                depthTest={false}
              />
            </Text>
            <Text
              anchorX="left"
              anchorY="middle"
              position={[indexOffset, 0, 0]}
              fontSize={fontSize}
              font={FONTS.karlaLight}
              letterSpacing={CONFIG.professionLabel.LETTER_SPACING}
              renderOrder={CONFIG.detailsCurl.ABOVE_EDGE_FADE_RENDER_ORDER}
            >
              {role}
              <meshBasicMaterial
                ref={(material) => {
                  if (material) roleMaterialsRef.current[index] = material;
                }}
                transparent
                opacity={0}
                color={color}
                depthTest={false}
              />
            </Text>
          </group>
        ))}

        <Html as="div" className="left-0 top-0 pointer-events-auto">
          <div
            ref={twinRef}
            className="font-karla font-light text-red-500/0"
            style={{
              width: `${pixelWidth}px`,
              fontSize: `${pixelFontSize}px`,
              letterSpacing: `${CONFIG.professionLabel.LETTER_SPACING}em`,
            }}
          >
            <AnimatedRevealText
              delay={CONFIG.professionLabel.DELAY}
              blockColor="var(--text-stacked)"
              startTrigger={startTrigger}
              stagger={CONFIG.heroLayout.NARROW_ROLE_REVEAL_STAGGER}
              onReveal={(index) => {
                if (index < 2) revealedRowsRef.current[index] = true;
              }}
            >
              {roles.map((role, index) => (
                <p
                  key={role}
                  className="m-0 grid items-center whitespace-nowrap border-y border-transparent"
                  style={{
                    height: `${CONFIG.heroLayout.NARROW_ROLE_ROW_PITCH_PX}px`,
                    gridTemplateColumns: `${CONFIG.heroLayout.NARROW_ROLE_INDEX_OFFSET_PX}px 1fr`,
                  }}
                >
                  <span className="font-extrabold tracking-[0.08em]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{role}</span>
                </p>
              ))}
            </AnimatedRevealText>
          </div>
        </Html>
      </group>
    </group>
  );
}
