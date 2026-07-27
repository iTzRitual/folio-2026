"use client";

import { Html, Text } from "@react-three/drei";
import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import gsap from "gsap";
import type { Mesh } from "three";
import * as THREE from "three";
import { CONFIG } from "../../config/constants";
import { applyCurlShader } from "@/lib/detailsCurl";
import {
  readTextBounds,
  sameTextBounds,
  type TextBounds,
} from "@/lib/textBounds";
import { CurlRevealBlock } from "./CurlRevealBlock";
import { useCurlFade } from "./useCurlFade";

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

  const blockMaterialRef = useRef<THREE.MeshBasicMaterial>(null);

  const { groupRef, twinRef, revealedRef } = useCurlFade<HTMLAnchorElement>(
    (opacity, curlFade) => {
      if (materialRef.current) materialRef.current.opacity = opacity;
      if (underlineRef.current) underlineRef.current.opacity = opacity;
      if (arrowRef.current) arrowRef.current.opacity = opacity;
      if (blockMaterialRef.current) blockMaterialRef.current.opacity = curlFade;
    },
  );

  const underlineMeshRef = useRef<THREE.Mesh>(null);
  const arrowMeshRef = useRef<THREE.Mesh>(null);
  const hoverProxy = useRef({ t: 0 });
  const slideProxy = useRef({ s: 1 });
  const slideTl = useRef<gsap.core.Timeline | null>(null);

  const [textDimensions, setTextDimensions] = useState({
    width: 0,
    minY: 0,
    maxY: 0,
  });
  const [arrowTex, setArrowTex] = useState<THREE.Texture | null>(null);
  const [revealBounds, setRevealBounds] = useState<TextBounds | null>(null);

  const handleHalfway = useCallback(() => {
    revealedRef.current = true;
  }, [revealedRef]);

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
    const measured = readTextBounds(mesh);
    if (measured) {
      setRevealBounds((current) =>
        sameTextBounds(current, measured) ? current : measured,
      );
    }

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

  const arrowSize = calculatedFontSize * CONFIG.detailsLink.ARROW_SIZE_MULT;
  const arrowGap = calculatedFontSize * CONFIG.detailsLink.ARROW_GAP_MULT;
  const arrowX = textDimensions.width + arrowGap + arrowSize / 2;
  const arrowY =
    -calculatedFontSize * 0.15 - 1.5 * (calculatedFontSize / pixelFontSize);

  const finePointer = () =>
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const reducedMotion = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const applyHoverColor = () => {
    const c = new THREE.Color().lerpColors(
      new THREE.Color(color),
      new THREE.Color(CONFIG.detailsLink.HOVER_COLOR),
      hoverProxy.current.t,
    );
    materialRef.current?.color.copy(c);
    underlineRef.current?.color.copy(c);
    arrowRef.current?.color.copy(c);
  };

  const handleEnter = () => {
    if (!finePointer()) return;
    gsap.to(hoverProxy.current, {
      t: 1,
      duration: CONFIG.detailsLink.COLOR_DURATION,
      ease: "power2.out",
      overwrite: true,
      onUpdate: applyHoverColor,
    });
    if (reducedMotion()) return;

    if (arrowMeshRef.current) {
      const nudge = arrowSize * CONFIG.detailsLink.ARROW_NUDGE_FACTOR;
      gsap.to(arrowMeshRef.current.position, {
        x: arrowX + nudge,
        y: arrowY + nudge,
        duration: CONFIG.detailsLink.ARROW_DURATION,
        ease: "power2.out",
        overwrite: true,
      });
    }

    if (underlineMeshRef.current && !slideTl.current?.isActive()) {
      const mesh = underlineMeshRef.current;
      const w = underlineWidth;
      const d = CONFIG.detailsLink.UNDERLINE_PHASE_DURATION;
      slideProxy.current.s = 1;
      slideTl.current = gsap
        .timeline()
        .to(slideProxy.current, {
          // wipe out, pivot on the right edge
          s: 0,
          duration: d,
          ease: "power2.inOut",
          onUpdate: () => {
            mesh.scale.x = Math.max(slideProxy.current.s, 0.0001);
            mesh.position.x = w - (w * slideProxy.current.s) / 2;
          },
        })
        .to(slideProxy.current, {
          // wipe back in, pivot on the left edge
          s: 1,
          duration: d,
          ease: "power2.inOut",
          onUpdate: () => {
            mesh.scale.x = Math.max(slideProxy.current.s, 0.0001);
            mesh.position.x = (w * slideProxy.current.s) / 2;
          },
        });
    }
  };

  const handleLeave = () => {
    if (!finePointer()) return;
    gsap.to(hoverProxy.current, {
      t: 0,
      duration: CONFIG.detailsLink.COLOR_DURATION,
      ease: "power2.out",
      overwrite: true,
      onUpdate: applyHoverColor,
    });
    if (arrowMeshRef.current) {
      gsap.to(arrowMeshRef.current.position, {
        x: arrowX,
        y: arrowY,
        duration: CONFIG.detailsLink.ARROW_DURATION,
        ease: "power2.out",
        overwrite: true,
      });
    }
    // underline slide completes on its own — do not reverse it
  };

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

      {textDimensions.width > 0 && (
        <>
          <mesh ref={underlineMeshRef} position={[underlineX, underlineY, 0]}>
            <planeGeometry args={[underlineWidth, underlineThickness]} />
            <meshBasicMaterial
              ref={underlineRef}
              color={color}
              transparent
              opacity={0}
              onBeforeCompile={applyCurlShader}
            />
          </mesh>

          {arrowTex && (
            <mesh ref={arrowMeshRef} position={[arrowX, arrowY, 0]}>
              <planeGeometry
                args={[
                  arrowSize,
                  arrowSize,
                  1,
                  CONFIG.detailsCurl.ARROW_SEGMENTS,
                ]}
              />
              <meshBasicMaterial
                ref={arrowRef}
                map={arrowTex}
                color={color}
                transparent
                opacity={0}
                onBeforeCompile={applyCurlShader}
              />
            </mesh>
          )}
        </>
      )}

      {revealBounds && (
        <CurlRevealBlock
          bounds={{
            ...revealBounds,
            maxX: revealBounds.maxX + arrowGap + arrowSize,
          }}
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
        <a
          ref={twinRef}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
          className={`whitespace-nowrap m-0 p-0 pointer-events-auto font-karla ${fontWeightClass} leading-none block no-underline outline-none`}
          style={{
            fontSize: `${pixelFontSize}px`,
            letterSpacing: `${letterSpacing + htmlLetterSpacingOffset}em`,
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
        </a>
      </Html>
    </group>
  );
}
