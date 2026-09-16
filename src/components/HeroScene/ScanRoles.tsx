import { Html, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useCallback, useRef } from "react";
import { Group, MathUtils, MeshBasicMaterial } from "three";
import { CONFIG, FONTS } from "@/config/constants";
import { heroContent } from "@/data/content";
import { useHeroLayout } from "@/context/HeroLayoutContext";
import { useHeroTransition } from "@/context/HeroTransitionContext";
import { useAnimationContext } from "@/context/AnimationContext";
import { useSweptColor } from "@/context/ThemeContext";
import { useFontsReady } from "@/hooks/useFontsReady";
import { measureTextWidth } from "@/lib/textMetrics";
import { caseStudyStage } from "@/lib/caseStudyStage";

function Role({ index, settledY }: { index: number; settledY: number }) {
  const { leftX, rightX, viewport, pxTo3DWidth, pxTo3DHeight } = useHeroLayout();
  const { progressRef } = useHeroTransition();
  const { startTrigger } = useAnimationContext();
  const fontsReady = useFontsReady();
  const group = useRef<Group>(null);
  const material = useRef<MeshBasicMaterial>(null);
  const ruleMaterial = useRef<MeshBasicMaterial>(null);
  const twin = useRef<HTMLDivElement>(null);
  const role = heroContent.professions[index];
  const pixels = CONFIG.scan.NARROW_ROLE_PX;
  const textWidth = measureTextWidth(role, pixels, 0, fontsReady) * pxTo3DWidth;
  const initialX = index === 0 ? leftX : rightX - textWidth;
  const initialY = viewport.height * (index === 0 ? CONFIG.scan.NARROW_ROLE_TOP : CONFIG.scan.NARROW_ROLE_BOTTOM);
  const color = useSweptColor("textStacked", group, useCallback((hex: string) => {
    material.current?.color.set(hex);
    ruleMaterial.current?.color.set(hex);
  }, []));
  useFrame(() => {
    const progress = MathUtils.smoothstep(progressRef.current, CONFIG.heroLayout.NARROW_TITLE_TRANSITION_START, CONFIG.heroLayout.NARROW_TITLE_TRANSITION_END);
    const opacity = startTrigger ? 1 - caseStudyStage.dim : 0;
    if (group.current) group.current.position.set(MathUtils.lerp(initialX, leftX, progress), MathUtils.lerp(initialY, settledY - index * CONFIG.heroLayout.NARROW_ROLE_ROW_PITCH_PX * pxTo3DHeight, progress), 0);
    if (material.current) material.current.opacity = opacity;
    if (ruleMaterial.current) ruleMaterial.current.opacity = opacity * (1 - progress) * 0.25;
    if (twin.current) twin.current.style.visibility = opacity > 0 ? "visible" : "hidden";
  });
  return <group ref={group} position={[initialX, initialY, 0]}>
    <Text font={FONTS.karlaLight} fontSize={pixels * pxTo3DHeight} anchorX="left" anchorY="middle" renderOrder={CONFIG.detailsCurl.ABOVE_EDGE_FADE_RENDER_ORDER}>
      {role}<meshBasicMaterial ref={material} color={color} transparent depthWrite={false} depthTest={false} />
    </Text>
    <mesh position={[textWidth / 2, (index === 0 ? -1 : 1) * pixels * pxTo3DHeight, 0]}>
      <planeGeometry args={[textWidth, pxTo3DHeight]} />
      <meshBasicMaterial ref={ruleMaterial} color={color} transparent depthWrite={false} />
    </mesh>
    <Html className="pointer-events-auto"><div ref={twin} className="font-karla font-light text-transparent whitespace-nowrap" style={{ fontSize: pixels, transform: "translateY(-50%)" }}>{role}</div></Html>
  </group>;
}

export function ScanRoles({ settledY }: { settledY: number }) {
  return <>{heroContent.professions.map((role, index) => <Role key={role} index={index} settledY={settledY} />)}</>;
}
