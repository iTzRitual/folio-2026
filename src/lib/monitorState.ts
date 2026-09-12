import { MathUtils } from "three";
import { CONFIG } from "@/config/constants";

export interface MonitorState {
  power: boolean;
  syncExternal: boolean;
  inputMode: "LINE" | "RGB";
  lineInput: "A" | "B";
  rgbMode: "RGB" | "COMPONENT";
  blueOnly: boolean;
  underScan: boolean;
  hvDelay: boolean;
  aperture: number;
  brightness: number;
  chroma: number;
  phase: number;
  contrast: number;
  biasR: number;
  biasG: number;
  biasB: number;
  gainR: number;
  gainG: number;
  gainB: number;
}

export const MONITOR_DEFAULTS: Readonly<MonitorState> = Object.freeze({
  power: true,
  syncExternal: false,
  inputMode: "LINE",
  lineInput: "A",
  rgbMode: "RGB",
  blueOnly: false,
  underScan: false,
  hvDelay: false,
  aperture: 0,
  brightness: 0,
  chroma: 0,
  phase: 0,
  contrast: 0,
  biasR: 0,
  biasG: 0,
  biasB: 0,
  gainR: 1,
  gainG: 1,
  gainB: 1,
});

export type MonitorKnob = "aperture" | "brightness" | "chroma" | "phase" | "contrast" |
  "biasR" | "biasG" | "biasB" | "gainR" | "gainG" | "gainB";
export type MonitorButton = "power" | "syncExternal" | "inputMode" | "inputSelect" | "blueOnly" | "underScan" | "hvDelay";
export type MonitorControl = MonitorKnob | MonitorButton;

export function createMonitorState(): MonitorState {
  return { ...MONITOR_DEFAULTS };
}

export function toggleMonitorButton(state: MonitorState, control: MonitorButton) {
  if (control === "power") {
    const power = !state.power;
    const inputMode = state.inputMode;
    const lineInput = state.lineInput;
    const rgbMode = state.rgbMode;
    Object.assign(state, MONITOR_DEFAULTS, { power });
    Object.assign(state, { inputMode, lineInput, rgbMode });
  } else if (state.power) {
    if (control === "inputMode") state.inputMode = state.inputMode === "LINE" ? "RGB" : "LINE";
    else if (control === "inputSelect") {
      if (state.inputMode === "LINE") state.lineInput = state.lineInput === "A" ? "B" : "A";
      else state.rgbMode = state.rgbMode === "RGB" ? "COMPONENT" : "RGB";
    } else state[control] = !state[control];
  }
}

export function buttonActive(state: MonitorState, control: MonitorButton) {
  if (control === "power") return !state.power;
  if (!state.power) return false;
  if (control === "inputMode") return state.inputMode === "RGB";
  if (control === "inputSelect") return state.inputMode === "LINE" ? state.lineInput === "B" : state.rgbMode === "COMPONENT";
  return state[control];
}

export function knobNormalized(state: MonitorState, key: MonitorKnob) {
  if (key.startsWith("bias")) return state[key] / CONFIG.monitor.BIAS_RANGE;
  if (key.startsWith("gain")) return (state[key] - 1) / CONFIG.monitor.GAIN_RANGE;
  return state[key];
}

export function setMonitorKnob(state: MonitorState, key: MonitorKnob, value: number) {
  if (!state.power) return;
  const normalized = MathUtils.clamp(value, -1, 1);
  state[key] = key.startsWith("bias") ? normalized * CONFIG.monitor.BIAS_RANGE : key.startsWith("gain") ? 1 + normalized * CONFIG.monitor.GAIN_RANGE : normalized;
}

export function resetMonitorKnob(state: MonitorState, key: MonitorKnob) {
  if (state.power) state[key] = MONITOR_DEFAULTS[key];
}

export function monitorHasSignal(state: MonitorState) {
  return state.power && !(state.inputMode === "LINE" && state.lineInput === "B");
}
