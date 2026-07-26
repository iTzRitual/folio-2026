import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { HeroTransitionContextProvider } from "@/context/HeroTransitionContext";
import { CONFIG } from "@/config/constants";

gsap.registerPlugin(ScrollTrigger);

interface HeroTransitionProviderProps {
  children: ReactNode;
}

export function HeroTransitionProvider({
  children,
}: HeroTransitionProviderProps) {
  const progressRef = useRef(0);
  const detailsScrollRef = useRef(0);
  const modelAnchorRef = useRef({ xFraction: 0, yFraction: 0 });

  useGSAP(() => {
    const scrollState = { progress: 0 };

    const transitionDistance = () =>
      window.innerHeight * (CONFIG.scrollTimeline.VIEWPORTS - 1);

    const tween = gsap.to(scrollState, {
      progress: 1,
      ease: "none",
      scrollTrigger: {
        trigger: document.body,
        start: "top top",
        end: () => `+=${transitionDistance()}`,
        scrub: true,
      },
      onUpdate: () => {
        progressRef.current = Math.min(Math.max(scrollState.progress, 0), 1);
      },
    });

    const readDetailsScroll = (scroll: number) => {
      detailsScrollRef.current = Math.max(0, scroll - transitionDistance());
    };

    const detailsTrigger = ScrollTrigger.create({
      trigger: document.body,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => readDetailsScroll(self.scroll()),
      onRefresh: (self) => readDetailsScroll(self.scroll()),
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      detailsTrigger.kill();
    };
  }, []);

  return (
    <HeroTransitionContextProvider value={{ progressRef, detailsScrollRef, modelAnchorRef }}>
      {children}
    </HeroTransitionContextProvider>
  );
}
