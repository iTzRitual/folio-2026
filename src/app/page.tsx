// src/app/page.tsx
"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { ReactLenis } from "lenis/react";
import { Leva } from "leva";
import { Loader } from "@/components/Loader";
import { useIsMobile } from "@/hooks/useIsMobile";
import { MobileHero } from "@/components/Mobile/MobileHero";
import { MobileContent } from "@/components/Mobile/MobileContent";
import { NoJsContent } from "@/components/NoJs/NoJsContent";

const DynamicScene = dynamic(() => import("@/components/Scene"), {
    ssr: false,
});

const TIMELINE_VIEWPORTS = 1.5;

export default function Home() {
    const [startScene, setStartScene] = useState(false);
    const [removeLoader, setRemoveLoader] = useState(false);
    const isMobile = useIsMobile();
    const pathname = usePathname();
    const isDebug = pathname === "/debug";

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
            <NoJsContent />
            <div className="js-only-app">
                <Leva collapsed hidden={!isDebug} />
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
                            <DynamicScene
                                startAnimation={startScene}
                                isMobile={isMobile}
                                isDebug={isDebug}
                            />
                        </div>
                    </div>

                    <main
                        className="relative z-10 w-full pointer-events-none"
                        style={{
                            height: isMobile
                                ? "auto"
                                : `${TIMELINE_VIEWPORTS * 100}vh`,
                        }}
                    >
                        {isMobile && <MobileHero startScene={startScene} />}
                        {isMobile && <MobileContent />}
                    </main>
                </div>
            </div>
        </>
    );
}
