// src/app/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { ReactLenis, useLenis, type LenisRef } from "lenis/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Leva } from "leva";
import { Loader } from "@/components/Loader";
import { useIsMobile } from "@/hooks/useIsMobile";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { MobileHero } from "@/components/Mobile/MobileHero";
import { MobileContent } from "@/components/Mobile/MobileContent";
import { NoJsContent } from "@/components/NoJs/NoJsContent";
import { CONFIG } from "@/config/constants";

gsap.registerPlugin(ScrollTrigger);

const DynamicScene = dynamic(() => import("@/components/Scene"), {
    ssr: false,
});

const TIMELINE_VIEWPORTS = CONFIG.scrollTimeline.VIEWPORTS;

export default function Home() {
    const [startScene, setStartScene] = useState(false);
    const [removeLoader, setRemoveLoader] = useState(false);
    const isMobile = useIsMobile();
    const prefersReducedMotion = usePrefersReducedMotion();
    const pathname = usePathname();
    const isDebug = pathname === "/debug";
    const lenisRef = useRef<LenisRef>(null);
    const lenis = useLenis();

    useEffect(() => {
        if (!removeLoader || prefersReducedMotion) return;

        const update = (time: number) =>
            lenisRef.current?.lenis?.raf(time * 1000);
        gsap.ticker.add(update);
        gsap.ticker.lagSmoothing(0);

        return () => {
            gsap.ticker.remove(update);
        };
    }, [removeLoader, prefersReducedMotion]);

    useEffect(() => {
        if (!lenis) return;
        lenis.on("scroll", ScrollTrigger.update);
        return () => {
            lenis.off("scroll", ScrollTrigger.update);
        };
    }, [lenis]);

    // Always start at the top on load — the browser's automatic scroll
    // restoration would otherwise re-apply the pre-refresh position (even
    // after our scrollTo below), leaving the scroll-linked WebGL scene
    // mid-timeline while the loader plays.
    useEffect(() => {
        if ("scrollRestoration" in window.history) {
            window.history.scrollRestoration = "manual";
        }
        window.scrollTo(0, 0);
    }, []);

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
                {removeLoader && !prefersReducedMotion && (
                    <ReactLenis root ref={lenisRef} options={{ autoRaf: false }} />
                )}

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
