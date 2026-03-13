import { Text } from "@react-three/drei";
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

  return (
    <Text
      anchorX="center"
      anchorY="top"
      position={[0, y, 0]}
      fontSize={calculatedFontSize}
      font="fonts/Aeonik-Black.otf"
      lineHeight={1}
    >
      {children}
      <meshBasicMaterial color="white" />
    </Text>
  );
}
