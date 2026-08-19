import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { HeroTransitionContextProvider } from "@/context/HeroTransitionContext";
import { CONFIG } from "@/config/constants";

gsap.registerPlugin(ScrollTrigger);

interface HeroTransitionProviderProps {
  children: ReactNode;
  detailsOverflowViewports: number;
}

export function HeroTransitionProvider({
  children,
  detailsOverflowViewports,
}: HeroTransitionProviderProps) {
  const progressRef = useRef(0);
  const detailsScrollRef = useRef(0);
  const revealProgressRef = useRef(0);
  const detailsOverflowViewportsRef = useRef(detailsOverflowViewports);
  const modelAnchorRef = useRef({
    xFraction: 0,
    yFraction: 0,
    scale: CONFIG.model.DETAILS_POPUP_SCALE,
  });

  useEffect(() => {
    detailsOverflowViewportsRef.current = Math.max(detailsOverflowViewports, 0);
    ScrollTrigger.refresh();
  }, [detailsOverflowViewports]);

  useGSAP(() => {
    const scrollState = { progress: 0 };

    const transitionDistance = () =>
      window.innerHeight * (CONFIG.scrollTimeline.VIEWPORTS - 1);

    const revealDistance = () =>
      window.innerHeight * CONFIG.phase2.REVEAL_VIEWPORTS;

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
      const transition = transitionDistance();
      const detailsDistance =
        window.innerHeight * detailsOverflowViewportsRef.current;
      const revealStart = transition + detailsDistance;

      detailsScrollRef.current = Math.min(
        Math.max(0, scroll - transition),
        detailsDistance,
      );
      revealProgressRef.current = Math.min(
        Math.max((scroll - revealStart) / revealDistance(), 0),
        1,
      );
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
    <HeroTransitionContextProvider
      value={{
        progressRef,
        detailsScrollRef,
        revealProgressRef,
        modelAnchorRef,
      }}
    >
      {children}
    </HeroTransitionContextProvider>
  );
}
