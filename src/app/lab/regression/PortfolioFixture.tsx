"use client";

import dynamic from "next/dynamic";
import { CONFIG } from "@/config/constants";
import { DEBUG_DEFAULTS } from "@/config/debugSettings";
import { useTheme } from "@/context/ThemeContext";
import type { BioVariant } from "@/data/content";
import { useFontsReady } from "@/hooks/useFontsReady";
import { usePageScrollRuntime } from "@/hooks/usePageScrollRuntime";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import type { SceneInputMode } from "@/lib/responsiveScene";

const DynamicScene = dynamic(() => import("@/components/Scene"), { ssr: false });

export default function PortfolioFixture({
  inputMode,
  bioVariant,
}: {
  inputMode: SceneInputMode;
  bioVariant: BioVariant;
}) {
  const fontsReady = useFontsReady();
  const themeContext = useTheme();
  const prefersReducedMotion = usePrefersReducedMotion();
  const { overflowViewports } = usePageScrollRuntime({
    bioVariant,
    fontsReady,
    removeLoader: true,
    prefersReducedMotion,
  });
  const viewports = CONFIG.scrollTimeline.VIEWPORTS +
    overflowViewports + CONFIG.workstation.REVEAL_VIEWPORTS;

  return (
    <div data-portfolio-fixture data-fonts-ready={fontsReady} className="min-h-screen bg-(--bg)">
      <div className="fixed inset-0">
        <DynamicScene
          startAnimation
          inputMode={inputMode}
          detailsOverflowViewports={overflowViewports}
          isDebug={false}
          bioVariant={bioVariant}
          themeContext={themeContext}
          debugSettings={DEBUG_DEFAULTS}
        />
      </div>
      <main className="pointer-events-none" style={{ height: `${viewports * 100}dvh` }} />
    </div>
  );
}
