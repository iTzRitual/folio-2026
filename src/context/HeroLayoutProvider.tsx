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
import { useSceneCapabilities } from "@/context/SceneCapabilitiesContext";

interface HeroLayoutProviderProps {
  children: ReactNode;
  startAnimation: boolean;
}

export function HeroLayoutProvider({
  children,
  startAnimation,
}: HeroLayoutProviderProps) {
  const { size, viewport } = useThree();
  const { layoutMode, compactHeight } = useSceneCapabilities();

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

    const contentWidth = viewport.width - 2 * marginX;
    const contentWidthPx = size.width - 2 * marginXPx;
    const narrowTitlePx = Math.min(
      Math.max(
        contentWidthPx * CONFIG.heroLayout.NARROW_TITLE_FONT_SIZE,
        compactHeight
          ? CONFIG.heroLayout.NARROW_TITLE_COMPACT_MIN_PX
          : CONFIG.heroLayout.NARROW_TITLE_MIN_PX,
      ),
      compactHeight
        ? CONFIG.heroLayout.NARROW_TITLE_COMPACT_MAX_PX
        : CONFIG.heroLayout.NARROW_TITLE_MAX_PX,
    );
    const titleFontSize =
      layoutMode === "narrow"
        ? narrowTitlePx * pxTo3DWidth
        : contentWidth * CONFIG.heroLayout.TITLE_FONT_SIZE;
    const settledTitlePx = Math.min(
      Math.max(
        narrowTitlePx * CONFIG.heroLayout.NARROW_SETTLED_TITLE_SCALE,
        CONFIG.heroLayout.NARROW_SETTLED_TITLE_MIN_PX,
      ),
      CONFIG.heroLayout.NARROW_SETTLED_TITLE_MAX_PX,
    );
    const titleSettledFontSize =
      layoutMode === "narrow"
        ? settledTitlePx * pxTo3DWidth
        : titleFontSize * CONFIG.title.TARGET_SCALE;
    const titleY =
      -viewport.height / 2 +
      marginY +
      titleFontSize * CONFIG.heroLayout.TITLE_FONT_VISUAL_OFFSET;
    const narrowStickyTitleTopPx = compactHeight
      ? CONFIG.heroLayout.NARROW_STICKY_TITLE_COMPACT_TOP_PX
      : CONFIG.heroLayout.NARROW_STICKY_TITLE_TOP_PX;
    const narrowStickyStackBottomPx =
      narrowStickyTitleTopPx +
      settledTitlePx +
      CONFIG.heroLayout.NARROW_ROLE_STICKY_GAP_PX +
      CONFIG.heroLayout.NARROW_ROLE_ROW_PITCH_PX * 2;
    const titleSettledBottomY =
      layoutMode === "narrow"
        ? viewport.height / 2 - narrowStickyStackBottomPx * pxTo3DHeight
        : titleY +
          viewport.height * CONFIG.heroLayout.TITLE_Y_MULTIPLIER -
          titleSettledFontSize;

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
      titleSettledFontSize,
      titleY,
      titleSettledBottomY,
      viewportMinDimension,
      responsiveScale,
      grabAreaRadius,
      stickyAreaRadius,
    };
  }, [viewport, size, layoutMode, compactHeight]);

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
