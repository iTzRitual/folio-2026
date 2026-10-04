"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { WorkstationDesktop, type DesktopPresentation, type DesktopReturn, type WindowAppId } from "@/lib/workstationDesktop";

export default function DesktopFixture() {
  const controller = useMemo(() => new WorkstationDesktop(), []);
  const output = useRef<HTMLOutputElement>(null);
  const safari = useRef<HTMLDivElement>(null);
  const vscode = useRef<HTMLDivElement>(null);
  const bridge = useRef<DesktopReturn | null>(null);
  const visible = useRef({ safari: true, vscode: false });
  const reducedMotion = usePrefersReducedMotion();
  const presentation = useMemo<DesktopPresentation>(() => ({
    canPresent: app => Boolean(app === "safari" ? safari.current : vscode.current),
    isVisible: app => visible.current[app],
    prepareAnimation: () => {},
    present: (app, amount, shown) => {
      const element = app === "safari" ? safari.current : vscode.current;
      visible.current[app] = shown;
      if (!element) return;
      element.hidden = !shown;
      element.style.transform = `translateY(${amount * 250}px) scale(${1 - amount * 0.9})`;
    },
  }), []);

  useEffect(() => {
    let frame = 0;
    let previous = performance.now();
    const update = (now: number) => {
      if (!bridge.current) controller.update(Math.min((now - previous) / 1000, 0.1), reducedMotion, presentation);
      previous = now;
      if (output.current) {
        const state = { ...controller.snapshot(presentation), bridge: bridge.current !== null, reducedMotion };
        output.current.value = JSON.stringify(state);
        output.current.dataset.desktopState = JSON.stringify(state);
      }
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [controller, presentation, reducedMotion]);

  const switchTo = (app: WindowAppId) => controller.switchTo(app, reducedMotion, presentation);

  return (
    <main className="min-h-screen bg-white p-8 text-black">
      <div className="flex flex-wrap gap-4">
        <button data-command="switch-safari" onClick={() => switchTo("safari")}>Safari</button>
        <button data-command="switch-vscode" onClick={() => switchTo("vscode")}>VS Code</button>
        <button data-command="close-safari" onClick={() => controller.close("safari", presentation)}>Close Safari</button>
        <button data-command="close-vscode" onClick={() => controller.close("vscode", presentation)}>Close VS Code</button>
        <button data-command="minimize-safari" onClick={() => controller.animateTo("safari", 1, reducedMotion, presentation)}>Minimize Safari</button>
        <button data-command="begin-return" onClick={() => { bridge.current = controller.beginReturn(reducedMotion, presentation); }}>Begin return</button>
        <button data-command="restore-return" onClick={() => {
          if (!bridge.current) return;
          controller.restore(bridge.current.snapshot, reducedMotion, presentation);
          bridge.current = null;
        }}>Restore return</button>
        <button data-command="commit-return" onClick={() => {
          if (!bridge.current) return;
          controller.commitReturn(bridge.current.sourceApp, reducedMotion, presentation);
          bridge.current = null;
        }}>Commit return</button>
      </div>
      <div className="relative mt-8 h-80">
        <div ref={safari} className="absolute h-40 w-80 bg-blue-100 p-4">Safari</div>
        <div ref={vscode} hidden className="absolute h-40 w-80 bg-gray-300 p-4">VS Code</div>
      </div>
      <output ref={output} className="block font-mono wrap-break-word" />
    </main>
  );
}
