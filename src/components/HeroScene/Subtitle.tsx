import { Text, Html } from "@react-three/drei";
import { AnimatedRevealText } from "../AnimatedRevealText";
import { useCallback, useRef } from "react";
import * as THREE from "three";
import { CONFIG } from "../../config/constants";
import { useSweptColor } from "@/context/ThemeContext";
import type { OutlinedText } from "@/lib/troikaText";

interface SubtitleProps {
  children: React.ReactNode;
  startTrigger: boolean;
  y: number;
  calculatedFontSize: number;
  pixelFontSize: number;
  pixelMaxWidth?: number;
}

export function Subtitle({
  children,
  startTrigger,
  y,
  calculatedFontSize,
  pixelFontSize,
  pixelMaxWidth,
}: SubtitleProps) {
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const textRef = useRef<THREE.Mesh>(null);

  const color = useSweptColor(
    "textSecondary",
    textRef,
    useCallback((hex: string) => {
      materialRef.current?.color.set(hex);
      const text = textRef.current as OutlinedText | null;
      if (text) text.outlineColor = hex;
    }, []),
  );

  return (
    <group position={[0, y, 0]}>
      <Text
        ref={textRef}
        anchorX="center"
        anchorY="bottom"
        fontSize={calculatedFontSize}
        font="fonts/Karla-ExtraBold.ttf"
        lineHeight={1}
        outlineWidth={CONFIG.subtitle.OUTLINE_WIDTH}
        outlineColor={color}
        letterSpacing={CONFIG.subtitle.LETTER_SPACING}
      >
        {children}
        <meshBasicMaterial
          ref={materialRef}
          transparent
          opacity={0}
          color={color}
        />
      </Text>

      <Html
        as="div"
        className="-translate-x-1/2 -translate-y-full whitespace-nowrap text-center m-0 p-0 text-red-500/0 pointer-events-auto font-karla font-extrabold leading-none"
        style={{
          fontSize: `${pixelFontSize}px`,
          letterSpacing: `${CONFIG.subtitle.LETTER_SPACING}em`,
          width: pixelMaxWidth ? `${pixelMaxWidth}px` : undefined,
        }}
      >
        <AnimatedRevealText
          delay={CONFIG.subtitle.DELAY}
          blockColor="var(--text-secondary)"
          direction="rightToLeft"
          startTrigger={startTrigger}
          onReveal={() => {
            if (materialRef.current) materialRef.current.opacity = 1;
          }}
        >
          <p>
            {children}
          </p>
        </AnimatedRevealText>
      </Html>
    </group>
  );
}
