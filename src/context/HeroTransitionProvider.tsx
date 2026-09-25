import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { HeroTransitionContextProvider } from "@/context/HeroTransitionContext";
import { CONFIG } from "@/config/constants";
import { useFrame } from "@react-three/fiber";
import { useLenis } from "lenis/react";
import { rootScrollLock } from "@/lib/rootScrollLock";

gsap.registerPlugin(ScrollTrigger);

const transitionDistance = () => window.innerHeight * (CONFIG.scrollTimeline.VIEWPORTS - 1);

interface HeroTransitionProviderProps {
  children: ReactNode;
  detailsOverflowViewports: number;
}

export function HeroTransitionProvider({
  children,
  detailsOverflowViewports,
}: HeroTransitionProviderProps) {
  const lenis = useLenis();
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

  useFrame(() => {
    const scroll = rootScrollLock.active ? rootScrollLock.y : lenis?.animatedScroll ?? window.scrollY;
    progressRef.current = Math.min(Math.max(scroll / transitionDistance(), 0), 1);
  }, -4);

  useGSAP(() => {
    const revealDistance = () =>
      window.innerHeight * CONFIG.workstation.REVEAL_VIEWPORTS;

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
