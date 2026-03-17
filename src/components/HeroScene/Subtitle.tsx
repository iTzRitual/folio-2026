import { Text, Html } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { Copy } from "../Copy";
import { useRef } from "react";
import * as THREE from "three";

export function Subtitle({ children }: { children: React.ReactNode }) {
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const { size, viewport } = useThree();

  const pxTo3DWidth = viewport.width / size.width;
  const pxTo3DHeight = viewport.height / size.height;

  const marginX = 60 * pxTo3DWidth;
  const marginY = 210 * pxTo3DHeight;

  const y = viewport.height / 2 - marginY;

  const availableWidth = viewport.width - 2 * marginX;
  const calculatedFontSize = availableWidth * 0.0257;

  const pixelFontSize = calculatedFontSize / pxTo3DWidth;

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
          delay={0.3}
          blockColor="#BCBCBC"
          direction="rightToLeft"
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
