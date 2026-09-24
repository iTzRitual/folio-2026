"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Home from "../../page";
import { OrbitSignalContext } from "@/context/OrbitSignalContext";
import { ORBIT_SIGNAL_DEFAULTS, SIGNAL_CONTROLS, HOLOGRAM_STYLES, GLITCH_SCOPES, type OrbitSignalConfig } from "@/config/orbitSignal";
import styles from "./lab.module.css";

export default function HologramLab() {
  const [overrides, setConfig] = useState<Partial<OrbitSignalConfig>>({});
  const config = useMemo(() => ({ ...ORBIT_SIGNAL_DEFAULTS, ...overrides }), [overrides]);
  const [saved, setSaved] = useState<OrbitSignalConfig[]>([]);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const value = useMemo(() => ({ config }), [config]);
  const keep = () => setSaved((current) => [...current, { ...config }].slice(-8));
  const save = async () => {
    setSaving(true);
    setStatus("Saving…");
    try {
      const json = JSON.stringify(config, null, 2);
      const clipboard = navigator.clipboard?.writeText(json).then(() => true, () => false) ?? Promise.resolve(false);
      const response = await fetch("/api/lab/hologram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: json,
      });
      if (!response.ok) throw new Error("Could not save the configuration. Please try again.");
      const copied = await clipboard;
      keep();
      setStatus(`Saved: src/config/orbitSignal.json${copied ? " · JSON copied" : ""}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save the configuration.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <OrbitSignalContext.Provider value={value}>
      <Home />
      <aside className={styles.panel} aria-label="Hologram controls">
        <details open>
          <summary>Hologram lab</summary>
          <p>Tune the ring live. Card size keeps the original video proportions. Gap reserves space between cards; Card size can shrink them further.</p>
          <label className={styles.row} htmlFor="hologram-style">
            Card style
            <select id="hologram-style" value={config.style} onChange={(event) => setConfig((current) => ({ ...current, style: event.target.value as OrbitSignalConfig["style"] }))}>
              {Object.entries(HOLOGRAM_STYLES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          <label className={styles.row} htmlFor="glitch-scope">
            Glitch scope
            <select id="glitch-scope" value={config.glitchScope} onChange={(event) => setConfig((current) => ({ ...current, glitchScope: event.target.value as OrbitSignalConfig["glitchScope"] }))}>
              {Object.entries(GLITCH_SCOPES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          {Object.entries(SIGNAL_CONTROLS).map(([key, control]) => (
            <label className={styles.control} key={key} htmlFor={`signal-${key}`}>
              <span>{control.label}<output>{config[key as keyof typeof SIGNAL_CONTROLS].toFixed(2)}</output></span>
              <input id={`signal-${key}`} type="range" min={control.min} max={control.max} step={control.step} value={config[key as keyof typeof SIGNAL_CONTROLS]} onChange={(event) => setConfig((current) => ({ ...current, [key]: Number(event.target.value) }))} />
            </label>
          ))}
          <div className={styles.buttons}>
            <button onClick={() => setConfig({ ...ORBIT_SIGNAL_DEFAULTS })}>Reset</button>
            <button onClick={keep}>Keep variant</button>
            <button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save to site"}</button>
          </div>
          {saved.length > 0 && <div className={styles.saved} aria-label="Kept variants">
            {saved.map((variant, index) => <button key={index} onClick={() => setConfig({ ...variant })}>{index + 1} · {HOLOGRAM_STYLES[variant.style]} · {GLITCH_SCOPES[variant.glitchScope]} · {Math.round(variant.contentOpacity * 100)}% · {Math.round(variant.frontOpacity * 100)}%</button>)}
          </div>}
          <p role="status">{status}</p>
          <Link href="/debug">Back to debug</Link>
        </details>
      </aside>
    </OrbitSignalContext.Provider>
  );
}
