"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ReactLenis } from "lenis/react";
import { Leva } from "leva";
import { Loader } from "@/components/Loader";
import {
  ScrollTimelineContextProvider,
  ScrollTimelineContextType,
} from "@/context/ScrollTimelineContext";

const DynamicScene = dynamic(() => import("@/components/Scene"), {
  ssr: false,
});

const TIMELINE_VIEWPORTS = 2;

const SCROLL_SECTIONS = {
  heroHoldEnd: 0.16,
  heroExitEnd: 0.42,
  detailsEnterEnd: 0.76,
};

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

export default function Home() {
  const [startScene, setStartScene] = useState(false);
  const [removeLoader, setRemoveLoader] = useState(false);
  const [progress, setProgress] = useState(0);
  const [velocity, setVelocity] = useState(0);

  useEffect(() => {
    let lastY = window.scrollY;
    let lastTs = performance.now();
    let ticking = false;

    const update = (ts: number) => {
      const currentY = window.scrollY;
      const elapsed = Math.max((ts - lastTs) / 1000, 0.001);
      const deltaY = currentY - lastY;

      const maxScroll = Math.max(
        window.innerHeight * (TIMELINE_VIEWPORTS - 1),
        1,
      );
      setProgress(clamp01(currentY / maxScroll));
      setVelocity(deltaY / elapsed);

      lastY = currentY;
      lastTs = ts;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    const onResize = () => {
      requestAnimationFrame((ts) => update(ts));
    };

    onResize();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const scrollValue: ScrollTimelineContextType = useMemo(() => {
    const getSegmentProgress = (start: number, end: number) => {
      if (end <= start) return 0;
      return clamp01((progress - start) / (end - start));
    };

    return {
      progress,
      velocity,
      sections: SCROLL_SECTIONS,
      getSegmentProgress,
      isDetailsActive: progress >= SCROLL_SECTIONS.heroExitEnd,
    };
  }, [progress, velocity]);

  return (
    <ScrollTimelineContextProvider value={scrollValue}>
      <Leva collapsed />
      <ReactLenis root />

      <div
        className="relative bg-[#1D1D1D]"
        style={{ height: `${TIMELINE_VIEWPORTS * 100}vh` }}
      >
        <main className="sticky top-0 h-screen bg-[#1D1D1D]">
          {!removeLoader && (
            <Loader
              onExitStart={() => setStartScene(true)}
              onComplete={() => setRemoveLoader(true)}
            />
          )}
          <DynamicScene startAnimation={startScene} />
        </main>
      </div>
    </ScrollTimelineContextProvider>
  );
}
