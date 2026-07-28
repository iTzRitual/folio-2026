"use client";

import { useCallback, useState } from "react";
import { CONFIG } from "@/config/constants";
import { headerContent, type ThemeOption } from "@/data/content";
import { HeaderItem } from "./HeaderItem";

interface ThemeToggleProps {
  position: [number, number, number];
  calculatedFontSize: number;
  pixelFontSize: number;
  startTrigger: boolean;
  delay: number;
  theme: ThemeOption;
  onSelect: (theme: ThemeOption) => void;
}

export function ThemeToggle({
  position,
  calculatedFontSize,
  pixelFontSize,
  startTrigger,
  delay,
  theme,
  onSelect,
}: ThemeToggleProps) {
  const [widths, setWidths] = useState<number[]>([0, 0, 0]);

  const measure = useCallback((index: number, width: number) => {
    setWidths((current) =>
      current[index] === width
        ? current
        : current.map((value, i) => (i === index ? width : value)),
    );
  }, []);

  const gap = calculatedFontSize * CONFIG.header.SEGMENT_GAP_EM;
  const [lightLabel, darkLabel] = headerContent.themeOptions;
  const offsets = [
    0,
    widths[0] + gap,
    widths[0] + gap + widths[1] + gap,
  ];

  const segments = [
    { text: lightLabel, onActivate: () => onSelect(lightLabel) },
    { text: headerContent.themeSeparator, onActivate: undefined },
    { text: darkLabel, onActivate: () => onSelect(darkLabel) },
  ];

  return (
    <group position={position}>
      {segments.map((segment, index) => (
        <HeaderItem
          key={segment.text}
          text={segment.text}
          position={[offsets[index], 0, 0]}
          anchorX="left"
          calculatedFontSize={calculatedFontSize}
          pixelFontSize={pixelFontSize}
          startTrigger={startTrigger}
          bold={segment.text === theme}
          delay={delay + index * CONFIG.header.REVEAL_STAGGER}
          onActivate={segment.onActivate}
          onMeasure={(width) => measure(index, width)}
        />
      ))}
    </group>
  );
}
