"use client";

import { useSyncExternalStore } from "react";
import type { SceneInputMode } from "@/lib/responsiveScene";

const QUERY = "(hover: hover) and (pointer: fine)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getSnapshot(): SceneInputMode {
  return window.matchMedia(QUERY).matches ? "fine" : "coarse";
}

export function useInputMode(): SceneInputMode {
  return useSyncExternalStore(subscribe, getSnapshot, () => "fine");
}
