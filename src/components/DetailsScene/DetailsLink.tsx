"use client";

import { Html, Text } from "@react-three/drei";
import gsap from "gsap";
import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, Mesh } from "three";
import * as THREE from "three";
import { CONFIG } from "../../config/constants";
import { curlFadePowerShader, curlRowTransform } from "@/lib/detailsCurl";
import {
  readTextBounds,
  sameTextBounds,
  type TextBounds,
} from "@/lib/textBounds";
import { CurlRevealBlock } from "./CurlRevealBlock";
import { LinkButtonPlate } from "./LinkButtonPlate";
import { useCurlFade } from "./useCurlFade";
import { useProjectHoverActions } from "@/context/ProjectHoverContext";

// Built once instead of on every hover enter and leave.
const FINE_POINTER_QUERY =
  typeof window === "undefined"
    ? ({ matches: false } as MediaQueryList)
    : window.matchMedia("(hover: hover) and (pointer: fine)");
const REDUCED_MOTION_QUERY =
  typeof window === "undefined"
    ? ({ matches: false } as MediaQueryList)
    : window.matchMedia("(prefers-reduced-motion: reduce)");

// One texture for every link. Loading per instance let the HTTP cache dedupe
// the request but still produced one THREE.Texture and one GPU upload each.
let arrowTexturePromise: Promise<THREE.Texture> | null = null;
let arrowTexture: THREE.Texture | null = null;

function loadArrowTexture() {
  arrowTexturePromise ??= new Promise((resolve) => {
    new THREE.TextureLoader().load("/link_arrow.svg", (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      arrowTexture = texture;
      resolve(texture);
    });
  });

  return arrowTexturePromise;
}

interface DetailsLinkProps {
  text: string;
  href: string;
  previewImage?: string;
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
  /** Row-to-row spacing in em, used to close the dead space between links. */
  rowPitchEm?: number;
  blockColor?: string;
  onSync?: (mesh: Mesh) => void;
}

