import saved from "./orbitSignal.json";

export const HOLOGRAM_STYLES = { hologram: "Classic hologram", cyberpunk: "Cyberpunk HUD" } as const;

export const GLITCH_SCOPES = { card: "Whole card", media: "Image / video only" } as const;

export const SIGNAL_CONTROLS = {
  glitch: { label: "Glitch intensity", min: 0, max: 1, step: 0.01 },
  hudDetail: { label: "HUD detail intensity", min: 0, max: 1, step: 0.01 },
  count: { label: "Number of cards", min: 6, max: 24, step: 1 },
  gap: { label: "Gap between cards", min: 0.08, max: 0.65, step: 0.01 },
  cardScale: { label: "Card size", min: 0.5, max: 1, step: 0.01 },
  radius: { label: "Orbit radius", min: 1.1, max: 2, step: 0.01 },
  offsetY: { label: "Vertical position", min: -0.4, max: 0.4, step: 0.01 },
  tiltX: { label: "Orbit tilt", min: -30, max: 30, step: 1 },
  tiltZ: { label: "Orbit slant", min: -35, max: 35, step: 1 },
  illumination: { label: "Light on skull", min: 0, max: 1, step: 0.01 },
  occlusion: { label: "Soft shadow on skull", min: 0, max: 0.6, step: 0.01 },
  contentOpacity: { label: "Content opacity", min: 0.5, max: 0.9, step: 0.01 },
  frontOpacity: { label: "Opacity in front of skull", min: 0.08, max: 0.4, step: 0.01 },
  fadeReach: { label: "Fade reach", min: 0.8, max: 1.8, step: 0.05 },
  glow: { label: "Frame glow", min: 0, max: 0.4, step: 0.01 },
} as const;

export type OrbitSignalConfig = Record<keyof typeof SIGNAL_CONTROLS, number> & { style: keyof typeof HOLOGRAM_STYLES; glitchScope: keyof typeof GLITCH_SCOPES };

export function parseOrbitSignalConfig(value: unknown): OrbitSignalConfig | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== Object.keys(SIGNAL_CONTROLS).length + 2) return null;
  for (const [key, bounds] of Object.entries(SIGNAL_CONTROLS)) {
    const field = record[key];
    if (typeof field !== "number" || !Number.isFinite(field) || field < bounds.min || field > bounds.max) return null;
  }
  if (record.style !== "hologram" && record.style !== "cyberpunk") return null;
  if (record.glitchScope !== "card" && record.glitchScope !== "media") return null;
  if (!Number.isInteger(record.count)) return null;
  return { ...record } as OrbitSignalConfig;
}

const parsed = parseOrbitSignalConfig(saved);
if (!parsed) throw new Error("Invalid saved hologram configuration");
export const ORBIT_SIGNAL_DEFAULTS: OrbitSignalConfig = parsed;
