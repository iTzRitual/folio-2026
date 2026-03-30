import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { HeroTransitionContextProvider } from "@/context/HeroTransitionContext";

gsap.registerPlugin(ScrollTrigger);

interface HeroTransitionProviderProps {
  children: ReactNode;
}

export function HeroTransitionProvider({
  children,
}: HeroTransitionProviderProps) {
  const progressRef = useRef(0);

  useGSAP(() => {
    const scrollState = { progress: 0 };

    const tween = gsap.to(scrollState, {
      progress: 1,
      ease: "none",
      scrollTrigger: {
        trigger: document.body,
        start: "top top",
        end: "+=50%",
        scrub: true,
      },
      onUpdate: () => {
        progressRef.current = Math.min(Math.max(scrollState.progress, 0), 1);
      },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  return (
    <HeroTransitionContextProvider value={{ progressRef }}>
      {children}
    </HeroTransitionContextProvider>
  );
}
