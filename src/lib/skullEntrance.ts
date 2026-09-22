import { CONFIG } from "@/config/constants";

export function createSkullEntranceMotion() {
  let previousScale: number | null = null;
  return {
    sample(scale: number, delta: number, active: boolean) {
      const previous = previousScale;
      previousScale = Number.isFinite(scale) ? scale : null;
      if (!active || previous === null || !Number.isFinite(scale) || !Number.isFinite(delta)
        || delta <= 0 || delta > CONFIG.model.FRAGMENTS.ENTRANCE_MAX_FRAME_DELTA) return 0;
      return Math.min(CONFIG.model.FRAGMENTS.ENTRANCE_MAX_SCALE_SPEED, Math.max(0, (scale - previous) / delta));
    },
  };
}
