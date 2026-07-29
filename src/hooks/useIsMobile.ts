import { useMemo, useSyncExternalStore } from "react";

export function useIsMobile(breakpoint = 768) {
  // Resolved during the first client render rather than in an effect, so the
  // mobile page does not lay itself out as desktop once and then correct.
  // A media query listener also replaces a resize handler that fired on every
  // event to recompute one boolean.
  const store = useMemo(() => {
    const query = `(max-width: ${breakpoint - 1}px)`;

    return {
      subscribe(onChange: () => void) {
        const mql = window.matchMedia(query);
        mql.addEventListener("change", onChange);
        return () => mql.removeEventListener("change", onChange);
      },
      getSnapshot: () => window.matchMedia(query).matches,
    };
  }, [breakpoint]);

  return useSyncExternalStore(store.subscribe, store.getSnapshot, () => false);
}
