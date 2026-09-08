import { Vector2, Vector3 } from "three";
import { CONFIG } from "@/config/constants";
import type { MonitorState } from "./monitorState";

export const monitorShader = `
uniform float monitorTime;
uniform float monitorSync;
uniform float monitorUnderScan;
uniform float monitorDelay;
uniform float monitorInput;
uniform float monitorNoSignal;
uniform float monitorBlue;
uniform float monitorAperture;
uniform float monitorBrightness;
uniform float monitorChroma;
uniform float monitorPhase;
uniform float monitorContrast;
uniform vec3 monitorBias;
uniform vec3 monitorGain;
uniform vec2 monitorPowerSize;
uniform float monitorPowerLevel;
uniform float monitorPowerFlash;
float monitorHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453);
}
vec3 monitorSample(vec2 uv) {
  vec3 c = texture2D(desktop, uv).rgb;
  if (monitorNoSignal > 0.5) {
    float snow = monitorHash(floor(uv / texel) + floor(monitorTime * ${CONFIG.monitor.NO_SIGNAL_HZ.toFixed(8)}));
    return vec3(${CONFIG.monitor.NO_SIGNAL_FLOOR.toFixed(8)} + snow * ${CONFIG.monitor.NO_SIGNAL_NOISE.toFixed(8)});
  }
  if (monitorInput == 2.0) {
    vec3 adjacent = texture2D(desktop, uv + vec2(texel.x, 0.0)).rgb;
    float luminance = dot(c, vec3(0.299,0.587,0.114));
    c = mix(c, adjacent, ${CONFIG.monitor.COMPONENT_BLEED.toFixed(8)});
    c += luminance - dot(c, vec3(0.299,0.587,0.114));
  }
  return c;
}
vec3 monitorColor(vec3 c) {
  c = c * monitorGain + monitorBias;
  if (monitorInput == 0.0 && monitorPhase != 0.0) {
    vec3 axis = normalize(vec3(1.0));
    float angle = monitorPhase * ${CONFIG.monitor.PHASE_RANGE.toFixed(8)};
    c = c * cos(angle) + cross(axis, c) * sin(angle) + axis * dot(axis, c) * (1.0 - cos(angle));
  }
  if (monitorInput != 1.0 && monitorChroma != 0.0) {
    float luma = dot(c, vec3(0.299,0.587,0.114));
    c = mix(vec3(luma), c, 1.0 + monitorChroma * ${CONFIG.monitor.CHROMA_RANGE.toFixed(8)});
  }
  if (monitorContrast != 0.0) c = (c - 0.5) * (1.0 + monitorContrast * ${CONFIG.monitor.CONTRAST_RANGE.toFixed(8)}) + 0.5;
  if (monitorBrightness < 0.0) c *= 1.0 + monitorBrightness * ${CONFIG.monitor.BRIGHTNESS_DIM.toFixed(8)};
  else c += monitorBrightness * ${CONFIG.monitor.BRIGHTNESS_LIFT.toFixed(8)};
  if (monitorBlue > 0.5) c.rg = vec2(0.0);
  return c;
}
`;

export function createMonitorUniforms() {
  return {
    monitorTime: { value: 0 }, monitorSync: { value: 0 }, monitorUnderScan: { value: 1 },
    monitorDelay: { value: 0 }, monitorInput: { value: 0 }, monitorNoSignal: { value: 0 },
    monitorBlue: { value: 0 }, monitorAperture: { value: 0 }, monitorBrightness: { value: 0 },
    monitorChroma: { value: 0 }, monitorPhase: { value: 0 }, monitorContrast: { value: 0 },
    monitorBias: { value: new Vector3() }, monitorGain: { value: new Vector3(1, 1, 1) },
    monitorPowerSize: { value: new Vector2(1, 1) }, monitorPowerLevel: { value: 1 }, monitorPowerFlash: { value: 0 },
  };
}

export function createMonitorScreenRuntime() {
  let powerAmount = 1;
  let sync = 0;
  let underScan = 1;
  let time = 0;
  return {
    update(uniforms: ReturnType<typeof createMonitorUniforms>, state: MonitorState, delta: number, reducedMotion: boolean) {
      time += delta;
      const blend = 1 - Math.exp(-CONFIG.monitor.RESPONSE * delta);
      sync += (Number(state.syncExternal) - sync) * blend;
      if (!state.power || (!state.syncExternal && sync < 0.00001)) sync = 0;
      const targetScale = state.underScan ? CONFIG.monitor.UNDERSCAN_SCALE : 1;
      underScan += (targetScale - underScan) * (reducedMotion ? 1 : blend);
      if (!state.power || Math.abs(underScan - targetScale) < 0.00001) underScan = targetScale;
      powerAmount = Math.max(0, Math.min(1, powerAmount + (state.power ? delta / CONFIG.monitor.POWER_ON_SECONDS : -delta / CONFIG.monitor.POWER_OFF_SECONDS)));
      uniforms.monitorTime.value = reducedMotion ? 0 : time;
      uniforms.monitorSync.value = reducedMotion ? 0 : sync;
      uniforms.monitorUnderScan.value = underScan;
      uniforms.monitorDelay.value = Number(state.hvDelay);
      uniforms.monitorInput.value = state.inputMode === "LINE" ? 0 : state.rgbMode === "RGB" ? 1 : 2;
      uniforms.monitorNoSignal.value = Number(state.inputMode === "LINE" && state.lineInput === "B");
      uniforms.monitorBlue.value = Number(state.blueOnly);
      uniforms.monitorAperture.value = state.aperture;
      uniforms.monitorBrightness.value = state.brightness;
      uniforms.monitorChroma.value = state.chroma;
      uniforms.monitorPhase.value = state.phase;
      uniforms.monitorContrast.value = state.contrast;
      uniforms.monitorBias.value.set(state.biasR, state.biasG, state.biasB);
      uniforms.monitorGain.value.set(state.gainR, state.gainG, state.gainB);
      uniforms.monitorPowerSize.value.set(reducedMotion ? 1 : Math.max(0.004, Math.min(1, (powerAmount - 0.12) / 0.3)), reducedMotion ? 1 : Math.max(0.002, Math.min(1, Math.pow(Math.max(0, (powerAmount - 0.42) / 0.58), 2))));
      uniforms.monitorPowerLevel.value = reducedMotion ? powerAmount : Math.min(1, powerAmount / 0.12);
      uniforms.monitorPowerFlash.value = reducedMotion || powerAmount === 0 || powerAmount === 1 ? 0 : Math.sin(Math.PI * powerAmount) * 0.6;
    },
  };
}
