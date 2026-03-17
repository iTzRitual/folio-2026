"use client";

import dynamic from "next/dynamic";
import { ReactLenis } from "lenis/react";
import { Leva } from "leva";

const DynamicScene = dynamic(() => import("@/components/Scene"), {
  ssr: false,
});

export default function Home() {
  return (
    <>
      <Leva collapsed />
      <ReactLenis root />
      <main className="relative h-screen">
        <DynamicScene />
      </main>
    </>
  );
}
