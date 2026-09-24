"use client";

import { createContext, useContext } from "react";
import { ORBIT_SIGNAL_DEFAULTS, type OrbitSignalConfig } from "@/config/orbitSignal";

export const OrbitSignalContext = createContext<{
  config: OrbitSignalConfig;
}>({ config: ORBIT_SIGNAL_DEFAULTS });

export function useOrbitSignal() {
  return useContext(OrbitSignalContext);
}
