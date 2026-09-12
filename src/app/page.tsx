// src/app/page.tsx
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { ReactLenis } from "lenis/react";
import { Loader } from "@/components/Loader";
import { useInputMode } from "@/hooks/useInputMode";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { NoJsContent } from "@/components/NoJs/NoJsContent";
import { CONFIG } from "@/config/constants";
import { useFontsReady } from "@/hooks/useFontsReady";
import { usePageScrollRuntime } from "@/hooks/usePageScrollRuntime";
import { useTheme } from "@/context/ThemeContext";
import {
    DEBUG_DEFAULTS,
    type DebugSettings,
} from "@/config/debugSettings";

const DynamicScene = dynamic(() => import("@/components/Scene"), {
    ssr: false,
});

// Code-split so leva never reaches the production bundle; only /debug pays for
// it.
const DynamicDebugPanel = dynamic(() => import("@/components/DebugPanel"), {
    ssr: false,
});

const TIMELINE_VIEWPORTS = CONFIG.scrollTimeline.VIEWPORTS;

const LENIS_OPTIONS = {
    autoRaf: false,
    lerp: CONFIG.scrollTimeline.LENIS_LERP,
} as const;

export default function Home() {
    const [startScene, setStartScene] = useState(false);
    const [removeLoader, setRemoveLoader] = useState(false);
    const inputMode = useInputMode();
    const prefersReducedMotion = usePrefersReducedMotion();
    const pathname = usePathname();
    const isDebug = pathname === "/debug";
    const fontsReady = useFontsReady();
    const themeContext = useTheme();

    const [debugSettings, setDebugSettings] =
        useState<DebugSettings>(DEBUG_DEFAULTS);
    const bioVariant = debugSettings.bio.variant;
    const { lenisRef, overflowViewports } = usePageScrollRuntime({
        bioVariant,
        fontsReady,
        removeLoader,
        prefersReducedMotion,
    });

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
                                CONFIG.workstation.REVEAL_VIEWPORTS
                            ) * 100}dvh`,
                        }}
                    />
                </div>
            </div>
        </>
    );
}
