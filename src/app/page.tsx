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
import { pageScrollEasing } from "@/lib/pageScrollMotion";
import { useTheme } from "@/context/ThemeContext";
import { useSceneRecovery } from "@/hooks/useSceneRecovery";
import { SceneBoundary } from "@/components/SceneBoundary";
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
    lerp: 0,
    duration: CONFIG.scrollTimeline.LENIS_DURATION,
    easing: pageScrollEasing,
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
    const { status, fail, ready } = useSceneRecovery();
    const rendererFailed = status === "failed";

    const [debugSettings, setDebugSettings] =
        useState<DebugSettings>(DEBUG_DEFAULTS);
    const bioVariant = debugSettings.bio.variant;
    const { lenisRef, overflowViewports } = usePageScrollRuntime({
        enabled: !rendererFailed,
        bioVariant,
        fontsReady,
        removeLoader,
        prefersReducedMotion,
    });

    return (
        <>
            <NoJsContent rendererFailed={rendererFailed} />
            <div className="js-only-app" data-renderer-status={status}>
                {!rendererFailed && (
                    <>
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
                                    <SceneBoundary onFailure={fail}>
                                        <DynamicScene
                                            startAnimation={startScene}
                                            inputMode={inputMode}
                                            detailsOverflowViewports={overflowViewports}
                                            isDebug={isDebug}
                                            bioVariant={bioVariant}
                                            themeContext={themeContext}
                                            debugSettings={debugSettings}
                                            onFailure={fail}
                                            onReady={ready}
                                        />
                                    </SceneBoundary>
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
                    </>
                )}
            </div>
        </>
    );
}
