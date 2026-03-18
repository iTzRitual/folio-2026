"use client";

import { useEffect, useRef, useState } from "react";
import { useProgress } from "@react-three/drei";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

interface LoaderProps {
  onComplete: () => void;
}

export function Loader({ onComplete }: LoaderProps) {
  const { progress } = useProgress();

  const containerRef = useRef<HTMLDivElement>(null);

  const unitsRef = useRef<HTMLDivElement>(null);
  const tensRef = useRef<HTMLDivElement>(null);
  const hundredsRef = useRef<HTMLDivElement>(null);

  const progressProxy = useRef({ value: 0 });

  useGSAP(
    () => {
      gsap.to(progressProxy.current, {
        value: progress,
        duration: 1.5,
        ease: "power2.out",
        onUpdate: () => {
          const val = Math.floor(progressProxy.current.value);

          const units = val % 10;
          const tens = Math.floor(val / 10) % 10;
          const hundreds = Math.floor(val / 100) % 10;

          if (unitsRef.current)
            gsap.set(unitsRef.current, { yPercent: -units * 10 });
          if (tensRef.current)
            gsap.set(tensRef.current, { yPercent: -tens * 10 });
          if (hundredsRef.current)
            gsap.set(hundredsRef.current, { yPercent: -hundreds * 50 });
        },
        onComplete: () => {
          if (progress === 100 && progressProxy.current.value >= 99.9) {
            setTimeout(onComplete, 500);
          }
        },
      });
    },
    {
      dependencies: [progress, onComplete],
      scope: containerRef,
    },
  );

  const renderDigits = (isHundreds = false) => {
    const digits = isHundreds ? [0, 1] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    return digits.map((num) => (
      <div key={num} className="h-[1em] flex items-center justify-center">
        {num}
      </div>
    ));
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center text-white font-aeonik font-black text-6xl"
    >
      <div className="flex space-x-1 overflow-hidden h-[1em] leading-none">
        <div className="relative">
          <div ref={hundredsRef} className="flex flex-col">
            {renderDigits(true)}
          </div>
        </div>

        <div className="relative">
          <div ref={tensRef} className="flex flex-col">
            {renderDigits()}
          </div>
        </div>

        <div className="relative">
          <div ref={unitsRef} className="flex flex-col">
            {renderDigits()}
          </div>
        </div>
      </div>
    </div>
  );
}
