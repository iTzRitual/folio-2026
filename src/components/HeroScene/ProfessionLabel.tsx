import { Text, Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { AnimatedRevealText } from "../AnimatedRevealText";
import * as THREE from "three";
import { CONFIG } from "../../config/constants";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useTheme } from "@/context/ThemeContext";

interface ProfessionLabelProps {
  children: React.ReactNode;
  position: [number, number, number];
  align: "left" | "right";
  verticalPos: "above" | "below";
  direction?: "leftToRight" | "rightToLeft";
  lineDelay?: number;
  startTrigger: boolean;
  viewportWidth: number;
  fontSize: number;
  pixelFontSize: number;
  paddingY: number;
  lineThickness: number;
  lineWidth: number;
  scrollProgressRef: MutableRefObject<number>;
  exitStart: number;
  exitEnd: number;
  exitDistance: number;
}

export function ProfessionLabel({
  children,
  position,
  align,
  verticalPos,
  direction,
  lineDelay = CONFIG.professionLabel.LINE_DELAY,
  startTrigger,
  viewportWidth,
  fontSize,
  pixelFontSize,
  paddingY,
  lineThickness,
  lineWidth,
  scrollProgressRef,
  exitStart,
  exitEnd,
  exitDistance,
}: ProfessionLabelProps) {
  const textMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const lineMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const labelGroupRef = useRef<THREE.Group>(null);
  const lineMeshRef = useRef<THREE.Mesh>(null);
  const htmlOpacityRef = useRef<HTMLDivElement>(null);
  const textRevealedRef = useRef(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { palette } = useTheme();

  const elapsed = useRef(0);

  const isLeft = align === "left";
  const anchorX = isLeft ? "left" : "right";
  const anchorY = verticalPos === "above" ? "bottom" : "top";

  const finalY =
    verticalPos === "above" ? position[1] + paddingY : position[1] - paddingY;

  const lineX = isLeft
    ? -viewportWidth / 2 + lineWidth / 2
    : viewportWidth / 2 - lineWidth / 2;

  useFrame((_, delta) => {
    const clampedExitProgress = THREE.MathUtils.clamp(
      (scrollProgressRef.current - exitStart) / (exitEnd - exitStart),
      0,
      1,
    );
    const fadeOpacity = 1 - clampedExitProgress;
    const pushOffset = exitDistance * clampedExitProgress * (isLeft ? -1 : 1);

    if (labelGroupRef.current) {
      labelGroupRef.current.position.set(
        position[0] + pushOffset,
        finalY,
        position[2],
      );
    }

    if (lineMeshRef.current) {
      lineMeshRef.current.position.set(
        lineX + pushOffset,
        position[1],
        position[2],
      );
    }

    if (textMaterialRef.current) {
      textMaterialRef.current.opacity =
        (textRevealedRef.current ? 1 : 0) * fadeOpacity;
    }

    if (htmlOpacityRef.current) {
      htmlOpacityRef.current.style.opacity = String(fadeOpacity);
    }

    if (lineMaterialRef.current) {
      elapsed.current += delta;

      lineMaterialRef.current.uniforms.uOpacity.value = fadeOpacity;

      if (prefersReducedMotion) {
        lineMaterialRef.current.uniforms.uProgress.value = 1.0;
      } else if (elapsed.current >= lineDelay) {
        lineMaterialRef.current.uniforms.uProgress.value = THREE.MathUtils.lerp(
          lineMaterialRef.current.uniforms.uProgress.value,
          1.0,
          delta * 2.0,
        );
      }
    }
  });

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color() },
        uIsLeft: { value: isLeft ? 1.0 : 0.0 },
        uProgress: { value: 0.0 },
        uOpacity: { value: 1.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform vec3 uColor;
        uniform float uIsLeft;
        uniform float uProgress;
        uniform float uOpacity;
        
        void main() {
          float alpha = uIsLeft > 0.5 ? (1.0 - vUv.x) : vUv.x;
          
          float revealMask;
          if (uIsLeft > 0.5) {
            revealMask = step(vUv.x, uProgress);
          } else {
            revealMask = step(1.0 - uProgress, vUv.x);
          }

          gl_FragColor = vec4(uColor, alpha * ${CONFIG.professionLabel.ALPHA_MULTIPLIER} * revealMask * uOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
    });
  }, [isLeft]);

  useEffect(() => {
    shaderMaterial.uniforms.uColor.value.set(palette.textStacked);
  }, [shaderMaterial, palette.textStacked]);

  return (
    <group>
      <group position={[position[0], finalY, position[2]]} ref={labelGroupRef}>
        <Text
          anchorX={anchorX}
          anchorY={anchorY}
          fontSize={fontSize}
          lineHeight={1}
          font="fonts/Karla-Light.ttf"
          letterSpacing={CONFIG.professionLabel.LETTER_SPACING}
        >
          {children}
          <meshBasicMaterial
            ref={textMaterialRef}
            transparent
            opacity={0}
            color={palette.textStacked}
          />
        </Text>

        <Html
          as="div"
          className={`
            pointer-events-auto whitespace-nowrap m-0 p-0 text-red-500/0 font-karla font-light leading-none
            ${isLeft ? "left-0" : "-translate-x-full"} 
            ${verticalPos === "above" ? "-translate-y-full" : "top-0"}
          `}
          style={{
            fontSize: `${pixelFontSize}px`,
            letterSpacing: `${CONFIG.professionLabel.LETTER_SPACING}em`,
          }}
        >
          <div ref={htmlOpacityRef} style={{ opacity: 1 }}>
            <AnimatedRevealText
              delay={CONFIG.professionLabel.DELAY}
              direction={direction}
              blockColor="var(--text-stacked)"
              startTrigger={startTrigger}
              onReveal={() => {
                textRevealedRef.current = true;
              }}
            >
              <p>
                {children}
              </p>
            </AnimatedRevealText>
          </div>
        </Html>
      </group>

      <mesh position={[lineX, position[1], position[2]]} ref={lineMeshRef}>
        <planeGeometry args={[lineWidth, lineThickness]} />
        <primitive
          object={shaderMaterial}
          attach="material"
          ref={lineMaterialRef}
        />
      </mesh>
    </group>
  );
}
