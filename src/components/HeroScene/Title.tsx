import { Text, Html } from "@react-three/drei";
import { Copy } from "../Copy";
import { useRef, useState } from "react";
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
}

export function Title({
  children,
  startTrigger,
  viewportWidth,
  marginX,
  y,
  calculatedFontSize,
  pixelFontSize,
}: TitleProps) {
  const groupRef = useRef<THREE.Group>(null);
  const textGroupRef = useRef<THREE.Group>(null);
  const htmlDivRef = useRef<HTMLDivElement>(null);
  const scrollTextRef = useRef<THREE.MeshBasicMaterial>(null);

  const isFirstRun = useRef(true);

  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  const [textWidth3D, setTextWidth3D] = useState(0);

  const targetScale = 0.75;

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
      },
      fadePosition,
    );
  }, [startTrigger, textWidth3D, viewportWidth, marginX]);

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
      </group>
    </group>
  );
}
