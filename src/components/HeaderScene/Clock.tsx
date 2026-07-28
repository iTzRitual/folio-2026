"use client";

import { useEffect, useState } from "react";
import { headerContent } from "@/data/content";
import { HeaderItem } from "./HeaderItem";

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: headerContent.timeZone,
  hour12: false,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const offsetFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: headerContent.timeZone,
  timeZoneName: "shortOffset",
});

function readClock(now: Date) {
  const offset = offsetFormatter
    .formatToParts(now)
    .find((part) => part.type === "timeZoneName")?.value;

  return `${timeFormatter.format(now)} ${offset?.includes("+2") ? "CEST" : "CET"}`;
}

interface ClockProps {
  position: [number, number, number];
  calculatedFontSize: number;
  pixelFontSize: number;
  startTrigger: boolean;
  delay: number;
}

export function Clock({
  position,
  calculatedFontSize,
  pixelFontSize,
  startTrigger,
  delay,
}: ClockProps) {
  const [label, setLabel] = useState(() => readClock(new Date()));

  useEffect(() => {
    const id = window.setInterval(() => setLabel(readClock(new Date())), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <HeaderItem
      text={label}
      position={position}
      anchorX="left"
      calculatedFontSize={calculatedFontSize}
      pixelFontSize={pixelFontSize}
      startTrigger={startTrigger}
      delay={delay}
      revealMode="fade"
    />
  );
}
