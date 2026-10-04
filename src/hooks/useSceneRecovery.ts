"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SceneStatus = "loading" | "ready" | "failed";

export function useSceneRecovery() {
  const [status, setStatus] = useState<SceneStatus>("loading");
  const initializationError = useRef<Error | null>(null);
  const fail = useCallback((error: unknown) => {
    initializationError.current = error instanceof Error ? error : null;
    setStatus("failed");
  }, []);
  const ready = useCallback(() => {
    setStatus(current => current === "loading" ? "ready" : current);
  }, []);

  useEffect(() => {
    const onInitializationRejection = (event: PromiseRejectionEvent) => {
      const ownedError = initializationError.current;
      if (!ownedError || event.reason !== ownedError) return;
      initializationError.current = null;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    window.addEventListener("unhandledrejection", onInitializationRejection, { capture: true });
    return () => window.removeEventListener("unhandledrejection", onInitializationRejection, { capture: true });
  }, []);

  return { status, fail, ready };
}
