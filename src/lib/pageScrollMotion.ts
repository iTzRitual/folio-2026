import { CONFIG } from "@/config/constants";

const C = CONFIG.scrollTimeline;

export function pageScrollEasing(progress: number) {
  const time = Math.max(0, Math.min(1, progress)) * C.LENIS_DURATION;
  const tail = Math.max(0, Math.min(1, (time - C.LENIS_SETTLE_START) / (C.LENIS_DURATION - C.LENIS_SETTLE_START)));
  const settle = tail ** 3 * (tail * (tail * 6 - 15) + 10);
  return 1 - Math.exp(-C.LENIS_DECAY * time) * (1 - settle);
}
