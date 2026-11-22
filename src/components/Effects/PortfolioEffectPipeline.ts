import { EffectComposer, EffectPass, RenderPass, SMAAEffect, SMAAPreset } from "postprocessing";
import { HalfFloatType, type Camera, type Scene, type WebGLRenderer, type WebGLRenderTarget } from "three";
import { CONFIG } from "@/config/constants";
import { CustomAberrationEffect } from "./CustomAberrationEffect";
import { HeaderExclusionEffect } from "./HeaderExclusionEffect";

export function selectAntialiasingSamples(colorSamples: Iterable<number>, depthSamples: Iterable<number>, budget: number = CONFIG.antialiasing.MSAA_SAMPLES) {
  const depth = new Set(depthSamples);
  return Math.max(0, ...Array.from(colorSamples).filter(samples =>
    samples > 1 && samples <= budget && depth.has(samples),
  ));
}

export class PortfolioEffectPipeline {
  readonly composer: EffectComposer;
  readonly header: HeaderExclusionEffect;
  readonly aberration: CustomAberrationEffect;
  readonly antialiasing: SMAAEffect;
  private readonly headerPass: EffectPass;
  private readonly aberrationPass: EffectPass;
  private readonly antialiasingPass: EffectPass;
  private readonly multisampling: number;
  private readonly workstationMultisampling: number;
  private readonly inputBuffers = new Map<number, WebGLRenderTarget>();
  private readonly renderer: WebGLRenderer;
  private readonly autoClear: boolean;
  private disposed = false;

  constructor(renderer: WebGLRenderer, scene: Scene, camera: Camera) {
    this.renderer = renderer;
    this.autoClear = renderer.autoClear;
    const context = renderer.getContext() as WebGL2RenderingContext;
    const colorSamples: Int32Array = context.getInternalformatParameter(context.RENDERBUFFER, context.RGBA16F, context.SAMPLES);
    const depthSamples: Int32Array = context.getInternalformatParameter(context.RENDERBUFFER, context.DEPTH_COMPONENT24, context.SAMPLES);
    this.workstationMultisampling = selectAntialiasingSamples(colorSamples, depthSamples, CONFIG.antialiasing.WORKSTATION_MSAA_SAMPLES);
    this.multisampling = selectAntialiasingSamples(colorSamples, depthSamples) || this.workstationMultisampling;
    this.header = new HeaderExclusionEffect(scene, camera);
    this.aberration = new CustomAberrationEffect();
    this.antialiasing = new SMAAEffect({ preset: SMAAPreset[CONFIG.antialiasing.SMAA_PRESET] });
    this.headerPass = new EffectPass(camera, this.header);
    this.aberrationPass = new EffectPass(camera, this.aberration);
    this.composer = new EffectComposer(renderer, { multisampling: this.multisampling, frameBufferType: HalfFloatType });
    this.composer.outputBuffer.samples = 0;
    this.inputBuffers.set(this.multisampling, this.composer.inputBuffer);
    this.composer.autoRenderToScreen = false;
    this.composer.addPass(new RenderPass(scene, camera));
    this.composer.addPass(this.headerPass);
    this.composer.addPass(this.aberrationPass);
    this.antialiasingPass = new EffectPass(camera, this.antialiasing);
    this.composer.addPass(this.antialiasingPass);
    this.setAntialiasingMode("msaa");
    this.setAberrationEnabled(true);
  }

  resize(width: number, height: number) {
    this.composer.setSize(width, height);
    const active = this.composer.inputBuffer;
    for (const target of this.inputBuffers.values()) {
      if (target !== active && (target.width !== active.width || target.height !== active.height)) {
        target.setSize(active.width, active.height);
        this.renderer.initRenderTarget(target);
      }
    }
  }

  setAberrationEnabled(enabled: boolean) {
    this.aberrationPass.enabled = enabled;
    this.updateOutput();
  }

  setAntialiasingMode(mode: "msaa" | "smaa" | "workstation") {
    const samples = mode === "workstation" ? this.workstationMultisampling : mode === "msaa" ? this.multisampling : 0;
    if (this.composer.multisampling !== samples) {
      const current = this.composer.inputBuffer;
      let target = this.inputBuffers.get(samples);
      if (!target) {
        target = current.clone();
        target.samples = samples;
        this.inputBuffers.set(samples, target);
      }
      target.setSize(current.width, current.height);
      this.composer.inputBuffer = target;
    }
    this.antialiasingPass.enabled = samples === 0;
    this.updateOutput();
  }

  private updateOutput() {
    const antialiasing = this.antialiasingPass.enabled;
    const aberration = this.aberrationPass.enabled;
    this.headerPass.renderToScreen = !antialiasing && !aberration;
    this.aberrationPass.renderToScreen = !antialiasing && aberration;
    this.antialiasingPass.renderToScreen = antialiasing;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const target of this.inputBuffers.values()) {
      if (target !== this.composer.inputBuffer) target.dispose();
    }
    this.inputBuffers.clear();
    this.composer.dispose();
    this.renderer.autoClear = this.autoClear;
  }
}
