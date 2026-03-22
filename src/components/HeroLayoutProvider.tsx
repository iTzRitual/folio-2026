import { useThree } from "@react-three/fiber";
import { ReactNode, useMemo } from "react";
import {
  HeroLayoutContextProvider,
  HeroLayoutContextType,
} from "@/context/HeroLayoutContext";
import {
  AnimationContextProvider,
  AnimationContextType,
} from "@/context/AnimationContext";

interface HeroLayoutProviderProps {
  children: ReactNode;
  startAnimation: boolean;
}

export function HeroLayoutProvider({
  children,
  startAnimation,
}: HeroLayoutProviderProps) {
  const { size, viewport } = useThree();

  const layoutValue: HeroLayoutContextType = useMemo(() => {
    const pxTo3DWidth = viewport.width / size.width;
    const pxTo3DHeight = viewport.height / size.height;
    const marginX = 60 * pxTo3DWidth;
    const marginY = 210 * pxTo3DHeight;

    const leftX = -viewport.width / 2 + marginX;
    const rightX = viewport.width / 2 - marginX;

    const middleSpaceHeight = viewport.height - 2 * marginY;
    const frHeight = middleSpaceHeight / 3;

    const row3TopY = viewport.height / 2 - marginY - frHeight;
    const row3BottomY = -viewport.height / 2 + marginY + frHeight;

    const viewportMinDimension = Math.min(viewport.width, viewport.height);

    const responsiveScale = viewportMinDimension / 8;

    const grabAreaRadius = responsiveScale * 1.3;
    const stickyAreaRadius = responsiveScale * 1.75;

    return {
      size,
      viewport,
      pxTo3DWidth,
      pxTo3DHeight,
      marginX,
      marginY,
      leftX,
      rightX,
      row3TopY,
      row3BottomY,
      viewportMinDimension,
      responsiveScale,
      grabAreaRadius,
      stickyAreaRadius,
    };
  }, [viewport, size]);

  const animationValue: AnimationContextType = useMemo(
    () => ({
      startTrigger: startAnimation,
    }),
    [startAnimation],
  );

  return (
    <HeroLayoutContextProvider value={layoutValue}>
      <AnimationContextProvider value={animationValue}>
        {children}
      </AnimationContextProvider>
    </HeroLayoutContextProvider>
  );
}
