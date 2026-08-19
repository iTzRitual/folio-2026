"use client";

import { useHeroLayout } from "@/context/HeroLayoutContext";
import { useTheme } from "@/context/ThemeContext";
import { useAnimationContext } from "@/context/AnimationContext";
import { useDebugSettings } from "@/context/DebugSettingsContext";
import { CONFIG } from "@/config/constants";
import { headerContent } from "@/data/content";
import { HeaderItem } from "./HeaderScene/HeaderItem";
import { Clock } from "./HeaderScene/Clock";
import { ThemeToggle } from "./HeaderScene/ThemeToggle";
import { ThemeIconToggle } from "./HeaderScene/ThemeIconToggle";
import { useSceneCapabilities } from "@/context/SceneCapabilitiesContext";

export function Header() {
  const { fontSize } = useDebugSettings().header;
  const { size, viewport, marginX, pxTo3DWidth, pxTo3DHeight, leftX, rightX } =
    useHeroLayout();
  const { startTrigger } = useAnimationContext();
  const { theme, setTheme } = useTheme();
  const { layoutMode } = useSceneCapabilities();

  const contentWidth = viewport.width - 2 * marginX;
  const narrowPixelFontSize = Math.min(
    Math.max(
      size.width * CONFIG.header.NARROW_FONT_SIZE_MULT,
      CONFIG.header.NARROW_FONT_MIN_PX,
    ),
    CONFIG.header.NARROW_FONT_MAX_PX,
  );
  const calculatedFontSize =
    layoutMode === "narrow"
      ? narrowPixelFontSize * pxTo3DWidth
      : contentWidth * fontSize;
  const pixelFontSize = calculatedFontSize / pxTo3DWidth;
  const y =
    viewport.height / 2 -
    (layoutMode === "narrow"
      ? CONFIG.header.NARROW_MARGIN_Y_PX
      : CONFIG.header.MARGIN_Y_PX) *
      pxTo3DHeight;

  if (layoutMode === "narrow") {
    const themeX =
      leftX +
      (rightX - leftX) * CONFIG.header.NARROW_THEME_SLOT_T;
    return (
      <group position={[0, y, 0]}>
        <HeaderItem
          text={headerContent.availability}
          position={[leftX, 0, 0]}
          anchorX="left"
          calculatedFontSize={calculatedFontSize}
          pixelFontSize={pixelFontSize}
          startTrigger={startTrigger}
          delay={CONFIG.header.REVEAL_DELAY}
        />
        <ThemeIconToggle
          position={[themeX, 0, 0]}
          size={CONFIG.header.NARROW_ICON_SIZE_PX * pxTo3DWidth}
          startTrigger={startTrigger}
          delay={CONFIG.header.REVEAL_DELAY + CONFIG.header.REVEAL_STAGGER}
          theme={theme}
          onToggle={() => setTheme(theme === "Light" ? "Dark" : "Light")}
        />
        <HeaderItem
          text={headerContent.contact.label}
          position={[rightX, 0, 0]}
          anchorX="right"
          calculatedFontSize={calculatedFontSize}
          pixelFontSize={pixelFontSize}
          startTrigger={startTrigger}
          delay={CONFIG.header.REVEAL_DELAY + CONFIG.header.REVEAL_STAGGER * 2}
          href={headerContent.contact.href}
        />
      </group>
    );
  }

  const slots = CONFIG.header.SLOT_TS.map(
    (t) => leftX + (rightX - leftX) * t,
  );
  const delayAt = (index: number) =>
    CONFIG.header.REVEAL_DELAY + index * CONFIG.header.REVEAL_STAGGER;

  return (
    <group position={[0, y, 0]}>
      <HeaderItem
        text={headerContent.coordinates}
        position={[slots[0], 0, 0]}
        anchorX="left"
        calculatedFontSize={calculatedFontSize}
        pixelFontSize={pixelFontSize}
        startTrigger={startTrigger}
        delay={delayAt(0)}
      />
      <HeaderItem
        text={headerContent.availability}
        position={[slots[1], 0, 0]}
        anchorX="left"
        calculatedFontSize={calculatedFontSize}
        pixelFontSize={pixelFontSize}
        startTrigger={startTrigger}
        delay={delayAt(1)}
      />
      <ThemeToggle
        position={[slots[2], 0, 0]}
        calculatedFontSize={calculatedFontSize}
        pixelFontSize={pixelFontSize}
        startTrigger={startTrigger}
        delay={delayAt(2)}
        theme={theme}
        onSelect={setTheme}
      />
      <Clock
        position={[slots[3], 0, 0]}
        calculatedFontSize={calculatedFontSize}
        pixelFontSize={pixelFontSize}
        startTrigger={startTrigger}
        delay={delayAt(3)}
      />
      <HeaderItem
        text={headerContent.contact.label}
        position={[slots[4], 0, 0]}
        anchorX="right"
        calculatedFontSize={calculatedFontSize}
        pixelFontSize={pixelFontSize}
        startTrigger={startTrigger}
        delay={delayAt(4)}
        href={headerContent.contact.href}
      />
    </group>
  );
}
