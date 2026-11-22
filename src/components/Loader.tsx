"use client";

import { useEffect, useEffectEvent, useImperativeHandle, useRef, type Ref } from "react";
import { CONFIG } from "@/config/constants";
import { IS_REPEAT_VISIT } from "@/lib/visitSession";

export interface LoaderHandle {
  advanceWorkstation(progress: number): void;
}

interface LoaderProps {
  ref: Ref<LoaderHandle>;
  canvasReady: boolean;
  ready: boolean;
  onExitStart: () => void;
  onComplete: () => void;
}

const digits = Array.from({ length: 101 }, (_, n) => String(n).padStart(3, "0"));

export function Loader({ ref, canvasReady, ready, onExitStart, onComplete }: LoaderProps) {
  const counterRef = useRef<HTMLDivElement>(null);
  const blockRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const wake = useRef<(() => void) | null>(null);
  const workstationProgress = useRef(0);
  useImperativeHandle(ref, () => ({
    advanceWorkstation(value) {
      workstationProgress.current = Math.max(workstationProgress.current, value);
      wake.current?.();
    },
  }), []);
  const target = useEffectEvent(() => {
    if (!ready) return canvasReady ? 45 : 20;
    return 60 + Math.floor(40 * workstationProgress.current);
  });
  const startHero = useEffectEvent(onExitStart);
  const finish = useEffectEvent(onComplete);

  useEffect(() => {
    const counter = counterRef.current!;
    const block = blockRef.current!;
    const viewport = windowRef.current!;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const countTime = 1000 * (IS_REPEAT_VISIT ? CONFIG.loader.ODOMETER_DURATION_REPEAT : CONFIG.loader.ODOMETER_DURATION);
    let cancelled = false;
    let animation: Animation | undefined;

    const move = async (el: HTMLElement, from: string, to: string, duration: number, easing: string) => {
      animation = el.animate([{ transform: from }, { transform: to }], { duration: reduced ? 0 : duration, easing, fill: "both" });
      await animation.finished;
      el.style.transform = to;
      animation.cancel();
    };
    const wipe = (origin: string, from: number, to: number) => {
      block.style.transformOrigin = origin;
      return move(block, `scaleX(${from})`, `scaleX(${to})`, (IS_REPEAT_VISIT ? CONFIG.loader.REVEAL_DURATION_REPEAT : CONFIG.loader.REVEAL_DURATION) * 1000, "cubic-bezier(.76,0,.24,1)");
    };
    const count = (from: number, to: number) =>
      move(counter, `translateY(-${from}em)`, `translateY(-${to}em)`, countTime * (to - from) / 100, `steps(${to - from}, end)`);
    const run = async () => {
      await wipe("right", 0, 1);
      viewport.style.opacity = "1";
      await wipe("left", 1, 0);
      let shown = 0;
      while (!cancelled && shown < 100) {
        const next = target();
        if (next > shown) {
          await count(shown, next);
          shown = next;
        } else {
          await new Promise<void>(resolve => { wake.current = resolve; });
        }
      }
      if (reduced) {
        await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      }
      if (cancelled) return;
      if (IS_REPEAT_VISIT) {
        startHero();
        animation = viewport.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: reduced ? 0 : CONFIG.loader.REVEAL_DURATION_REPEAT * 1000,
          fill: "forwards",
        });
        await animation.finished;
      } else {
        await wipe("left", 0, 1);
        viewport.style.opacity = "0";
        startHero();
        await wipe("right", 1, 0);
      }
      finish();
    };
    void run().catch(error => { if (!cancelled) throw error; });
    return () => {
      cancelled = true;
      animation?.cancel();
      wake.current?.();
      wake.current = null;
    };
  }, []);
  useEffect(() => { wake.current?.(); }, [canvasReady, ready]);

  return (
    <div role="status" aria-label="Loading portfolio" className="fixed inset-0 z-50 flex items-center justify-center text-(--text-primary) font-karla font-extrabold text-6xl pointer-events-none">
      <div className="block-line-wrapper" aria-hidden="true">
        <div ref={blockRef} className="block-revealer bg-(--text-primary)" style={{ transform: "scaleX(0)", height: "100%" }} />
        <div ref={windowRef} className="h-[1em] overflow-hidden leading-none opacity-0 px-4 tabular-nums">
          <div ref={counterRef} data-loader-count="" className="text-center">
            {digits.map(value => <div key={value} className="h-[1em]">{value}</div>)}
          </div>
        </div>
      </div>
    </div>
  );
}
