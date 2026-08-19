"use client";

import { Text } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { CONFIG, FONTS } from "@/config/constants";
import { useHeroLayout } from "@/context/HeroLayoutContext";
import { useHeroTransition } from "@/context/HeroTransitionContext";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useSweptColor } from "@/context/ThemeContext";
import { caseStudyStage } from "@/lib/caseStudyStage";

function createCurvedPlane(
  width: number,
  height: number,
  curveDepth: number,
): THREE.PlaneGeometry {
  const geometry = new THREE.PlaneGeometry(
    width,
    height,
    CONFIG.phase2.PLANE_SEGMENTS_X,
    CONFIG.phase2.PLANE_SEGMENTS_Y,
  );
  const positions = geometry.attributes.position;

  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index) / (width / 2);
    const y = positions.getY(index) / (height / 2);
    positions.setZ(index, curveDepth * (1 - x * x) * (1 - y * y));
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function SafariGlyph({
  text,
  position,
  fontSize,
}: {
  text: string;
  position: [number, number, number];
  fontSize: number;
}) {
  return (
    <Text
      position={position}
      font={FONTS.karlaExtraBold}
      fontSize={fontSize}
      color={CONFIG.phase2.BROWSER_ICON_COLOR}
      anchorX="center"
      anchorY="middle"
      raycast={() => null}
    >
      {text}
    </Text>
  );
}

function SafariChrome({
  width,
  contentHeight,
  chromeHeight,
}: {
  width: number;
  contentHeight: number;
  chromeHeight: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { revealProgressRef } = useHeroTransition();
  const barY = contentHeight / 2 + chromeHeight / 2;
  const controlHeight = Math.min(chromeHeight, width / 8);
  const radius = controlHeight * CONFIG.phase2.BROWSER_CONTROL_RADIUS_MULT;
  const sidePadding = controlHeight * CONFIG.phase2.BROWSER_SIDE_PADDING_MULT;
  const controlGap = controlHeight * CONFIG.phase2.BROWSER_CONTROL_GAP_MULT;
  const iconSize = controlHeight * CONFIG.phase2.BROWSER_ICON_FONT_MULT;
  const addressHeight = controlHeight * CONFIG.phase2.BROWSER_ADDRESS_HEIGHT_MULT;
  const addressWidth = Math.min(
    width * CONFIG.phase2.BROWSER_ADDRESS_WIDTH_MULT,
    Math.max(width * 0.18, width - sidePadding * 2 - controlHeight * 5),
  );
  const addressFontSize = controlHeight * CONFIG.phase2.BROWSER_ADDRESS_FONT_MULT;
  const leftControlX = -width / 2 + sidePadding;
  const leftIconX = leftControlX + radius * 2 + controlGap;
  const rightControlX = width / 2 - sidePadding;
  const rightIconGap = iconSize * 1.7;

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.visible =
      revealProgressRef.current >= CONFIG.phase2.BROWSER_REVEAL_START;
  });

  return (
    <group ref={groupRef} visible={false}>
      <mesh
        position={[0, barY, CONFIG.phase2.BROWSER_Z]}
        raycast={() => null}
      >
        <planeGeometry args={[width, chromeHeight]} />
        <meshBasicMaterial
          color={CONFIG.phase2.BROWSER_BAR_COLOR}
          toneMapped={false}
        />
      </mesh>

      {CONFIG.phase2.BROWSER_LIGHTS.map((color, index) => (
        <mesh
          key={color}
          position={[
            leftControlX + index * (radius * 2 + controlGap),
            barY,
            CONFIG.phase2.BROWSER_Z + 0.001,
          ]}
          raycast={() => null}
        >
          <circleGeometry args={[radius, 24]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      ))}

      <SafariGlyph
        text="‹"
        position={[leftIconX, barY, CONFIG.phase2.BROWSER_Z + 0.002]}
        fontSize={iconSize}
      />
      <SafariGlyph
        text="›"
        position={[leftIconX + iconSize * 1.25, barY, CONFIG.phase2.BROWSER_Z + 0.002]}
        fontSize={iconSize}
      />

      <mesh
        position={[0, barY, CONFIG.phase2.BROWSER_Z + 0.001]}
        raycast={() => null}
      >
        <planeGeometry args={[addressWidth, addressHeight]} />
        <meshBasicMaterial
          color={CONFIG.phase2.BROWSER_ADDRESS_COLOR}
          toneMapped={false}
        />
      </mesh>
      <Text
        position={[0, barY, CONFIG.phase2.BROWSER_Z + 0.002]}
        font={FONTS.karlaLight}
        fontSize={addressFontSize}
        color={CONFIG.phase2.BROWSER_ICON_COLOR}
        anchorX="center"
        anchorY="middle"
        raycast={() => null}
      >
        folio-2026
      </Text>

      <SafariGlyph
        text="↑"
        position={[rightControlX - rightIconGap * 2, barY, CONFIG.phase2.BROWSER_Z + 0.002]}
        fontSize={iconSize}
      />
      <SafariGlyph
        text="+"
        position={[rightControlX - rightIconGap, barY, CONFIG.phase2.BROWSER_Z + 0.002]}
        fontSize={iconSize}
      />
      <SafariGlyph
        text="▢"
        position={[rightControlX, barY, CONFIG.phase2.BROWSER_Z + 0.002]}
        fontSize={iconSize * 0.72}
      />
    </group>
  );
}

