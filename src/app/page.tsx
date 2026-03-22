"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ReactLenis } from "lenis/react";
import { Leva } from "leva";
import { Loader } from "@/components/Loader";

const DynamicScene = dynamic(() => import("@/components/Scene"), {
  ssr: false,
});

const TIMELINE_VIEWPORTS = 1.5;

export default function Home() {
  const [startScene, setStartScene] = useState(false);
  const [removeLoader, setRemoveLoader] = useState(false);

  return (
    <>
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
    </>
  );
}
