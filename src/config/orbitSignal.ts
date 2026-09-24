import saved from "./orbitSignal.json";

export const SIGNAL_MODES = ["interference", "dropout", "soft"] as const;
export const SIGNAL_CONTROLS = {
  density: { label: "Dropout frequency", min: 0.2, max: 0.85, step: 0.01 },
  size: { label: "Fragment size", min: 0.5, max: 2, step: 0.05 },
  drift: { label: "Travel along ring", min: 0.1, max: 1.2, step: 0.01 },
  bursts: { label: "Sudden interference", min: 0, max: 1, step: 0.05 },
  displacement: { label: "Tearing", min: 0, max: 1, step: 0.05 },
  separation: { label: "Colour separation", min: 0, max: 1, step: 0.05 },
  clearance: { label: "Reveal strength", min: 0.3, max: 0.85, step: 0.01 },
  pace: { label: "Tempo", min: 0.3, max: 1.5, step: 0.05 },
} as const;

export type OrbitSignalConfig = {
  seed: number;
  mode: (typeof SIGNAL_MODES)[number];
} & Record<keyof typeof SIGNAL_CONTROLS, number>;

export function parseOrbitSignalConfig(value: unknown): OrbitSignalConfig | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== Object.keys(SIGNAL_CONTROLS).length + 2) return null;
  if (typeof record.seed !== "number" || !Number.isInteger(record.seed) || record.seed < 0 || record.seed > 999999) return null;
  if (!SIGNAL_MODES.some((mode) => mode === record.mode)) return null;
  for (const [key, bounds] of Object.entries(SIGNAL_CONTROLS)) {
    const field = record[key];
    if (typeof field !== "number" || !Number.isFinite(field) || field < bounds.min || field > bounds.max) return null;
  }
  return { ...record } as OrbitSignalConfig;
}

const parsed = parseOrbitSignalConfig(saved);
if (!parsed) throw new Error("Invalid saved orbit signal configuration");
export const ORBIT_SIGNAL_DEFAULTS: OrbitSignalConfig = parsed;
