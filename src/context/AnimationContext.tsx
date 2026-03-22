import { createContext, useContext, ReactNode } from "react";

export interface AnimationContextType {
  startTrigger: boolean;
}

const AnimationContext = createContext<AnimationContextType | undefined>(
  undefined,
);

export function useAnimationContext(): AnimationContextType {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error(
      "useAnimationContext must be used within AnimationProvider",
    );
  }
  return context;
}

export function AnimationContextProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: AnimationContextType;
}) {
  return (
    <AnimationContext.Provider value={value}>
      {children}
    </AnimationContext.Provider>
  );
}
