// src/app/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { ReactLenis, useLenis, type LenisRef } from "lenis/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Loader } from "@/components/Loader";
import { useInputMode } from "@/hooks/useInputMode";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { NoJsContent } from "@/components/NoJs/NoJsContent";
import { CONFIG } from "@/config/constants";
import { calculateDetailsOverflowViewports } from "@/lib/detailsLayout";
import { caseStudyStage } from "@/lib/caseStudyStage";
import {
    rootScrollLock,
    subscribeRootScrollLock,
} from "@/lib/rootScrollLock";
import { useFontsReady } from "@/hooks/useFontsReady";
import { useTheme } from "@/context/ThemeContext";
import {
    DEBUG_DEFAULTS,
    type DebugSettings,
} from "@/context/DebugSettingsContext";

gsap.registerPlugin(ScrollTrigger);

const DynamicScene = dynamic(() => import("@/components/Scene"), {
    ssr: false,
});

// Code-split so leva never reaches the production bundle; only /debug pays for
// it.
const DynamicDebugPanel = dynamic(() => import("@/components/DebugPanel"), {
    ssr: false,
});

const TIMELINE_VIEWPORTS = CONFIG.scrollTimeline.VIEWPORTS;

const LENIS_OPTIONS = { autoRaf: false } as const;

const RESIZE_DEBOUNCE_MS = 150;

export default function Home() {
    const [startScene, setStartScene] = useState(false);
    const [removeLoader, setRemoveLoader] = useState(false);
    const inputMode = useInputMode();
    const prefersReducedMotion = usePrefersReducedMotion();
    const pathname = usePathname();
    const isDebug = pathname === "/debug";
    const lenisRef = useRef<LenisRef>(null);
    const lenis = useLenis();
    const [overflowViewports, setOverflowViewports] = useState(0);
    const fontsReady = useFontsReady();
    const themeContext = useTheme();

    const [debugSettings, setDebugSettings] =
        useState<DebugSettings>(DEBUG_DEFAULTS);
    const bioVariant = debugSettings.bio.variant;

    useEffect(() => {
        const update = () =>
            setOverflowViewports(
                calculateDetailsOverflowViewports({
                    viewportWidth: window.innerWidth,
                    viewportHeight: window.innerHeight,
                    bioVariant,
                    fontsReady,
                }),
            );

        update();

        // A drag-resize fires this continuously, and each pass measures and
        // greedy-wraps the whole bio on a canvas context before landing in a
        // state change that triggers ScrollTrigger.refresh().
        let debounce: number | undefined;
        const onResize = () => {
            window.clearTimeout(debounce);
            debounce = window.setTimeout(update, RESIZE_DEBOUNCE_MS);
        };

        window.addEventListener("resize", onResize);
        return () => {
            window.clearTimeout(debounce);
            window.removeEventListener("resize", onResize);
        };
    }, [bioVariant, fontsReady]);

    useEffect(() => {
        ScrollTrigger.refresh();
    }, [overflowViewports]);

    useEffect(() => {
        if (!removeLoader || prefersReducedMotion) return;
        const instance = lenisRef.current?.lenis;
        if (!instance) return;

        let wasLocked = false;
        const syncLock = () => {
            if (rootScrollLock.active) {
                if (!wasLocked) instance.stop();
                wasLocked = true;
                window.scrollTo(0, rootScrollLock.y);
                return;
            }

            if (wasLocked) instance.start();
            wasLocked = false;
        };
        const unsubscribe = subscribeRootScrollLock(syncLock);
        syncLock();
        const update = (time: number) => {
            if (rootScrollLock.active) {
                window.scrollTo(0, rootScrollLock.y);
                return;
            }

            instance.raf(time * 1000);
        };
        gsap.ticker.add(update);
        gsap.ticker.lagSmoothing(0);

        return () => {
            unsubscribe();
            if (wasLocked) instance.start();
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

        // A case study landed on directly is already open behind the loader,
        // and it holds the root element for as long as it is up: handing the
        // scroll back now would slide the sheet out from under a camera that
        // has left it. It only ever locks the root, so the body is released
        // either way — nothing else would give it back.
        const release = () => {
            document.body.style.overflow = "";
            if (caseStudyStage.open) return;
            document.documentElement.style.overflow = "";
        };

        if (isLoaderActive) {
            document.documentElement.style.overflow = "hidden";
            document.body.style.overflow = "hidden";
            window.scrollTo(0, 0);
        } else {
            release();
        }

        return release;
    }, [removeLoader]);

    return (
        <>
            <NoJsContent />
            <div className="js-only-app">
                {isDebug && <DynamicDebugPanel onChange={setDebugSettings} />}
                {removeLoader && !prefersReducedMotion && inputMode === "fine" && (
                    <ReactLenis root ref={lenisRef} options={LENIS_OPTIONS} />
                )}

                <div className="relative w-full min-h-screen overflow-x-hidden bg-(--bg)">
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
                                inputMode={inputMode}
                                detailsOverflowViewports={overflowViewports}
                                isDebug={isDebug}
                                bioVariant={bioVariant}
                                themeContext={themeContext}
                                debugSettings={debugSettings}
                            />
                        </div>
                    </div>

                    <main
                        className="relative z-10 w-full pointer-events-none"
                        style={{
                            height: `${(
                                TIMELINE_VIEWPORTS +
                                overflowViewports +
                                CONFIG.phase2.REVEAL_VIEWPORTS
                            ) * 100}dvh`,
                        }}
                    />
                </div>
            </div>
        </>
    );
}
