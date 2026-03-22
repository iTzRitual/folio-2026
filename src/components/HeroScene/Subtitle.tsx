import { Text, Html } from "@react-three/drei";
import { Copy } from "../Copy";
import { useRef } from "react";
import * as THREE from "three";

interface SubtitleProps {
  children: React.ReactNode;
  startTrigger: boolean;
  y: number;
  calculatedFontSize: number;
  pixelFontSize: number;
}

export function Subtitle({
  children,
  startTrigger,
  y,
  calculatedFontSize,
  pixelFontSize,
}: SubtitleProps) {
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  return (
    <group position={[0, y, 0]}>
      <Text
        anchorX="center"
        anchorY="bottom"
        fontSize={calculatedFontSize}
        font="fonts/Aeonik-Black.otf"
        lineHeight={1}
      >
        {children}
        <meshBasicMaterial
          ref={materialRef}
          transparent
          opacity={0}
          color="#BCBCBC"
        />
      </Text>

      <Html
        as="div"
        className="-translate-x-1/2 -translate-y-full whitespace-nowrap m-0 p-0 text-red-500/0 pointer-events-auto font-aeonik font-black leading-none"
        style={{
          fontSize: `${pixelFontSize}px`,
        }}
      >
        <Copy
          delay={0.1}
          blockColor="#BCBCBC"
          direction="rightToLeft"
          startTrigger={startTrigger}
          onReveal={() => {
            if (materialRef.current) materialRef.current.opacity = 1;
          }}
        >
          <p className="selection:bg-[#BCBCBC] selection:text-[#1D1D1D]">
            {children}
          </p>
        </Copy>
      </Html>
    </group>
  );
}
