import { createContext, useContext, ReactNode } from "react";

export interface HeroLayoutContextType {
  size: { width: number; height: number };
  viewport: { width: number; height: number };
  pxTo3DWidth: number;
  pxTo3DHeight: number;
  marginX: number;
  marginY: number;
  leftX: number;
  rightX: number;
  row3TopY: number;
  row3BottomY: number;
  viewportMinDimension: number;
  responsiveScale: number;
  grabAreaRadius: number;
  stickyAreaRadius: number;
}

const HeroLayoutContext = createContext<HeroLayoutContextType | undefined>(
  undefined,
);

export function useHeroLayout(): HeroLayoutContextType {
  const context = useContext(HeroLayoutContext);
  if (!context) {
    throw new Error("useHeroLayout must be used within HeroLayoutProvider");
  }
  return context;
}

export function HeroLayoutContextProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: HeroLayoutContextType;
}) {
  return (
    <HeroLayoutContext.Provider value={value}>
      {children}
    </HeroLayoutContext.Provider>
  );
}
