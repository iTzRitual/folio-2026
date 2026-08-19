import { calculateHeroSafeZone } from "@/lib/heroSafeZone";
import { CONFIG } from "@/config/constants";

export type SceneLayoutMode = "wide" | "narrow";
export type SceneInputMode = "fine" | "coarse";
export type SceneQualityTier = "high" | "balanced" | "low";

export interface SceneLayoutCapabilities {
  layoutMode: SceneLayoutMode;
  compactHeight: boolean;
}

export function calculateSceneLayoutCapabilities(
  viewportWidth: number,
  viewportHeight: number,
): SceneLayoutCapabilities {
  const { marginX } = calculateHeroSafeZone({
    viewportWidth,
    viewportHeight,
  });
  const contentWidth = Math.max(0, viewportWidth - marginX * 2);
  const compactHeight =
    viewportHeight < CONFIG.responsiveScene.COMPACT_HEIGHT ||
    viewportHeight / Math.max(viewportWidth, 1) <
      CONFIG.responsiveScene.COMPACT_ASPECT;

  return {
    layoutMode:
      contentWidth >= CONFIG.responsiveScene.MIN_WIDE_CONTENT_WIDTH
        ? "wide"
        : "narrow",
    compactHeight,
  };
}