export function DetailsLink({
  text,
  href,
  previewImage,
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
  rowPitchEm,
  blockColor,
  onSync,
}: DetailsLinkProps) {
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const arrowRef = useRef<THREE.MeshBasicMaterial>(null);
  const plateRef = useRef<THREE.MeshBasicMaterial>(null);
  const arrowMeshRef = useRef<THREE.Mesh>(null);

  const blockMaterialRef = useRef<THREE.MeshBasicMaterial>(null);

  const { setHoveredPreview, clearHoveredPreview } = useProjectHoverActions();
  // A link stays in the scene well past both folds, curled and faded out.
  // Anything still legible stays clickable, and carries its preview with it —
  // the plate curls around the same fold, so it survives up there too.
  const interactiveRef = useRef(false);
  const hitCurlRef = useRef<Group>(null);
  const hitMeshRef = useRef<Mesh>(null);
  const hitCenterYRef = useRef(0);
  const hitHalfHeightRef = useRef(0);
  const curlWorld = useRef(new THREE.Vector3());
  const syncHoverRef = useRef<() => void>(() => {});
  const hoverSources = useRef({ twin: false, mesh: false });
  const hoveredRef = useRef(false);
  const plateShownRef = useRef(false);

  const { groupRef, twinRef, revealedRef } = useCurlFade<HTMLAnchorElement>(
    (opacity) => {
      const shown = plateShownRef.current ? 1 : 0;
      if (materialRef.current) materialRef.current.opacity = shown;
      if (arrowRef.current) arrowRef.current.opacity = shown;
      if (plateRef.current) plateRef.current.opacity = shown;
      if (blockMaterialRef.current) blockMaterialRef.current.opacity = 1;

      const interactive = opacity > CONFIG.detailsLink.INTERACT_MIN_OPACITY;
      if (interactive === interactiveRef.current) return;
      interactiveRef.current = interactive;
      syncHoverRef.current();
    },
  );

  // The curl is a vertex shader, invisible to the raycaster. Sending the row's
  // own edges through it and spanning the chord between them keeps the hit area
  // under the glyphs, and keeps consecutive rows tiling: a rigid rotation about
  // each centre opened a crack on every boundary, and the hover fell through it.
  useFrame(() => {
    const curl = hitCurlRef.current;
    const group = groupRef.current;
    if (!curl || !group) return;

    const baseY = hitCenterYRef.current;
    const half = hitHalfHeightRef.current;
    const groupWorldY = group.getWorldPosition(curlWorld.current).y;
    const topWorldY = groupWorldY + baseY + half;
    const bottomWorldY = groupWorldY + baseY - half;
    const top = curlRowTransform(topWorldY);
    const bottom = curlRowTransform(bottomWorldY);

    const topY = topWorldY + top.dy;
    const bottomY = bottomWorldY + bottom.dy;
    const spanY = topY - bottomY;
    const spanZ = top.dz - bottom.dz;
    const span = Math.hypot(spanY, spanZ);

    curl.position.y = (topY + bottomY) / 2 - groupWorldY;
    curl.position.z = (top.dz + bottom.dz) / 2;
    curl.rotation.x = Math.atan2(spanZ, spanY);
    curl.scale.y = half > 1e-6 && span > 1e-6 ? span / (half * 2) : 1;
  });

  const [textDimensions, setTextDimensions] = useState({
    width: 0,
    minY: 0,
    maxY: 0,
  });
  const [arrowTex, setArrowTex] = useState<THREE.Texture | null>(arrowTexture);
  const [revealBounds, setRevealBounds] = useState<TextBounds | null>(null);

  const handleHalfway = useCallback(() => {
    revealedRef.current = true;
    plateShownRef.current = true;
  }, [revealedRef]);

  useEffect(() => {
    if (arrowTexture) return;
    let cancelled = false;
    loadArrowTexture().then((texture) => {
      if (!cancelled) setArrowTex(texture);
    });
    return () => {
      cancelled = true;
    };
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

  const inkShader = useMemo(
    () => curlFadePowerShader(CONFIG.detailsLink.BUTTON_TEXT_FADE_POWER),
    [],
  );

  // The twin is only as tall as its own line, so consecutive rows leave a
  // strip of nothing between them — enough to drop the hover and bounce the
  // model back mid-way to the next project. Half the leftover pitch above and
  // below makes the rows tile exactly, without touching the layout.
  const hitPadEm = rowPitchEm
    ? Math.max((rowPitchEm - lineHeight) / 2, 0)
    : 0;

  const arrowSize = calculatedFontSize * CONFIG.detailsLink.ARROW_SIZE_MULT;
  const arrowGap = calculatedFontSize * CONFIG.detailsLink.ARROW_GAP_MULT;
  const arrowX = textDimensions.width + arrowGap + arrowSize / 2;
  const arrowY =
    -calculatedFontSize * 0.15 - 1.5 * (calculatedFontSize / pixelFontSize);

  const finePointer = () => FINE_POINTER_QUERY.matches;
  const reducedMotion = () => REDUCED_MOTION_QUERY.matches;

  const syncHover = () => {
    const wanted =
      (hoverSources.current.twin || hoverSources.current.mesh) &&
      interactiveRef.current;
    if (wanted === hoveredRef.current) return;
    hoveredRef.current = wanted;
    if (wanted) handleEnter();
    else handleLeave();
  };

  const setHoverSource = (source: "twin" | "mesh", active: boolean) => {
    if (!finePointer()) return;
    hoverSources.current[source] = active;
    syncHover();
  };

  const handleEnter = () => {
    document.body.style.cursor = "pointer";
    if (previewImage) setHoveredPreview(previewImage);
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
  };

  const handleLeave = () => {
    document.body.style.cursor = "auto";
    if (previewImage) clearHoveredPreview(previewImage);
    if (arrowMeshRef.current) {
      gsap.to(arrowMeshRef.current.position, {
        x: arrowX,
        y: arrowY,
        duration: CONFIG.detailsLink.ARROW_DURATION,
        ease: "power2.out",
        overwrite: true,
      });
    }
  };

  useEffect(() => {
    syncHoverRef.current = syncHover;
  });

  const padX = calculatedFontSize * CONFIG.detailsLink.BUTTON_PAD_X_EM;
  const padY = calculatedFontSize * CONFIG.detailsLink.BUTTON_PAD_Y_EM;
  const contentMaxX = arrowGap + arrowSize;

  const buttonBounds = useMemo(
    () =>
      revealBounds && {
        minX: revealBounds.minX - padX,
        maxX: revealBounds.maxX + contentMaxX + padX,
        minY: revealBounds.minY - padY,
        maxY: revealBounds.maxY + padY,
      },
    [revealBounds, contentMaxX, padX, padY],
  );

  const buttonRadius =
    (CONFIG.detailsReveal.BLOCK_RADIUS_PX * calculatedFontSize) / pixelFontSize;

  const hitPad = hitPadEm * calculatedFontSize;
  const hit = revealBounds &&
    buttonBounds && {
      width: buttonBounds.maxX - buttonBounds.minX,
      height: revealBounds.maxY - revealBounds.minY + hitPad * 2,
      centerX: (buttonBounds.minX + buttonBounds.maxX) / 2,
      centerY: (revealBounds.minY + revealBounds.maxY) / 2,
    };
  const hitCenterY = hit ? hit.centerY : 0;
  const hitHalfHeight = hit ? hit.height / 2 : 0;
  useEffect(() => {
    hitCenterYRef.current = hitCenterY;
    hitHalfHeightRef.current = hitHalfHeight;
  }, [hitCenterY, hitHalfHeight]);

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
          onBeforeCompile={inkShader}
        />
      </Text>

      {textDimensions.width > 0 && arrowTex && (
        <mesh ref={arrowMeshRef} position={[arrowX, arrowY, 0]}>
          <planeGeometry
            args={[arrowSize, arrowSize, 1, CONFIG.detailsCurl.ARROW_SEGMENTS]}
          />
          <meshBasicMaterial
            ref={arrowRef}
            map={arrowTex}
            color={color}
            transparent
            opacity={0}
            onBeforeCompile={inkShader}
          />
        </mesh>
      )}

      {buttonBounds && (
        <>
          <LinkButtonPlate
            bounds={buttonBounds}
            color={revealColor}
            cornerRadius={buttonRadius}
            materialRef={plateRef}
          />

          <CurlRevealBlock
            bounds={buttonBounds}
            color={revealColor}
            cornerRadius={buttonRadius}
            direction={direction}
            delay={delay}
            duration={CONFIG.copy.DURATION}
            startTrigger={startTrigger}
            materialRef={blockMaterialRef}
            onHalfway={handleHalfway}
            segments={CONFIG.detailsReveal.BUTTON_SEGMENTS}
            renderOrder={1}
          />
        </>
      )}

      {hit && (
        <group ref={hitCurlRef} position={[0, hit.centerY, 0]}>
          <mesh
            ref={hitMeshRef}
            position={[hit.centerX, 0, 0]}
            onPointerOver={() => setHoverSource("mesh", true)}
            onPointerOut={() => setHoverSource("mesh", false)}
            onClick={(event) => {
              if (!interactiveRef.current) return;
              event.stopPropagation();
              twinRef.current?.click();
            }}
          >
            <planeGeometry args={[hit.width, hit.height]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>
      )}

      <Html as="div" className={`${xAlignClass} ${yAlignClass}`}>
        <a
          ref={twinRef}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onMouseEnter={() => setHoverSource("twin", true)}
          onMouseLeave={() => setHoverSource("twin", false)}
          className={`whitespace-nowrap m-0 p-0 pointer-events-auto font-karla ${fontWeightClass} leading-none block relative no-underline outline-none`}
          style={{
            fontSize: `${pixelFontSize}px`,
            letterSpacing: `${letterSpacing + htmlLetterSpacingOffset}em`,
          }}
        >
          {hitPadEm > 0 && (
            <span
              aria-hidden
              className="absolute inset-x-0 block"
              style={{ top: `${-hitPadEm}em`, bottom: `${-hitPadEm}em` }}
            />
          )}
          <p
            className="m-0 p-0"
            style={{ color: "transparent" }}
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
