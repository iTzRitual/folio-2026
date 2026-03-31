"use client";

import { Html, Text } from "@react-three/drei";
import { useMemo, useRef, useState, useEffect } from "react";
import { AnimatedRevealText } from "../AnimatedRevealText";
import type { Mesh } from "three";
import * as THREE from "three";

interface DetailsLinkProps {
  text: string;
  href: string;
  position: [number, number, number];
  anchorX: "left" | "center" | "right";
  anchorY: "top" | "middle" | "bottom";
  calculatedFontSize: number;
  pixelFontSize: number;
  font: string;
  fontWeightClass: "font-light" | "font-black" | string;
  color: string;
  startTrigger: boolean;
  delay?: number;
  animateOnScroll?: boolean;
  direction?: "leftToRight" | "rightToLeft";
  lineHeight?: number;
  letterSpacing?: number;
  htmlLetterSpacingOffset?: number;
  blockColor?: string;
  selectionColor?: string;
  selectionBgColor?: string;
  onSync?: (mesh: Mesh) => void;
}

export function DetailsLink({
  text,
  href,
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
  selectionBgColor = "#BCBCBC",
  selectionColor = "#1D1D1D",
  onSync,
}: DetailsLinkProps) {
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const underlineRef = useRef<THREE.MeshBasicMaterial>(null);
  const arrowRef = useRef<THREE.MeshBasicMaterial>(null);

  const [textDimensions, setTextDimensions] = useState({
    width: 0,
    minY: 0,
    maxY: 0,
  });
  const [arrowTex, setArrowTex] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    new THREE.TextureLoader().load("/link_arrow.svg", (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      setArrowTex(tex);
    });
  }, []);

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

  const handleSync = (mesh: Mesh) => {
    if (mesh?.geometry) {
      mesh.geometry.computeBoundingBox();
      if (mesh.geometry.boundingBox) {
        const { max, min } = mesh.geometry.boundingBox;
        setTextDimensions({ width: max.x - min.x, minY: min.y, maxY: max.y });
      }
    }
    if (onSync) onSync(mesh);
  };

  const revealColor = blockColor ?? color;

  const underlineWidth = textDimensions.width;
  const underlineThickness = calculatedFontSize * 0.04;
  const underlineX = underlineWidth / 2;
  const underlineY = textDimensions.minY
    ? textDimensions.minY - calculatedFontSize * 0.1
    : -calculatedFontSize * 1.1;

  const arrowSize = calculatedFontSize * 0.4;
  const arrowGap = calculatedFontSize * 0.3;
  const arrowX = textDimensions.width + arrowGap + arrowSize / 2;
  const arrowY =
    -calculatedFontSize * 0.15 - 1.5 * (calculatedFontSize / pixelFontSize);

  return (
    <group position={position}>
      <Text
        anchorX={anchorX}
        anchorY={anchorY}
        fontSize={calculatedFontSize}
        font={font}
        lineHeight={lineHeight}
        letterSpacing={letterSpacing}
        onSync={handleSync}
      >
        {text}
        <meshBasicMaterial
          ref={materialRef}
          transparent
          opacity={0}
          color={color}
        />
      </Text>

      {textDimensions.width > 0 && (
        <>
          <mesh position={[underlineX, underlineY, 0]}>
            <planeGeometry args={[underlineWidth, underlineThickness]} />
            <meshBasicMaterial
              ref={underlineRef}
              color={color}
              transparent
              opacity={0}
            />
          </mesh>

          {arrowTex && (
            <mesh position={[arrowX, arrowY, 0]}>
              <planeGeometry args={[arrowSize, arrowSize]} />
              <meshBasicMaterial
                ref={arrowRef}
                map={arrowTex}
                color={color}
                transparent
                opacity={0}
              />
            </mesh>
          )}
        </>
      )}

      <Html as="div" className={`${xAlignClass} ${yAlignClass}`}>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`whitespace-nowrap m-0 p-0 pointer-events-auto font-karla ${fontWeightClass} leading-none block no-underline outline-none`}
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
              if (underlineRef.current) underlineRef.current.opacity = 1;
              if (arrowRef.current) arrowRef.current.opacity = 1;
            }}
          >
            <p
              className="m-0 p-0 selection:bg-(--selection-bg) selection:text-(--selection-color)"
              style={
                {
                  color: "transparent",
                  "--selection-bg": selectionBgColor,
                  "--selection-color": selectionColor,
                } as React.CSSProperties
              }
            >
              {text}
              <span
                className="inline-block"
                style={{
                  width: `${(arrowGap + arrowSize) / calculatedFontSize + 0.2}em`,
                }}
              >
                &#8203;
              </span>
            </p>
          </AnimatedRevealText>
        </a>
      </Html>
    </group>
  );
}
