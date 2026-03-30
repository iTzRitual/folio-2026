"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { ReactLenis } from "lenis/react";
import { Leva } from "leva";
import { Loader } from "@/components/Loader";
import { useIsMobile } from "@/hooks/useIsMobile";
import { MobileHero } from "@/components/Mobile/MobileHero";
import { MobileContent } from "@/components/Mobile/MobileContent";

const DynamicScene = dynamic(() => import("@/components/Scene"), {
  ssr: false,
});

const TIMELINE_VIEWPORTS = 1.5;

export default function Home() {
  const [startScene, setStartScene] = useState(false);
  const [removeLoader, setRemoveLoader] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const isLoaderActive = !removeLoader;

    if (isLoaderActive) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";

      window.scrollTo(0, 0);
    } else {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    }

    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [removeLoader]);

  return (
    <>
      <Leva collapsed />
      {removeLoader && <ReactLenis root />}

      <div className="relative w-full min-h-screen overflow-x-hidden bg-[#1D1D1D]">
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
          {isMobile && <MobileHero startScene={startScene} />}
          {isMobile && <MobileContent />}
        </main>
      </div>
    </>
  );
}
