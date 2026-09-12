"use client";

import { createContext, useContext } from "react";
import {
  DEBUG_DEFAULTS,
  type DebugSettings,
} from "@/config/debugSettings";

const DebugSettingsContext = createContext<DebugSettings>(DEBUG_DEFAULTS);

export function DebugSettingsBridge({
  value,
  children,
}: {
  value: DebugSettings;
  children: React.ReactNode;
}) {
  return (
    <DebugSettingsContext.Provider value={value}>
      {children}
    </DebugSettingsContext.Provider>
  );
}

export function useDebugSettings(): DebugSettings {
  return useContext(DebugSettingsContext);
}
