import { gsap } from "gsap";
import { CONFIG } from "@/config/constants";

const C = CONFIG.projectOrbit;
const ease = gsap.parseEase(C.ENTRANCE_EASE);
const circumference = Math.PI * 2;
const direction = Math.sign(C.SPEED) || -1;
const halfCard = circumference / C.COUNT * (1 - C.GAP) / 2;

export function projectOrbitEntranceAt(elapsed: number) {
  const time = Math.max(0, elapsed);
  const travel = circumference * ease(Math.min(1, time / C.ENTRANCE_DURATION)) + Math.abs(C.SPEED) * time;
  return {
    phase: C.ENTRANCE_ORIGIN - direction * halfCard + direction * travel,
    reveal: Math.min(1, travel / circumference),
  };
}
