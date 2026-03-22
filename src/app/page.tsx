"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ReactLenis } from "lenis/react";
import { Leva } from "leva";
import { Loader } from "@/components/Loader";
import { Details } from "@/components/Details";

const DynamicScene = dynamic(() => import("@/components/Scene"), {
  ssr: false,
});

export default function Home() {
  const [startScene, setStartScene] = useState(false);
  const [removeLoader, setRemoveLoader] = useState(false);

  return (
    <>
      <Leva collapsed />
      <ReactLenis root />

      <main className="relative h-screen bg-[#1D1D1D]">
        {!removeLoader && (
          <Loader
            onExitStart={() => setStartScene(true)}
            onComplete={() => setRemoveLoader(true)}
          />
        )}
        <DynamicScene startAnimation={startScene} />
      </main>
      <Details />
    </>
  );
}
