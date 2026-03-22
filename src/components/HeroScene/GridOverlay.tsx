"use client";

import { useEffect, useState } from "react";
import { calculateHeroSafeZone } from "@/lib/heroSafeZone";

export function GridOverlay() {
  const [margins, setMargins] = useState<{ x: number; y: number }>({
    x: 60,
    y: 230,
  });

  useEffect(() => {
    const handleResize = () => {
      const safeZone = calculateHeroSafeZone({
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      });

      setMargins({
        x: safeZone.marginX,
        y: safeZone.marginY,
      });
    };

    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div
      className="absolute inset-0 z-50 pointer-events-none grid"
      style={{
        gridTemplateColumns: `${margins.x}px 1fr 1fr 1fr ${margins.x}px`,
        gridTemplateRows: `${margins.y}px 1fr 1fr 1fr ${margins.y}px`,
      }}
    >
      {Array.from({ length: 25 }).map((_, i) => (
        <div key={i} className="border-[0.5px] border-red-500/20" />
      ))}
    </div>
  );
}
