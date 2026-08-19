"use client";

import { Html, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useCallback, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { AnimatedRevealText } from "@/components/AnimatedRevealText";
import { CONFIG, FONTS } from "@/config/constants";
import { useSweptColor } from "@/context/ThemeContext";
import { caseStudyStage } from "@/lib/caseStudyStage";
import { measureTextWidth } from "@/lib/textMetrics";
import type { OutlinedText } from "@/lib/troikaText";

function splitIntoTwoLines(
  text: string,
  width: number,
  fontSize: number,
  letterSpacing: number,
  fontsReady: boolean,
) {
  const words = text.trim().split(/\s+/);
  let bestSplit = Math.ceil(words.length / 2);
  let bestCost = Number.POSITIVE_INFINITY;

  for (let split = 2; split <= words.length - 2; split++) {
    const first = words.slice(0, split).join(" ");
    const second = words.slice(split).join(" ");
    const firstWidth = measureTextWidth(
      first,
      fontSize,
      letterSpacing,
      fontsReady,
      800,
    );
    const secondWidth = measureTextWidth(
      second,
      fontSize,
      letterSpacing,
      fontsReady,
      800,
    );
    const overflow = Math.max(0, firstWidth - width) + Math.max(0, secondWidth - width);
    const imbalance = Math.abs(firstWidth - secondWidth);
    const cost = overflow * 20 + imbalance;

    if (cost < bestCost) {
      bestCost = cost;
      bestSplit = split;
    }
  }

  return [
    words.slice(0, bestSplit).join(" "),
    words.slice(bestSplit).join(" "),
  ];
}

export function NarrowSubtitle({
  text,
  startTrigger,
  x,
  y,
  width,
  pixelWidth,
  fontSize,
  pixelFontSize,
  fontsReady,
  viewportHeight,
  scrollProgressRef,
}: {
  text: string;
  startTrigger: boolean;
  x: number;
  y: number;
  width: number;
  pixelWidth: number;
  fontSize: number;
  pixelFontSize: number;
  fontsReady: boolean;
  viewportHeight: number;
  scrollProgressRef: MutableRefObject<number>;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const movingRef = useRef<THREE.Group>(null);
  const lineRefs = useRef<THREE.Group[]>([]);
  const materialsRef = useRef<THREE.MeshBasicMaterial[]>([]);
  const textRefs = useRef<THREE.Mesh[]>([]);
  const twinRef = useRef<HTMLDivElement>(null);
  const revealedRef = useRef(false);
  const letterSpacing = CONFIG.subtitle.LETTER_SPACING;
  const lineHeight = CONFIG.heroLayout.NARROW_SUBTITLE_LINE_HEIGHT;
  const lines = useMemo(
    () =>
      splitIntoTwoLines(
        text,
        pixelWidth,
        pixelFontSize,
        letterSpacing,
        fontsReady,
      ),
    [text, pixelWidth, pixelFontSize, letterSpacing, fontsReady],
  );
  const lineScales = useMemo(
    () =>
      lines.map((line) => {
        const measured = measureTextWidth(
          line,
          pixelFontSize,
          letterSpacing,
          fontsReady,
          800,
        );
        return measured > 0 ? pixelWidth / measured : 1;
      }),
    [lines, pixelWidth, pixelFontSize, letterSpacing, fontsReady],
  );

  const color = useSweptColor(
    "textSecondary",
    rootRef,
    useCallback((hex: string) => {
      materialsRef.current.forEach((material) => material?.color.set(hex));
      textRefs.current.forEach((mesh) => {
        const textMesh = mesh as OutlinedText;
        textMesh.outlineColor = hex;
      });
    }, []),
  );

  useFrame(() => {
    const progress = THREE.MathUtils.clamp(
      scrollProgressRef.current / CONFIG.heroLayout.NARROW_SUBTITLE_EXIT_END,
      0,
      1,
    );
    const eased = 1 - Math.pow(1 - progress, 3);
    const present = 1 - caseStudyStage.dim;

    if (movingRef.current) {
      movingRef.current.position.y =
        y + viewportHeight * CONFIG.heroLayout.NARROW_SUBTITLE_EXIT_DISTANCE * eased;
    }
    materialsRef.current.forEach((material) => {
      if (material) material.opacity = revealedRef.current ? present : 0;
    });
    if (twinRef.current) {
      twinRef.current.style.opacity = String(present);
      twinRef.current.style.visibility =
        present > 0.01 ? "visible" : "hidden";
    }
  });

  return (
    <group ref={rootRef}>
      <group ref={movingRef} position={[x, y, 0]}>
        {lines.map((line, index) => (
          <group
            key={line}
            ref={(group) => {
              if (group) lineRefs.current[index] = group;
            }}
            position={[0, -index * fontSize * lineHeight, 0]}
          >
            <Text
              ref={(mesh) => {
                if (mesh) textRefs.current[index] = mesh;
              }}
              renderOrder={CONFIG.detailsCurl.ABOVE_EDGE_FADE_RENDER_ORDER}
              anchorX="left"
              anchorY="top"
              fontSize={fontSize}
              font={FONTS.karlaExtraBold}
              letterSpacing={letterSpacing}
              outlineWidth={CONFIG.subtitle.OUTLINE_WIDTH}
              outlineColor={color}
              onSync={(textMesh) => {
                textMesh.geometry.computeBoundingBox();
                const box = textMesh.geometry.boundingBox;
                if (!box || !lineRefs.current[index]) return;
                const measuredWidth = box.max.x - box.min.x;
                lineRefs.current[index].scale.x =
                  measuredWidth > 0 ? width / measuredWidth : 1;
              }}
            >
              {line}
              <meshBasicMaterial
                ref={(material) => {
                  if (material) materialsRef.current[index] = material;
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
            className="text-red-500/0 font-karla font-extrabold"
            style={{
              width: `${pixelWidth}px`,
              fontSize: `${pixelFontSize}px`,
              lineHeight,
              letterSpacing: `${letterSpacing}em`,
            }}
          >
            <AnimatedRevealText
              delay={CONFIG.subtitle.DELAY}
              blockColor="var(--text-secondary)"
              direction="rightToLeft"
              startTrigger={startTrigger}
              onReveal={() => {
                revealedRef.current = true;
              }}
            >
              {lines.map((line, index) => (
                <p key={line} className="m-0 w-full overflow-visible whitespace-nowrap">
                  <span
                    className="block w-fit origin-left"
                    style={{ transform: `scaleX(${lineScales[index]})` }}
                  >
                    {line}
                  </span>
                </p>
              ))}
            </AnimatedRevealText>
          </div>
        </Html>
      </group>
    </group>
  );
}
