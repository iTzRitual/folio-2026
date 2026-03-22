"use client";

import { useEffect, useState } from "react";

export function GridOverlay() {
  const [margins, setMargins] = useState({ x: 60, y: 210 });

  useEffect(() => {
    const handleResize = () => {
      const TARGET_ASPECT_RATIO = 16 / 9;
      const currentAspectRatio = window.innerWidth / window.innerHeight;

      let extraMarginX = 0;

      if (currentAspectRatio > TARGET_ASPECT_RATIO) {
        const safeWidth = window.innerHeight * TARGET_ASPECT_RATIO;
        extraMarginX = (window.innerWidth - safeWidth) / 2;
      }

      setMargins({
        x: 60 + extraMarginX,
        y: 210,
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
