"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Home from "../../page";
import { OrbitSignalContext } from "@/context/OrbitSignalContext";
import { ORBIT_SIGNAL_DEFAULTS, SIGNAL_CONTROLS, SIGNAL_MODES, type OrbitSignalConfig } from "@/config/orbitSignal";
import styles from "./lab.module.css";

export default function HologramLab() {
  const [config, setConfig] = useState<OrbitSignalConfig>(ORBIT_SIGNAL_DEFAULTS);
  const [paused, setPaused] = useState(false);
  const [time, setTime] = useState(6);
  const [saved, setSaved] = useState<OrbitSignalConfig[]>([]);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const value = useMemo(() => ({ config, previewTime: paused ? time : null }), [config, paused, time]);
  const regenerate = () => {
    const seed = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
    setConfig((current) => ({ ...current, seed }));
  };
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
      <div onClick={(event) => { if (event.target instanceof HTMLCanvasElement) regenerate(); }}>
        <Home />
      </div>
      <aside className={styles.panel} aria-label="Hologram controls">
        <details open>
          <summary>Hologram lab <span>Seed {config.seed}</span></summary>
          <p>Click the canvas for another variation. Keep a few, compare, then save your favourite.</p>
          <label className={styles.row}>
            Character
            <select value={config.mode} onChange={(event) => setConfig((current) => ({ ...current, mode: event.target.value as OrbitSignalConfig["mode"] }))}>
              {SIGNAL_MODES.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
            </select>
          </label>
          {Object.entries(SIGNAL_CONTROLS).map(([key, control]) => (
            <label className={styles.control} key={key} htmlFor={`signal-${key}`}>
              <span>{control.label}<output>{config[key as keyof typeof SIGNAL_CONTROLS].toFixed(2)}</output></span>
              <input id={`signal-${key}`} type="range" min={control.min} max={control.max} step={control.step} value={config[key as keyof typeof SIGNAL_CONTROLS]} onChange={(event) => setConfig((current) => ({ ...current, [key]: Number(event.target.value) }))} />
            </label>
          ))}
          <label className={styles.row}>Freeze signal <input type="checkbox" checked={paused} onChange={(event) => setPaused(event.target.checked)} /></label>
          <label className={styles.control} htmlFor="signal-time">
            <span>Preview time<output>{time.toFixed(1)}s</output></span>
            <input id="signal-time" type="range" min="0" max="30" step="0.1" value={time} disabled={!paused} onChange={(event) => setTime(Number(event.target.value))} />
          </label>
          <div className={styles.buttons}>
            <button onClick={regenerate}>New seed</button>
            <button onClick={keep}>Keep variant</button>
            <button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save to site"}</button>
          </div>
          {saved.length > 0 && <div className={styles.saved} aria-label="Kept variants">
            {saved.map((variant, index) => <button key={index} onClick={() => setConfig({ ...variant })}>{index + 1} · {variant.mode} · {variant.seed}</button>)}
          </div>}
          <p role="status">{status}</p>
          <Link href="/debug">Back to debug</Link>
        </details>
      </aside>
    </OrbitSignalContext.Provider>
  );
}
