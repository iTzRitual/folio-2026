import { Text, Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Copy } from "../Copy";
import { useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

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

  const targetScale = 0.75;
  const HINT_SCROLL_HIDE_EPSILON = 0.0005;
  const HINT_SCROLL_SHOW_EPSILON = 0.0001;
  const STACKED_FADE_START = 0.12;

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

    const delay = isFirstRun.current ? 2.5 : 0;
    const duration = isFirstRun.current ? 1.5 : 0;
    const fadeDuration = isFirstRun.current ? 1.2 : 0;
    const fadePosition = isFirstRun.current ? 0.8 : 0;

    const tl = gsap.timeline({
      delay: delay,
      onStart: () => {
        isFirstRun.current = false;
      },
    });
    introTimelineRef.current = tl;

    const targetX =
      -viewportWidth / 2 + marginX + (textWidth3D * targetScale) / 2;

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
  }, [startTrigger, textWidth3D, viewportWidth, marginX]);

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
      -viewportWidth / 2 + marginX + (textWidth3D * targetScale) / 2;

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
      stackedGroupRef.current.position.x =
        viewportWidth * 0.08 * (1 - stackedProgress);
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
          anchorX="center"
          anchorY="top"
          fontSize={calculatedFontSize}
          font="fonts/Aeonik-Black.otf"
          lineHeight={1}
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
            color="white"
          />
        </Text>

        <Html as="div" className="m-0 p-0 pointer-events-auto">
          <div className="flex -translate-x-1/2">
            <div
              ref={htmlDivRef}
              className="whitespace-nowrap text-red-500/0 font-aeonik font-black leading-none origin-top"
              style={{ fontSize: `${pixelFontSize}px` }}
            >
              <Copy
                delay={0}
                startTrigger={startTrigger}
                onReveal={() => {
                  if (materialRef.current) materialRef.current.opacity = 1;
                }}
              >
                <h1 className="selection:bg-[#E2E2E2] selection:text-[#1D1D1D] m-0">
                  {children}
                </h1>
              </Copy>
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
          anchorX="right"
          anchorY="middle"
          fontSize={calculatedFontSize * 0.15}
          font="fonts/Aeonik-Light.otf"
          lineHeight={1}
        >
          ( Scroll to explore CV )
          <meshBasicMaterial
            ref={scrollTextRef}
            transparent
            opacity={0}
            color="#A0A0A0"
          />
        </Text>

        <group ref={stackedGroupRef} position={[viewportWidth * 0.08, 0, 0]}>
          <Text
            anchorX="right"
            anchorY="bottom"
            fontSize={stackedFontSize}
            font="fonts/Aeonik-Light.otf"
            lineHeight={1}
            color="#BEBEBE"
            position={[0, stackedFontSize * 0.1, 0]}
          >
            Software Engineer
            <meshBasicMaterial
              ref={stackedTopRef}
              transparent
              opacity={0}
              color="#BEBEBE"
            />
          </Text>

          <Text
            anchorX="right"
            anchorY="top"
            fontSize={stackedFontSize}
            font="fonts/Aeonik-Light.otf"
            lineHeight={1}
            color="#BEBEBE"
            position={[0, -stackedFontSize * 0.1, 0]}
          >
            Creative Technologist
            <meshBasicMaterial
              ref={stackedBottomRef}
              transparent
              opacity={0}
              color="#BEBEBE"
            />
          </Text>
        </group>
      </group>
    </group>
  );
}
