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
import { calculateHeroSafeZone } from "@/lib/heroSafeZone";
import { CONFIG } from "@/config/constants";

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

    const {
      marginX: marginXPx,
      marginY: marginYPx,
      extraMarginX: extraMarginXPx,
    } = calculateHeroSafeZone({
      viewportWidth: size.width,
      viewportHeight: size.height,
    });

    const marginX = marginXPx * pxTo3DWidth;
    const marginY = marginYPx * pxTo3DHeight;
    const extraMarginX = extraMarginXPx * pxTo3DWidth;

    const leftX = -viewport.width / 2 + marginX;
    const rightX = viewport.width / 2 - marginX;

    const middleSpaceHeight = viewport.height - 2 * marginY;
    const frHeight = middleSpaceHeight / 3;

    const row3TopY = viewport.height / 2 - marginY - frHeight;
    const row3BottomY = -viewport.height / 2 + marginY + frHeight;

    const titleFontSize =
      (viewport.width - 2 * marginX) * CONFIG.heroLayout.TITLE_FONT_SIZE;
    const titleY =
      -viewport.height / 2 +
      marginY +
      titleFontSize * CONFIG.heroLayout.TITLE_FONT_VISUAL_OFFSET;
    const titleSettledBottomY =
      titleY +
      viewport.height * CONFIG.heroLayout.TITLE_Y_MULTIPLIER -
      titleFontSize * CONFIG.title.TARGET_SCALE;

    const viewportMinDimension = Math.min(
      viewport.width - extraMarginX * 2,
      viewport.height,
    );
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
      titleFontSize,
      titleY,
      titleSettledBottomY,
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
