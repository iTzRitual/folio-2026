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

interface ProjectHoverActions {
  setHoveredPreview: (src: string) => void;
  clearHoveredPreview: (src: string) => void;
  /** Drops the hover outright, whichever link is holding it. */
  resetHoveredPreview: () => void;
}

/** Preview texture of the project currently under the cursor, or null. */
const ProjectHoverStateContext = createContext<string | null>(null);
const ProjectHoverActionsContext = createContext<ProjectHoverActions | null>(
  null,
);

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

  const resetHoveredPreview = useCallback(() => {
    cancelPendingClear();
    setPreview(null);
  }, []);

  useEffect(() => cancelPendingClear, []);

  // Kept apart from the hovered value so the links, which only ever write it,
  // are not re-rendered by their own hover. Each one carries an <Html> twin
  // whose React root re-renders along with it.
  const actions = useMemo(
    () => ({ setHoveredPreview, clearHoveredPreview, resetHoveredPreview }),
    [setHoveredPreview, clearHoveredPreview, resetHoveredPreview],
  );

  return (
    <ProjectHoverActionsContext.Provider value={actions}>
      <ProjectHoverStateContext.Provider value={hoveredPreview}>
        {children}
      </ProjectHoverStateContext.Provider>
    </ProjectHoverActionsContext.Provider>
  );
}

export function useProjectHoverActions() {
  const context = useContext(ProjectHoverActionsContext);
  if (!context) {
    throw new Error(
      "useProjectHoverActions must be used inside ProjectHoverProvider",
    );
  }
  return context;
}

export function useHoveredPreview() {
  return useContext(ProjectHoverStateContext);
}
