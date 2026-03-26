"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ReactLenis } from "lenis/react";
import { Leva } from "leva";
import { Loader } from "@/components/Loader";
import { useIsMobile } from "@/hooks/useIsMobile";

const DynamicScene = dynamic(() => import("@/components/Scene"), {
  ssr: false,
});

const TIMELINE_VIEWPORTS = 1.5;

export default function Home() {
  const [startScene, setStartScene] = useState(false);
  const [removeLoader, setRemoveLoader] = useState(false);
  const isMobile = useIsMobile();

  return (
    <>
      <Leva collapsed />
      <ReactLenis root />

      <div className="relative w-full min-h-screen bg-[#1D1D1D]">
        <div className="fixed inset-0 z-0 pointer-events-none">
          {!removeLoader && (
            <Loader
              onExitStart={() => setStartScene(true)}
              onComplete={() => setRemoveLoader(true)}
            />
          )}
          <div className="w-full h-full pointer-events-auto">
            <DynamicScene startAnimation={startScene} isMobile={isMobile} />
          </div>
        </div>

        <main
          className="relative z-10 w-full pointer-events-none"
          style={{
            height: isMobile ? "auto" : `${TIMELINE_VIEWPORTS * 100}vh`,
          }}
        >
          {isMobile && (
            <section className="relative w-full h-screen flex flex-col items-center justify-center pointer-events-none">
              <h1 className="text-white text-4xl md:text-6xl font-bold uppercase text-center mt-[-10vh]">
                Natan Mokrzycki
              </h1>
              <p className="text-white text-sm mt-4 max-w-xs text-center">
                Bridging the gap between technical performance and high-end
                visual aesthetics.
              </p>
            </section>
          )}

          <section className="relative w-full h-screen pointer-events-auto"></section>
        </main>
      </div>
    </>
  );
}
