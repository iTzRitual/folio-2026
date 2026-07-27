"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface ProjectHoverValue {
  /** Preview texture of the project currently under the cursor, or null. */
  hoveredPreview: string | null;
  setHoveredPreview: (src: string) => void;
  clearHoveredPreview: (src: string) => void;
}

const ProjectHoverContext = createContext<ProjectHoverValue | null>(null);

export function ProjectHoverProvider({ children }: { children: ReactNode }) {
  const [hoveredPreview, setHoveredPreview] = useState<string | null>(null);

  // A link only clears its own preview: when the pointer slides straight from
  // one link to the next, the leave can land after the enter.
  const clearHoveredPreview = useCallback((src: string) => {
    setHoveredPreview((current) => (current === src ? null : current));
  }, []);

  const value = useMemo(
    () => ({ hoveredPreview, setHoveredPreview, clearHoveredPreview }),
    [hoveredPreview, clearHoveredPreview],
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
