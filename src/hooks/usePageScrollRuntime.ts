"use client";

import { useEffect, useRef, useState } from "react";
import type { LenisRef } from "lenis/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { calculateDetailsOverflowViewports } from "@/lib/detailsLayout";
import {
  acquireRootScrollLock,
  rootScrollLock,
  subscribeRootScrollLock,
  type RootScrollLockLease,
} from "@/lib/rootScrollLock";
import type { BioVariant } from "@/data/content";

gsap.registerPlugin(ScrollTrigger);

const RESIZE_DEBOUNCE_MS = 150;

interface PageScrollRuntimeOptions {
  bioVariant: BioVariant;
  fontsReady: boolean;
  removeLoader: boolean;
  prefersReducedMotion: boolean;
}

export function usePageScrollRuntime({
  bioVariant,
  fontsReady,
  removeLoader,
  prefersReducedMotion,
}: PageScrollRuntimeOptions) {
  const lenisRef = useRef<LenisRef>(null);
  const loaderScrollLeaseRef = useRef<RootScrollLockLease | null>(null);
  const [overflowViewports, setOverflowViewports] = useState(0);

  useEffect(() => {
    const update = () =>
      setOverflowViewports(
        calculateDetailsOverflowViewports({
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          bioVariant,
          fontsReady,
        }),
      );

    update();

    let debounce: number | undefined;
    const onResize = () => {
      window.clearTimeout(debounce);
      debounce = window.setTimeout(update, RESIZE_DEBOUNCE_MS);
    };

    window.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(debounce);
      window.removeEventListener("resize", onResize);
    };
  }, [bioVariant, fontsReady]);

  useEffect(() => {
    ScrollTrigger.refresh();
  }, [overflowViewports]);

  useEffect(() => {
    const syncNativeScrollLock = () => {
      const overflow = rootScrollLock.preventNativeScroll ? "hidden" : "";
      document.documentElement.style.overflow = overflow;
      document.body.style.overflow = overflow;
    };
    const unsubscribe = subscribeRootScrollLock(syncNativeScrollLock);
    syncNativeScrollLock();
    return () => {
      unsubscribe();
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (!removeLoader || prefersReducedMotion) return;

    let wasLocked = false;
    let activeInstance: { start: () => void } | null = null;
    const getInstance = () => {
      const instance = lenisRef.current?.lenis;
      if (instance) activeInstance = instance;
      return instance;
    };
    const syncLock = () => {
      const instance = getInstance();
      if (!instance) return;

      if (rootScrollLock.active) {
        if (!wasLocked) instance.stop();
        wasLocked = true;
        window.scrollTo(0, rootScrollLock.y);
        return;
      }

      if (wasLocked) instance.start();
      wasLocked = false;
    };
    const unsubscribe = subscribeRootScrollLock(syncLock);
    syncLock();
    const update = (time: number) => {
      const instance = getInstance();
      if (!instance) return;

      if (rootScrollLock.active) {
        if (!wasLocked) instance.stop();
        wasLocked = true;
        window.scrollTo(0, rootScrollLock.y);
        return;
      }

      if (wasLocked) {
        instance.start();
        wasLocked = false;
      }
      instance.raf(time * 1000);
    };
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);

    return () => {
      unsubscribe();
      if (wasLocked) activeInstance?.start();
      gsap.ticker.remove(update);
    };
  }, [removeLoader, prefersReducedMotion]);

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!removeLoader) {
      loaderScrollLeaseRef.current = acquireRootScrollLock(0, {
        preventNativeScroll: true,
      });
      window.scrollTo(0, 0);
    }

    return () => {
      loaderScrollLeaseRef.current?.release();
      loaderScrollLeaseRef.current = null;
    };
  }, [removeLoader]);

  return { lenisRef, overflowViewports };
}
