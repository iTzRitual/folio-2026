import { MathUtils } from "three";
import { CONFIG } from "@/config/constants";

const C = CONFIG.heroAssembly;

export function heroAssemblyAt(progress: number, reducedMotion = false) {
  const p = MathUtils.clamp(progress, 0, 1);
  const fade = MathUtils.smoothstep(p, C.FADE_START, C.FADE_END);
  return {
    unfold: reducedMotion ? 0 : MathUtils.smoothstep(p, C.UNFOLD_START, C.UNFOLD_END),
    scatter: reducedMotion || p >= CONFIG.model.DETAILS_POPUP_START ? 0 : MathUtils.smoothstep(p, C.SCATTER_START, C.SCATTER_END),
    opacity: 1 - fade,
    dissolve: fade,
    scale: MathUtils.lerp(1, C.EXIT_SCALE, p),
    rise: reducedMotion ? 0 : p * C.UP_TRAVEL + MathUtils.smoothstep(p, C.EXIT_RISE_START, C.FADE_END) * C.EXIT_RISE,
    spin: reducedMotion ? 0 : (Math.sign(CONFIG.projectOrbit.SPEED) || -1) * Math.PI * 2 * C.SPIN_TURNS * p,
  };
}

export function orbitRibbonPoint(angle: number, curvature: number) {
  if (curvature < 0.0001) return { x: angle, z: 1 };
  return { x: Math.sin(angle * curvature) / curvature, z: 1 - 2 * Math.sin(angle * curvature / 2) ** 2 / curvature };
}

export function orbitRibbonCoordinates(x: number, z: number, curvature: number) {
  if (curvature < 0.0001) return { angle: x, depth: z - 1 };
  const curvedX = x * curvature;
  const curvedZ = 1 + (z - 1) * curvature;
  return { angle: Math.atan2(curvedX, curvedZ) / curvature, depth: (Math.hypot(curvedX, curvedZ) - 1) / curvature };
}
