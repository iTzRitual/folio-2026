"use client";

import { useRef } from "react";
import { useProgress } from "@react-three/drei";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

interface LoaderProps {
  onExitStart: () => void;
  onComplete: () => void;
}

export function Loader({ onExitStart, onComplete }: LoaderProps) {
  const { progress } = useProgress();

  const containerRef = useRef<HTMLDivElement>(null);
  const unitsRef = useRef<HTMLDivElement>(null);
  const tensRef = useRef<HTMLDivElement>(null);
  const hundredsRef = useRef<HTMLDivElement>(null);

  const odometerWrapperRef = useRef<HTMLDivElement>(null);
  const blockRef = useRef<HTMLDivElement>(null);

  const progressProxy = useRef({ value: 0 });

  const isRevealed = useRef(false);
  const isExiting = useRef(false);

  const odometerTween = useRef<gsap.core.Tween | null>(null);

  const triggerExit = () => {
    if (isExiting.current) return;
    isExiting.current = true;

    const tl = gsap.timeline({
      delay: 0,
      onComplete: onComplete,
    });

    tl.set(blockRef.current, { transformOrigin: "left center" });

    tl.to(blockRef.current, {
      scaleX: 1,
      duration: 0.5,
      ease: "power4.inOut",
    });

    tl.set(odometerWrapperRef.current, { opacity: 0 });

    tl.call(() => onExitStart());

    tl.set(blockRef.current, { transformOrigin: "right center" });
    tl.to(blockRef.current, {
      scaleX: 0,
      duration: 0.5,
      ease: "power4.inOut",
    });
  };

  useGSAP(
    () => {
      const tl = gsap.timeline({
        onComplete: () => {
          isRevealed.current = true;

          if (odometerTween.current) {
            odometerTween.current.play();
          }

          if (progress === 100 && progressProxy.current.value >= 99.9) {
            triggerExit();
          }
        },
      });

      tl.set(blockRef.current, { transformOrigin: "right center", scaleX: 0 });
      tl.to(blockRef.current, {
        scaleX: 1,
        duration: 0.5,
        ease: "power4.inOut",
      });
      tl.set(odometerWrapperRef.current, { opacity: 1 });
      tl.set(blockRef.current, { transformOrigin: "left center" });
      tl.to(blockRef.current, {
        scaleX: 0,
        duration: 0.5,
        ease: "power4.inOut",
      });
    },
    { scope: containerRef },
  );

  useGSAP(
    () => {
      const targetProgress = Math.max(progress, 31);
      odometerTween.current = gsap.to(progressProxy.current, {
        value: targetProgress,
        duration: 2,
        ease: "power2.out",
        paused: !isRevealed.current,
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
            if (isRevealed.current) {
              triggerExit();
            }
          }
        },
      });
    },
    { dependencies: [progress], scope: containerRef },
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
      className="fixed inset-0 z-50 flex flex-col items-center justify-center text-white font-aeonik font-black text-6xl pointer-events-none"
    >
      <div className="block-line-wrapper">
        <div
          ref={blockRef}
          className="block-revealer bg-white"
          style={{ transform: "scaleX(0)", height: "100%" }}
        />

        <div
          ref={odometerWrapperRef}
          className="flex space-x-1 overflow-hidden h-[1em] leading-none opacity-0 px-4"
        >
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
    </div>
  );
}
