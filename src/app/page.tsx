"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ReactLenis } from "lenis/react";
import { Leva } from "leva";
import { Loader } from "@/components/Loader";

const DynamicScene = dynamic(() => import("@/components/Scene"), {
  ssr: false,
});

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <>
      <Leva collapsed />
      <ReactLenis root />

      {!isLoaded && <Loader onComplete={() => setIsLoaded(true)} />}

      <main className="relative h-screen bg-[#1D1D1D]">
        <DynamicScene startAnimation={isLoaded} />
      </main>
    </>
  );
}