export function Phase2Surface({ children }: { children: ReactNode }) {
  const { viewport } = useHeroLayout();
  const { revealProgressRef } = useHeroTransition();
  const { camera } = useThree();
  const prefersReducedMotion = usePrefersReducedMotion();
  const pageGroupRef = useRef<THREE.Group>(null);
  const planeRef = useRef<THREE.Mesh>(null);
  const pageBackgroundMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const pageBackgroundColor = useSweptColor(
    "bg",
    pageGroupRef,
    (hex) => pageBackgroundMaterialRef.current?.color.set(hex),
  );

  const chromeHeight = viewport.height * CONFIG.phase2.BROWSER_CHROME_HEIGHT_MULT;
  const windowHeight = viewport.height + chromeHeight;
  const planeWidth = Math.max(
    viewport.width,
    windowHeight * CONFIG.phase2.PLANE_ASPECT,
  );
  const planeHeight = planeWidth / CONFIG.phase2.PLANE_ASPECT;
  const planeCurveDepth =
    Math.min(planeWidth, planeHeight) * CONFIG.phase2.PLANE_CURVE_DEPTH_MULT;
  const planeGeometry = useMemo(
    () => createCurvedPlane(planeWidth, planeHeight, planeCurveDepth),
    [planeCurveDepth, planeHeight, planeWidth],
  );

  useFrame(() => {
    const scrollReveal = THREE.MathUtils.clamp(revealProgressRef.current, 0, 1);
    const reveal = prefersReducedMotion
      ? scrollReveal > 0
        ? 1
        : 0
      : scrollReveal;
    const planeZ = CONFIG.phase2.PLANE_Z;
    const restZ = CONFIG.caseStudy.CAMERA_REST_Z;
    const perspective = camera as THREE.PerspectiveCamera;
    const restDistance = restZ - planeZ;
    const restHeight =
      2 *
      Math.tan(THREE.MathUtils.degToRad(perspective.fov) / 2) *
      restDistance;
    const restWidth = restHeight * perspective.aspect;
    const fit = Math.max(
      1,
      planeWidth / (restWidth * CONFIG.phase2.REVEAL_CAMERA_FILL),
      planeHeight / (restHeight * CONFIG.phase2.REVEAL_CAMERA_FILL),
    );
    const targetZ = planeZ + restDistance * fit;

    if (!caseStudyStage.open && caseStudyStage.progress < 0.001) {
      camera.position.set(
        0,
        0,
        THREE.MathUtils.lerp(restZ, targetZ, reveal),
      );
      camera.updateMatrixWorld();
    }

    if (planeRef.current) {
      planeRef.current.visible =
        reveal >= CONFIG.phase2.PLANE_REVEAL_START;
    }
  });

  return (
    <group>
      <mesh
        position={[0, 0, CONFIG.phase2.PAGE_BACKGROUND_Z]}
        raycast={() => null}
      >
        <planeGeometry args={[viewport.width, viewport.height]} />
        <meshBasicMaterial
          ref={pageBackgroundMaterialRef}
          color={pageBackgroundColor}
          toneMapped={false}
        />
      </mesh>

      <group ref={pageGroupRef}>{children}</group>

      <mesh
        ref={planeRef}
        geometry={planeGeometry}
        position={[0, chromeHeight / 2, CONFIG.phase2.PLANE_Z]}
        renderOrder={10}
        frustumCulled={false}
        visible={false}
        raycast={() => null}
      >
        <meshBasicMaterial
          color="#000000"
          toneMapped={false}
        />
      </mesh>

      <SafariChrome
        width={viewport.width}
        contentHeight={viewport.height}
        chromeHeight={chromeHeight}
      />
    </group>
  );
}
