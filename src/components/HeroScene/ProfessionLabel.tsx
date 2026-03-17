import { Text, Html } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useMemo } from "react";
import { Copy } from "../Copy";
import { useRef } from "react";
import * as THREE from "three";

interface ProfessionLabelProps {
  children: React.ReactNode;
  position: [number, number, number];
  align: "left" | "right";
  verticalPos: "above" | "below";
  direction?: "leftToRight" | "rightToLeft";
}

export function ProfessionLabel({
  children,
  position,
  align,
  verticalPos,
  direction,
}: ProfessionLabelProps) {
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const { size, viewport } = useThree();

  const pxTo3DWidth = viewport.width / size.width;
  const pxTo3DHeight = viewport.height / size.height;

  const marginX = 60 * pxTo3DWidth;
  const availableWidth = viewport.width - 2 * marginX;
  const fontSize = availableWidth * 0.02;

  const pixelFontSize = fontSize / pxTo3DWidth;

  const isLeft = align === "left";
  const anchorX = isLeft ? "left" : "right";
  const anchorY = verticalPos === "above" ? "bottom" : "top";

  const paddingY = 8 * pxTo3DHeight;
  const finalY =
    verticalPos === "above" ? position[1] + paddingY : position[1] - paddingY;

  const lineThickness = 1 * pxTo3DHeight;
  const lineWidth = viewport.width * 0.9;

  const lineX = isLeft
    ? -viewport.width / 2 + lineWidth / 2
    : viewport.width / 2 - lineWidth / 2;

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color("white") },
        uIsLeft: { value: isLeft ? 1.0 : 0.0 },
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
        
        void main() {
          float alpha = uIsLeft > 0.5 ? (1.0 - vUv.x) : vUv.x;
          gl_FragColor = vec4(uColor, alpha * 0.4);
        }
      `,
      transparent: true,
      depthWrite: false,
    });
  }, [isLeft]);

  return (
    <group>
      <group position={[position[0], finalY, position[2]]}>
        <Text
          anchorX={anchorX}
          anchorY={anchorY}
          fontSize={fontSize}
          lineHeight={1}
          font="fonts/Aeonik-Light.otf"
        >
          {children}
          <meshBasicMaterial
            ref={materialRef}
            transparent
            opacity={0}
            color="#BEBEBE"
          />
        </Text>

        <Html
          as="div"
          className={`
            pointer-events-auto whitespace-nowrap m-0 p-0 text-red-500/0 font-aeonik font-light leading-none
            ${isLeft ? "left-0" : "-translate-x-full"} 
            ${verticalPos === "above" ? "-translate-y-full" : "top-0"}
          `}
          style={{
            fontSize: `${pixelFontSize}px`,
          }}
        >
          <Copy
            delay={0.4}
            direction={direction}
            blockColor="#BEBEBE"
            onReveal={() => {
              if (materialRef.current) materialRef.current.opacity = 1;
            }}
          >
            <p>{children}</p>
          </Copy>
        </Html>
      </group>

      <mesh position={[lineX, position[1], position[2]]}>
        <planeGeometry args={[lineWidth, lineThickness]} />
        <primitive object={shaderMaterial} attach="material" />
      </mesh>
    </group>
  );
}
