import {
  createContext,
  useContext,
  type MutableRefObject,
  type ReactNode,
} from "react";

export interface HeroTransitionContextType {
  progressRef: MutableRefObject<number>;
}

const HeroTransitionContext = createContext<
  HeroTransitionContextType | undefined
>(undefined);

export function useHeroTransition(): HeroTransitionContextType {
  const context = useContext(HeroTransitionContext);
  if (!context) {
    throw new Error(
      "useHeroTransition must be used within HeroTransitionProvider",
    );
  }
  return context;
}

export function HeroTransitionContextProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: HeroTransitionContextType;
}) {
  return (
    <HeroTransitionContext.Provider value={value}>
      {children}
    </HeroTransitionContext.Provider>
  );
}
