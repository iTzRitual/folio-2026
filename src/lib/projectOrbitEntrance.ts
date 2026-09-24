import { CONFIG } from "@/config/constants";

const C = CONFIG.projectOrbit;
const circumference = Math.PI * 2;
const direction = Math.sign(C.SPEED) || -1;
const halfCard = circumference / C.COUNT * (1 - C.GAP) / 2;
const cruiseDuration = C.ENTRANCE_CRUISE_DURATION;
const brakeDuration = C.ENTRANCE_DURATION - cruiseDuration;
const cruiseSpeed = circumference * C.ENTRANCE_TURNS / (cruiseDuration + brakeDuration / 2);

export function projectOrbitEntranceAt(elapsed: number, cardArc = halfCard * 2) {
  const time = Math.max(0, elapsed);
  const brake = Math.min(1, Math.max(0, (time - cruiseDuration) / brakeDuration));
  const brakeTravel = brake - 2.5 * brake ** 4 + 3 * brake ** 5 - brake ** 6;
  const travel = cruiseSpeed * (Math.min(time, cruiseDuration) + brakeDuration * brakeTravel) + Math.abs(C.SPEED) * time;
  return {
    phase: C.ENTRANCE_ORIGIN - direction * cardArc / 2 + direction * travel,
    reveal: Math.min(1, travel / circumference),
  };
}
