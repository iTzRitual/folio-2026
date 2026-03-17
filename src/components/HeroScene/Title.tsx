import { Text, Html } from "@react-three/drei";
import { useThree } from "@react-three/fiber";

export function Title({ children }: { children: React.ReactNode }) {
  const { size, viewport } = useThree();

  const pxTo3DWidth = viewport.width / size.width;
  const pxTo3DHeight = viewport.height / size.height;

  const marginX = 60 * pxTo3DWidth;
  const marginY = 240 * pxTo3DHeight;

  const y = -viewport.height / 2 + marginY;

  const availableWidth = viewport.width - 2 * marginX;
  const calculatedFontSize = availableWidth * 0.125;

  const pixelFontSize = calculatedFontSize / pxTo3DWidth;

  return (
    <group position={[0, y, 0]}>
      <Text
        anchorX="center"
        anchorY="top"
        fontSize={calculatedFontSize}
        font="fonts/Aeonik-Black.otf"
        lineHeight={1}
      >
        {children}
        <meshBasicMaterial color="white" />
      </Text>

      <Html
        as="div"
        className="-translate-x-1/2 whitespace-nowrap m-0 p-0 text-red-500/50 pointer-events-auto font-aeonik font-black leading-none"
        style={{
          fontSize: `${pixelFontSize}px`,
        }}
      >
        {children}
      </Html>
    </group>
  );
}
