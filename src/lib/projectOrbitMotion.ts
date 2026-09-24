import { CONFIG } from "@/config/constants";

const C = CONFIG.projectOrbit;

export type OrbitDragSample = { time: number; phase: number };

export function orbitReleaseVelocity(samples: OrbitDragSample[], now: number) {
  const last = samples.at(-1);
  if (!last || now - last.time > C.DRAG.RELEASE_TIMEOUT_MS) return 0;
  const first = samples.find((sample) => sample.time >= last.time - C.DRAG.VELOCITY_WINDOW_MS);
  if (!first || last.time <= first.time) return 0;
  const velocity = (last.phase - first.phase) * 1000 / (last.time - first.time);
  return Math.max(-C.DRAG.MAX_SPEED, Math.min(C.DRAG.MAX_SPEED, velocity));
}

export function orbitMomentumStep(velocity: number, delta: number, friction: number) {
  if (delta <= 0 || delta > C.IDLE_MAX_FRAME_DELTA) return { velocity, angle: 0 };
  const decay = Math.exp(-friction * delta);
  const difference = velocity - C.SPEED;
  return {
    velocity: C.SPEED + difference * decay,
    angle: C.SPEED * delta + difference * (1 - decay) / friction,
  };
}
