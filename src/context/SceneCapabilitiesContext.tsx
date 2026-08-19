"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useThree } from "@react-three/fiber";
import {
  calculateSceneLayoutCapabilities,
  type SceneInputMode,
  type SceneLayoutMode,
  type SceneQualityTier,
} from "@/lib/responsiveScene";

interface SceneCapabilities {
  layoutMode: SceneLayoutMode;
  compactHeight: boolean;
  inputMode: SceneInputMode;
  qualityTier: SceneQualityTier;
}

const SceneCapabilitiesContext = createContext<SceneCapabilities | null>(null);

export function SceneCapabilitiesProvider({
  children,
  inputMode,
  qualityTier,
}: {
  children: ReactNode;
  inputMode: SceneInputMode;
  qualityTier: SceneQualityTier;
}) {
  const { size } = useThree();
  const layout = useMemo(
    () => calculateSceneLayoutCapabilities(size.width, size.height),
    [size.width, size.height],
  );
  const value = useMemo(
    () => ({ ...layout, inputMode, qualityTier }),
    [layout, inputMode, qualityTier],
  );

  return (
    <SceneCapabilitiesContext.Provider value={value}>
      {children}
    </SceneCapabilitiesContext.Provider>
  );
}

export function useSceneCapabilities() {
  const context = useContext(SceneCapabilitiesContext);
  if (!context) {
    throw new Error(
      "useSceneCapabilities must be used inside SceneCapabilitiesProvider",
    );
  }
  return context;
}
