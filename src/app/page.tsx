"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ReactLenis } from "lenis/react";
import { Leva } from "leva";
import { Loader } from "@/components/Loader";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Copy } from "@/components/Copy";
import { heroContent } from "@/data/content";

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
            <section className="relative w-full h-screen flex flex-col items-center justify-around pointer-events-none font-karla px-4">
              <Copy
                delay={0.1}
                blockColor="#BCBCBC"
                direction="rightToLeft"
                startTrigger={startScene}
              >
                <p className="text-[#BCBCBC] font-karla font-black text-center text-xl">
                  {heroContent.subtitle}
                </p>
              </Copy>
              <Copy
                delay={0}
                blockColor="#FFFFFF"
                direction="leftToRight"
                startTrigger={startScene}
              >
                <h1 className="text-white font-black text-center w-full text-7xl">
                  {heroContent.title}
                </h1>
              </Copy>
            </section>
          )}

          <section className="relative w-full h-screen pointer-events-none"></section>
        </main>
      </div>
    </>
  );
}
