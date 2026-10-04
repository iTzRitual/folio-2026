"use client";

import { useEffect, useRef } from "react";
import { WebGLRenderer } from "three";
import { checkDetailsLayout } from "../../../../scripts/details-layout-contract";
import { checkOrbitCollision } from "../../../../scripts/check-orbit-collision-browser";
import { checkSkullStartup } from "../../../../scripts/check-skull-startup-browser";
import { checkSkullEntrance } from "../../../../scripts/check-skull-entrance-browser";
import { checkSkullSeams } from "../../../../scripts/check-skull-seams-browser";
import { checkSkullPause } from "../../../../scripts/check-skull-pause-browser";
import { checkEffects } from "../../../../scripts/check-effects-browser";

export default function RegressionLab() {
  const output = useRef<HTMLPreElement>(null);

  useEffect(() => {
    let cancelled = false;
    void document.fonts.ready.then(async () => {
      if (cancelled || !output.current) return;
      let renderer: WebGLRenderer | undefined;
      try {
        renderer = new WebGLRenderer();
        const results = [checkDetailsLayout(true)];
        for (const check of [checkOrbitCollision, checkSkullStartup, checkSkullEntrance, checkSkullSeams, checkSkullPause, checkEffects]) {
          results.push(await check(renderer));
          if (cancelled || !output.current) return;
        }
        output.current.textContent = results.join("\n\n");
        output.current.dataset.status = "passed";
      } catch (error) {
        if (cancelled || !output.current) return;
        output.current.textContent = error instanceof Error ? error.stack ?? error.message : String(error);
        output.current.dataset.status = "failed";
      } finally {
        renderer?.dispose();
        renderer?.forceContextLoss();
      }
    });
    return () => { cancelled = true; };
  }, []);

  return <pre ref={output} data-regression-result data-status="running">Running browser regression checks…</pre>;
}
