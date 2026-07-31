import { Color, Vector2 } from "three";
import { CONFIG, THEMES } from "@/config/constants";

const { AXIS, SOFTNESS } = CONFIG.themeSweep;

const axisLength = Math.hypot(AXIS[0], AXIS[1]);
const NX = AXIS[0] / axisLength;
const NY = AXIS[1] / axisLength;

const cornerProjections = [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
].map(([x, y]) => x * NX + y * NY);
const D_MIN = Math.min(...cornerProjections);
const D_MAX = Math.max(...cornerProjections);

const outCubic = (t: number) => 1 - Math.pow(1 - t, 3);

const smoothstep = (edge0: number, edge1: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
};

/**
 * Position along the sweep axis, normalised so the corner the front starts from
 * reads 0 and the opposite corner reads 1. Takes screen uv, y up.
 */
export function sweepCoord(u: number, v: number) {
    return (u * NX + v * NY - D_MIN) / (D_MAX - D_MIN);
}

export function sweepFront(raw: number) {
    return -SOFTNESS + outCubic(raw) * (1 + 2 * SOFTNESS);
}

export function sweepProgress(front: number, coord: number) {
    return 1 - smoothstep(front - SOFTNESS, front + SOFTNESS, coord);
}

/**
 * One instance shared by every surface that paints the background colour per
 * pixel, so the plane and the edge fade can never disagree mid-sweep.
 */
export const sweepUniforms = {
    uSweepBefore: { value: new Color(THEMES.Dark.bg) },
    uSweepAfter: { value: new Color(THEMES.Dark.bg) },
    uSweepFront: { value: 1 + SOFTNESS },
    uSweepSoftness: { value: SOFTNESS },
    uSweepAxis: { value: new Vector2(NX, NY) },
    uSweepActive: { value: 0 },
};

export const SWEEP_GLSL = /* glsl */ `
uniform vec3 uSweepBefore;
uniform vec3 uSweepAfter;
uniform float uSweepFront;
uniform float uSweepSoftness;
uniform float uSweepActive;
uniform vec2 uSweepAxis;

vec3 themeSweptColor(vec2 screenUv) {
  float dMin = min(min(0.0, uSweepAxis.x), min(uSweepAxis.y, uSweepAxis.x + uSweepAxis.y));
  float dMax = max(max(0.0, uSweepAxis.x), max(uSweepAxis.y, uSweepAxis.x + uSweepAxis.y));
  float dn = (dot(screenUv, uSweepAxis) - dMin) / (dMax - dMin);
  float m = smoothstep(uSweepFront - uSweepSoftness, uSweepFront + uSweepSoftness, dn);
  return mix(uSweepBefore, mix(uSweepAfter, uSweepBefore, m), uSweepActive);
}
`;
