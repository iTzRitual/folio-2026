"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CONFIG } from "@/config/constants";

interface ProjectHoverValue {
  /** Preview texture of the project currently under the cursor, or null. */
  hoveredPreview: string | null;
  setHoveredPreview: (src: string) => void;
  clearHoveredPreview: (src: string) => void;
}

const ProjectHoverContext = createContext<ProjectHoverValue | null>(null);

export function ProjectHoverProvider({ children }: { children: ReactNode }) {
  const [hoveredPreview, setPreview] = useState<string | null>(null);
  const pendingClear = useRef<number | null>(null);

  const cancelPendingClear = () => {
    if (pendingClear.current === null) return;
    clearTimeout(pendingClear.current);
    pendingClear.current = null;
  };

  const setHoveredPreview = useCallback((src: string) => {
    cancelPendingClear();
    setPreview(src);
  }, []);

  // Leaving a row fires before entering the next one, so clearing immediately
  // would tear a hole in the hover on every boundary. Hold the preview across
  // the handover and only drop it once the pointer has really left the list.
  const clearHoveredPreview = useCallback((src: string) => {
    cancelPendingClear();
    pendingClear.current = window.setTimeout(() => {
      pendingClear.current = null;
      setPreview((current) => (current === src ? null : current));
    }, CONFIG.projectPreview.HOVER_GRACE_MS);
  }, []);

  useEffect(() => cancelPendingClear, []);

  const value = useMemo(
    () => ({ hoveredPreview, setHoveredPreview, clearHoveredPreview }),
    [hoveredPreview, setHoveredPreview, clearHoveredPreview],
  );

  return (
    <ProjectHoverContext.Provider value={value}>
      {children}
    </ProjectHoverContext.Provider>
  );
}

export function useProjectHover() {
  const context = useContext(ProjectHoverContext);
  if (!context) {
    throw new Error("useProjectHover must be used inside ProjectHoverProvider");
  }
  return context;
}
