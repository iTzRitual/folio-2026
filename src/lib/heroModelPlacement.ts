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

export function followHeroModelSlot(slot: ReturnType<typeof heroModelSlot>, extent: number, currentY: number, currentScale: number, targetScale: number, delta: number, instant = false) {
  const height = Math.max(0, slot.top - slot.bottom - slot.padding * 2);
  const fit = height * CONFIG.heroAssembly.MODEL_GAP_FILL / Math.max(extent, 0.0001);
  const target = Math.min(targetScale, fit);
  const scale = Math.min(fit, instant ? target : MathUtils.damp(currentScale, target, CONFIG.heroAssembly.MODEL_FOLLOW_RESPONSE, delta));
  const center = (slot.top + slot.bottom) / 2;
  const halfExtent = extent * scale / 2;
  const min = slot.bottom + slot.padding + halfExtent;
  const max = slot.top - slot.padding - halfExtent;
  const y = instant ? center : MathUtils.damp(currentY, center, CONFIG.heroAssembly.MODEL_FOLLOW_RESPONSE, delta);
  return { y: min <= max ? MathUtils.clamp(y, min, max) : center, scale };
}
