"use client";

import { useHeroLayout } from "@/context/HeroLayoutContext";
import { useTheme } from "@/context/ThemeContext";
import { useAnimationContext } from "@/context/AnimationContext";
import { useControls } from "leva";
import { CONFIG } from "@/config/constants";
import { headerContent } from "@/data/content";
import { HeaderItem } from "./HeaderScene/HeaderItem";
import { Clock } from "./HeaderScene/Clock";
import { ThemeToggle } from "./HeaderScene/ThemeToggle";

const HEADER_DEFAULTS = {
  fontSize: CONFIG.header.FONT_SIZE,
};

const HEADER_LEVA_SCHEMA = {
  fontSize: {
    value: HEADER_DEFAULTS.fontSize,
    min: 0.004,
    max: 0.02,
    step: 0.0001,
  },
};

export function Header({ isDebug = false }: { isDebug?: boolean }) {
  const levaHeader = useControls("Header", HEADER_LEVA_SCHEMA);
  const { fontSize } = isDebug ? levaHeader : HEADER_DEFAULTS;
  const { viewport, marginX, pxTo3DWidth, pxTo3DHeight, leftX, rightX } =
    useHeroLayout();
  const { startTrigger } = useAnimationContext();
  const { theme, setTheme } = useTheme();

  const calculatedFontSize =
    (viewport.width - 2 * marginX) * fontSize;
  const pixelFontSize = calculatedFontSize / pxTo3DWidth;
  const y =
    viewport.height / 2 - CONFIG.header.MARGIN_Y_PX * pxTo3DHeight;

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
