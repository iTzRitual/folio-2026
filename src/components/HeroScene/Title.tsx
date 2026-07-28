import { Text, Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { AnimatedRevealText } from "../AnimatedRevealText";
import { useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { CONFIG, FONTS } from "../../config/constants";
import { useTheme } from "@/context/ThemeContext";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { IS_REPEAT_VISIT } from "@/lib/visitSession";

interface TitleProps {
  children: React.ReactNode;
  startTrigger: boolean;
  viewportWidth: number;
  marginX: number;
  y: number;
  calculatedFontSize: number;
  pixelFontSize: number;
  scrollProgressRef: MutableRefObject<number>;
  transitionStart: number;
  transitionEnd: number;
  stackedFontSize: number;
}

export function Title({
  children,
  startTrigger,
  viewportWidth,
  marginX,
  y,
  calculatedFontSize,
  pixelFontSize,
  scrollProgressRef,
  transitionStart,
  transitionEnd,
  stackedFontSize,
}: TitleProps) {
  const groupRef = useRef<THREE.Group>(null);
  const textGroupRef = useRef<THREE.Group>(null);
  const htmlDivRef = useRef<HTMLDivElement>(null);
  const scrollTextRef = useRef<THREE.MeshBasicMaterial>(null);
  const stackedGroupRef = useRef<THREE.Group>(null);
  const stackedTopRef = useRef<THREE.MeshBasicMaterial>(null);
  const stackedBottomRef = useRef<THREE.MeshBasicMaterial>(null);
  const introTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const hasUserScrolledRef = useRef(false);
  const compactAppliedRef = useRef(false);
  const hintVisibleRef = useRef(false);

  const isFirstRun = useRef(true);

  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  const [textWidth3D, setTextWidth3D] = useState(0);
  const [isScrollHintReady, setIsScrollHintReady] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { palette } = useTheme();

  const {
    TARGET_SCALE: targetScale,
    HINT_SCROLL_HIDE_EPSILON,
    HINT_SCROLL_SHOW_EPSILON,
    STACKED_FADE_START,
  } = CONFIG.title;

  const visualFontCorrectionX =
    calculatedFontSize * CONFIG.title.VISUAL_FONT_CORRECTION_X;

  useGSAP(() => {
    if (
      !startTrigger ||
      textWidth3D === 0 ||
      !textGroupRef.current ||
      !htmlDivRef.current ||
      !scrollTextRef.current
    ) {
      return;
    }

    if (prefersReducedMotion) {
      const reducedTargetX =
        -viewportWidth / 2 +
        marginX +
        (textWidth3D * targetScale) / 2 -
        visualFontCorrectionX;
      gsap.set(textGroupRef.current.position, { x: reducedTargetX });
      gsap.set(textGroupRef.current.scale, {
        x: targetScale,
        y: targetScale,
        z: targetScale,
      });
      gsap.set(htmlDivRef.current, { scale: targetScale });
      gsap.to(scrollTextRef.current, {
        opacity: 1,
        duration: 0.3,
        ease: "power2.out",
      });
      isFirstRun.current = false;
      compactAppliedRef.current = true;
      hintVisibleRef.current = true;
      setIsScrollHintReady(true);
      return;
    }

    const delay = isFirstRun.current
      ? IS_REPEAT_VISIT
        ? CONFIG.title.DELAY_REPEAT
        : CONFIG.title.DELAY_FIRST_RUN
      : 0;
    const duration = isFirstRun.current ? CONFIG.title.DURATION_FIRST_RUN : 0;
    const fadeDuration = isFirstRun.current
      ? CONFIG.title.FADE_DURATION_FIRST_RUN
      : 0;
    const fadePosition = isFirstRun.current
      ? CONFIG.title.FADE_POSITION_FIRST_RUN
      : 0;

    const tl = gsap.timeline({
      delay: delay,
      onStart: () => {
        isFirstRun.current = false;
      },
    });
    introTimelineRef.current = tl;

    const targetX =
      -viewportWidth / 2 +
      marginX +
      (textWidth3D * targetScale) / 2 -
      visualFontCorrectionX;

    tl.to(
      textGroupRef.current.position,
      {
        x: targetX,
        duration: duration,
        ease: "power3.inOut",
      },
      0,
    );

    tl.to(
      textGroupRef.current.scale,
      {
        x: targetScale,
        y: targetScale,
        z: targetScale,
        duration: duration,
        ease: "power3.inOut",
      },
      0,
    );

    tl.to(
      htmlDivRef.current,
      {
        scale: targetScale,
        duration: duration,
        ease: "power3.inOut",
      },
      0,
    );

    tl.to(
      scrollTextRef.current,
      {
        opacity: 1,
        duration: fadeDuration,
        ease: "power2.out",
        onComplete: () => {
          setIsScrollHintReady(true);
          hintVisibleRef.current = true;
        },
      },
      fadePosition,
    );

    return () => {
      if (introTimelineRef.current === tl) {
        introTimelineRef.current = null;
      }
      tl.kill();
    };
  }, [startTrigger, textWidth3D, viewportWidth, marginX, prefersReducedMotion]);

  useFrame(() => {
    const hasStartedScroll =
      scrollProgressRef.current >
      Math.max(HINT_SCROLL_HIDE_EPSILON, transitionStart * 0.5);

    const hasReturnedToTop =
      scrollProgressRef.current <= HINT_SCROLL_SHOW_EPSILON;

    if (hasStartedScroll) {
      hasUserScrolledRef.current = true;
    } else if (hasReturnedToTop) {
      hasUserScrolledRef.current = false;
    }

    const targetX =
      -viewportWidth / 2 +
      marginX +
      (textWidth3D * targetScale) / 2 -
      visualFontCorrectionX;

    if (
      hasUserScrolledRef.current &&
      !compactAppliedRef.current &&
      textWidth3D > 0 &&
      textGroupRef.current &&
      htmlDivRef.current
    ) {
      introTimelineRef.current?.kill();
      introTimelineRef.current = null;

      gsap.to(textGroupRef.current.position, {
        x: targetX,
        duration: 0.2,
        ease: "power2.out",
        overwrite: true,
      });
      gsap.to(textGroupRef.current.scale, {
        x: targetScale,
        y: targetScale,
        z: targetScale,
        duration: 0.2,
        ease: "power2.out",
        overwrite: true,
      });
      gsap.to(htmlDivRef.current, {
        scale: targetScale,
        duration: 0.2,
        ease: "power2.out",
        overwrite: true,
      });

      isFirstRun.current = false;
      compactAppliedRef.current = true;

      if (!isScrollHintReady) {
        setIsScrollHintReady(true);
      }

      if (scrollTextRef.current) {
        hintVisibleRef.current = false;
        gsap.set(scrollTextRef.current, { opacity: 0, overwrite: true });
      }
    }

    if (!isScrollHintReady) return;

    const range = transitionEnd - transitionStart;
    if (range <= 0) return;

    const progress = THREE.MathUtils.clamp(
      (scrollProgressRef.current - transitionStart) / range,
      0,
      1,
    );
    const stackedProgress = THREE.MathUtils.clamp(
      (progress - STACKED_FADE_START) / (1 - STACKED_FADE_START),
      0,
      1,
    );

    if (scrollTextRef.current) {
      const showHint = !hasUserScrolledRef.current && progress <= 0;

      if (hintVisibleRef.current !== showHint) {
        hintVisibleRef.current = showHint;
        gsap.to(scrollTextRef.current, {
          opacity: showHint ? 1 : 0,
          duration: showHint ? 1.2 : 0.25,
          ease: "power2.out",
          overwrite: true,
        });
      }
    }

    if (stackedGroupRef.current) {
      stackedGroupRef.current.position.x = prefersReducedMotion
        ? 0
        : viewportWidth * 0.08 * (1 - stackedProgress);
    }

    if (stackedTopRef.current) {
      stackedTopRef.current.opacity = stackedProgress;
    }

    if (stackedBottomRef.current) {
      stackedBottomRef.current.opacity = stackedProgress;
    }
  });

  return (
    <group position={[0, y, 0]} ref={groupRef}>
      <group ref={textGroupRef}>
        <Text
          renderOrder={CONFIG.detailsCurl.ABOVE_EDGE_FADE_RENDER_ORDER}
          anchorX="center"
          anchorY="top"
          fontSize={calculatedFontSize}
          font={FONTS.karlaExtraBold}
          lineHeight={1}
          outlineWidth={0.005}
          outlineColor={palette.textPrimary}
          letterSpacing={-0.03}
          onSync={(textMesh) => {
            textMesh.geometry.computeBoundingBox();
            const box = textMesh.geometry.boundingBox;
            if (box) {
              const width = box.max.x - box.min.x;
              if (Math.abs(width - textWidth3D) > 0.1) setTextWidth3D(width);
            }
          }}
        >
          {children}
          <meshBasicMaterial
            ref={materialRef}
            transparent
            opacity={0}
            color={palette.textPrimary}
          />
        </Text>

        <Html as="div" className="m-0 p-0 pointer-events-auto">
          <div className="flex -translate-x-1/2">
            <div
              ref={htmlDivRef}
              className="whitespace-nowrap text-red-500/0 font-karla font-extrabold leading-none origin-top"
              style={{
                fontSize: `${pixelFontSize}px`,
                letterSpacing: `${-0.03}em`,
              }}
            >
              <AnimatedRevealText
                delay={0}
                startTrigger={startTrigger}
                onReveal={() => {
                  if (materialRef.current) materialRef.current.opacity = 1;
                }}
              >
                <h1 className="m-0">
                  {children}
                </h1>
              </AnimatedRevealText>
            </div>
          </div>
        </Html>
      </group>

      <group
        position={[
          viewportWidth / 2 - marginX,
          -(calculatedFontSize * targetScale) / 2,
          0,
        ]}
      >
        <Text
          renderOrder={CONFIG.detailsCurl.ABOVE_EDGE_FADE_RENDER_ORDER}
          anchorX="right"
          anchorY="middle"
          fontSize={calculatedFontSize * 0.15}
          font={FONTS.karlaLight}
          lineHeight={1}
          letterSpacing={-0.02}
        >
          ( Scroll to explore CV )
          <meshBasicMaterial
            ref={scrollTextRef}
            transparent
            opacity={0}
            color={palette.textHint}
          />
        </Text>

        <group ref={stackedGroupRef} position={[viewportWidth * 0.08, 0, 0]}>
          <Text
            renderOrder={CONFIG.detailsCurl.ABOVE_EDGE_FADE_RENDER_ORDER}
            anchorX="right"
            anchorY="bottom"
            fontSize={stackedFontSize}
            font={FONTS.karlaLight}
            lineHeight={1}
            letterSpacing={-0.02}
            color={palette.textStacked}
            position={[0, stackedFontSize * 0.1, 0]}
          >
            Frontend Engineer
            <meshBasicMaterial
              ref={stackedTopRef}
              transparent
              opacity={0}
              color={palette.textStacked}
            />
          </Text>

          <Text
            renderOrder={CONFIG.detailsCurl.ABOVE_EDGE_FADE_RENDER_ORDER}
            anchorX="right"
            anchorY="top"
            fontSize={stackedFontSize}
            font={FONTS.karlaLight}
            lineHeight={1}
            letterSpacing={-0.02}
            color={palette.textStacked}
            position={[0, -stackedFontSize * 0.1, 0]}
          >
            Creative Technologist
            <meshBasicMaterial
              ref={stackedBottomRef}
              transparent
              opacity={0}
              color={palette.textStacked}
            />
          </Text>
        </group>
      </group>
    </group>
  );
}
