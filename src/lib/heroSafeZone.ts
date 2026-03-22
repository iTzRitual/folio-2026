const TARGET_ASPECT_RATIO = 16 / 9;

const BASE_MARGIN_X_HEIGHT_RATIO = 60 / 1080;
const BASE_MARGIN_Y_HEIGHT_RATIO = 230 / 1080;

interface HeroSafeZoneInput {
  viewportWidth: number;
  viewportHeight: number;
}

interface HeroSafeZoneOutput {
  marginX: number;
  marginY: number;
  extraMarginX: number;
}

export function calculateHeroSafeZone({
  viewportWidth,
  viewportHeight,
}: HeroSafeZoneInput): HeroSafeZoneOutput {
  const baseMarginX = viewportHeight * BASE_MARGIN_X_HEIGHT_RATIO;
  const baseMarginY = viewportHeight * BASE_MARGIN_Y_HEIGHT_RATIO;

  const currentAspectRatio = viewportWidth / viewportHeight;

  let extraMarginX = 0;
  if (currentAspectRatio > TARGET_ASPECT_RATIO) {
    const safeWidth = viewportHeight * TARGET_ASPECT_RATIO;
    extraMarginX = (viewportWidth - safeWidth) / 2;
  }

  return {
    marginX: baseMarginX + extraMarginX,
    marginY: baseMarginY,
    extraMarginX,
  };
}
