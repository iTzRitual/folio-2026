import { MathUtils } from "three";

export function scanProximity(x: number, y: number, halfWidth: number, halfHeight: number, falloff: number) {
  const distance = Math.hypot(
    Math.max(Math.abs(x) - halfWidth, 0),
    Math.max(Math.abs(y) - halfHeight, 0),
  );
  return 1 - MathUtils.smoothstep(distance, 0, falloff);
}
