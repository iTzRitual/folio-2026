import { MathUtils } from "three";
import { CONFIG } from "@/config/constants";

export function heroTextOffsets(progress: number, height: number) {
  const p = MathUtils.clamp(progress, 0, 1);
  const subtitle = 1 - (1 - p) ** CONFIG.heroLayout.SUBTITLE_PROGRESS_POWER;
  return {
    title: p * height * CONFIG.heroLayout.TITLE_Y_MULTIPLIER,
    subtitle: subtitle * height * CONFIG.heroLayout.SUBTITLE_Y_MULTIPLIER,
    hero: p * height * CONFIG.heroLayout.HERO_Y_MULTIPLIER,
  };
}

export function heroModelSlot(layout: { viewport: { height: number }; marginY: number; titleY: number; size: { height: number } }, progress: number) {
  const { height } = layout.viewport;
  const offsets = heroTextOffsets(progress, height);
  return {
    top: (height / 2 - layout.marginY + offsets.subtitle) / height,
    bottom: (layout.titleY + offsets.title) / height,
    padding: CONFIG.heroAssembly.MODEL_GAP_PADDING_PX / layout.size.height,
  };
}

export function fitHeroModelSlot(slot: ReturnType<typeof heroModelSlot>, extent: number, targetScale: number) {
  const height = Math.max(0, slot.top - slot.bottom - slot.padding * 2);
  const fit = height * CONFIG.heroAssembly.MODEL_GAP_FILL / Math.max(extent, 0.0001);
  return { y: (slot.top + slot.bottom) / 2, scale: Math.min(targetScale, fit) };
}
