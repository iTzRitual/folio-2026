"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ReactLenis } from "lenis/react";
import { Leva } from "leva";
import { Loader } from "@/components/Loader";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Copy } from "@/components/Copy";
import {
  heroContent,
  experienceData,
  projectsData,
  educationData,
} from "@/data/content";

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
          {isMobile && (
            <section className="relative w-full h-screen max-w-full overflow-x-hidden flex flex-col items-center justify-around pointer-events-none font-karla px-4">
              <Copy
                delay={0.1}
                blockColor="#BCBCBC"
                direction="rightToLeft"
                startTrigger={startScene}
              >
                <p className="max-w-full wrap-break-word text-[#BCBCBC] font-karla font-black text-center text-xl">
                  {heroContent.subtitle}
                </p>
              </Copy>
              <Copy
                delay={0}
                blockColor="#FFFFFF"
                direction="leftToRight"
                startTrigger={startScene}
              >
                <h1 className="w-full max-w-full wrap-break-word text-white font-black text-center text-[clamp(3rem,14vw,4.5rem)] leading-[0.95]">
                  {heroContent.title}
                </h1>
              </Copy>
            </section>
          )}

          {isMobile && (
            <section className="relative w-full max-w-full overflow-x-hidden pointer-events-none px-6 pb-36">
              <div className="mb-12">
                <h3 className="text-white font-black text-left w-full text-3xl pb-2">
                  Experience
                </h3>
                <ul>
                  {experienceData.map((item, index) => (
                    <li
                      key={index}
                      className="text-white font-karla text-left w-full text-lg"
                    >
                      - {item.position} at {item.company} ({item.duration})
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mb-12">
                <h3 className="text-white font-black text-left w-full text-3xl pb-2">
                  Recent Projects
                </h3>
                <ul>
                  {projectsData.map((item, index) => (
                    <li
                      key={index}
                      className="text-white font-karla text-left w-full text-lg"
                    >
                      - {item.name}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mb-12">
                <h3 className="text-white font-black text-left w-full text-3xl pb-2">
                  Education
                </h3>
                <ul>
                  {educationData.map((item, index) => (
                    <li
                      key={index}
                      className="text-white font-karla text-left w-full text-lg"
                    >
                      - {item.degree} in {item.field} from {item.institution}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </main>
      </div>
    </>
  );
}
