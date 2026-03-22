import { createContext, useContext, ReactNode } from "react";

export interface ScrollSections {
  heroHoldEnd: number;
  heroExitEnd: number;
  detailsEnterEnd: number;
}

export interface ScrollTimelineContextType {
  progress: number;
  velocity: number;
  sections: ScrollSections;
  getSegmentProgress: (start: number, end: number) => number;
  isDetailsActive: boolean;
}

const ScrollTimelineContext = createContext<
  ScrollTimelineContextType | undefined
>(undefined);

export function useScrollTimeline(): ScrollTimelineContextType {
  const context = useContext(ScrollTimelineContext);
  if (!context) {
    throw new Error(
      "useScrollTimeline must be used within ScrollTimelineContextProvider",
    );
  }
  return context;
}

export function ScrollTimelineContextProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: ScrollTimelineContextType;
}) {
  return (
    <ScrollTimelineContext.Provider value={value}>
      {children}
    </ScrollTimelineContext.Provider>
  );
}
