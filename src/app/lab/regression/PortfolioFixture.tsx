"use client";

import dynamic from "next/dynamic";
import { useMemo, useSyncExternalStore } from "react";
import { CONFIG } from "@/config/constants";
import { DEBUG_DEFAULTS } from "@/config/debugSettings";
import { useTheme } from "@/context/ThemeContext";
import type { BioVariant } from "@/data/content";
import { useFontsReady } from "@/hooks/useFontsReady";
import { usePageScrollRuntime } from "@/hooks/usePageScrollRuntime";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import type { SceneInputMode } from "@/lib/responsiveScene";
import { useSceneRecovery } from "@/hooks/useSceneRecovery";
import { SceneBoundary } from "@/components/SceneBoundary";
import { NoJsContent } from "@/components/NoJs/NoJsContent";
import { calculateDetailsLayout } from "@/lib/detailsLayout";
import { calculateHeroSafeZone } from "@/lib/heroSafeZone";

const DynamicScene = dynamic(() => import("@/components/Scene"), { ssr: false });
const viewportSnapshot = () => `${window.innerWidth}x${window.innerHeight}`;
const serverViewportSnapshot = () => "0x0";
const subscribeViewport = (listener: () => void) => {
  window.addEventListener("resize", listener);
  return () => window.removeEventListener("resize", listener);
};

export default function PortfolioFixture({
  inputMode,
  bioVariant,
}: {
  inputMode: SceneInputMode;
  bioVariant: BioVariant;
}) {
  const fontsReady = useFontsReady();
  const dimensions = useSyncExternalStore(subscribeViewport, viewportSnapshot, serverViewportSnapshot);
  const [width, height] = dimensions.split("x").map(Number);
  const layoutContract = useMemo(() => {
    if (!width || !height) return null;
    const depthScale = CONFIG.scene.CAMERA_REST_Z / (CONFIG.scene.CAMERA_REST_Z - CONFIG.scene.DETAILS_GROUP_Z);
    const { marginY } = calculateHeroSafeZone({ viewportWidth: width, viewportHeight: height });
    const layout = calculateDetailsLayout({ viewportWidth: width, viewportHeight: height, bioVariant, fontsReady });
    return {
      width,
      height,
      depthScale,
      restY: height / 2 - (height * (CONFIG.detailsLayout.TARGET_BASE_Y_MULT + 0.5) - marginY * CONFIG.detailsLayout.SECTION_TOP_OFF_MULT) * depthScale,
      transitionDistance: height * (CONFIG.scrollTimeline.VIEWPORTS - 1),
      scrollHeight: height * (CONFIG.scrollTimeline.VIEWPORTS + CONFIG.workstation.REVEAL_VIEWPORTS) + layout.overflow,
      layout,
    };
  }, [width, height, bioVariant, fontsReady]);
  const themeContext = useTheme();
  const prefersReducedMotion = usePrefersReducedMotion();
  const { status, fail, ready } = useSceneRecovery();
  const rendererFailed = status === "failed";
  const { overflowViewports } = usePageScrollRuntime({
    enabled: !rendererFailed,
    bioVariant,
    fontsReady,
    removeLoader: true,
    prefersReducedMotion,
  });
  const viewports = CONFIG.scrollTimeline.VIEWPORTS +
    overflowViewports + CONFIG.workstation.REVEAL_VIEWPORTS;

  return (
    <div data-portfolio-fixture data-fonts-ready={fontsReady} data-renderer-status={status} data-layout-contract={JSON.stringify(layoutContract)} className="min-h-screen bg-(--bg)">
      <NoJsContent rendererFailed={rendererFailed} />
      {!rendererFailed && (
        <>
          <div className="fixed inset-0">
            <SceneBoundary onFailure={fail}>
              <DynamicScene
                startAnimation
                inputMode={inputMode}
                detailsOverflowViewports={overflowViewports}
                isDebug={false}
                bioVariant={bioVariant}
                themeContext={themeContext}
                debugSettings={DEBUG_DEFAULTS}
                onFailure={fail}
                onReady={ready}
              />
            </SceneBoundary>
          </div>
          <main className="pointer-events-none" style={{ height: `${viewports * 100}dvh` }} />
        </>
      )}
    </div>
  );
}
