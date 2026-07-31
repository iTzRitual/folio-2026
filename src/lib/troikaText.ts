import type { Mesh } from "three";

/**
 * Troika reads `outlineColor` off the mesh on every render, so it can be
 * repainted per frame without a resync — unlike the geometry-bearing props.
 */
export type OutlinedText = Mesh & { outlineColor: string };
