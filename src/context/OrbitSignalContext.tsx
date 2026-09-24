"use client";

import { createContext, useContext } from "react";
import { ORBIT_SIGNAL_DEFAULTS, type OrbitSignalConfig } from "@/config/orbitSignal";

export const OrbitSignalContext = createContext<{
  config: OrbitSignalConfig;
  previewTime: number | null;
}>({ config: ORBIT_SIGNAL_DEFAULTS, previewTime: null });

export function useOrbitSignal() {
  return useContext(OrbitSignalContext);
}
