import { EffectComposer, EffectPass, RenderPass, SMAAEffect, SMAAPreset } from "postprocessing";
import { HalfFloatType, type Camera, type Scene, type WebGLRenderer } from "three";
import { CONFIG } from "@/config/constants";
import { CustomAberrationEffect } from "./CustomAberrationEffect";
import { HeaderExclusionEffect } from "./HeaderExclusionEffect";

export function selectAntialiasingSamples(colorSamples: Iterable<number>, depthSamples: Iterable<number>) {
  const depth = new Set(depthSamples);
  return Math.max(0, ...Array.from(colorSamples).filter(samples =>
    samples > 1 && samples <= CONFIG.antialiasing.MSAA_SAMPLES && depth.has(samples),
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
  private readonly renderer: WebGLRenderer;
  private readonly autoClear: boolean;
  private disposed = false;

  constructor(renderer: WebGLRenderer, scene: Scene, camera: Camera) {
    this.renderer = renderer;
    this.autoClear = renderer.autoClear;
    const context = renderer.getContext() as WebGL2RenderingContext;
    const colorSamples: Int32Array = context.getInternalformatParameter(context.RENDERBUFFER, context.RGBA16F, context.SAMPLES);
    const depthSamples: Int32Array = context.getInternalformatParameter(context.RENDERBUFFER, context.DEPTH_COMPONENT24, context.SAMPLES);
    this.multisampling = selectAntialiasingSamples(colorSamples, depthSamples);
    this.header = new HeaderExclusionEffect(scene, camera);
    this.aberration = new CustomAberrationEffect();
    this.antialiasing = new SMAAEffect({ preset: SMAAPreset[CONFIG.antialiasing.SMAA_PRESET] });
    this.headerPass = new EffectPass(camera, this.header);
    this.aberrationPass = new EffectPass(camera, this.aberration);
    this.composer = new EffectComposer(renderer, { multisampling: 0, frameBufferType: HalfFloatType });
    this.composer.autoRenderToScreen = false;
    this.composer.addPass(new RenderPass(scene, camera));
    this.composer.addPass(this.headerPass);
    this.composer.addPass(this.aberrationPass);
    this.antialiasingPass = new EffectPass(camera, this.antialiasing);
    this.composer.addPass(this.antialiasingPass);
    this.setAntialiasingMode("msaa");
    this.setAberrationEnabled(true);
  }

  setAberrationEnabled(enabled: boolean) {
    this.aberrationPass.enabled = enabled;
    this.updateOutput();
  }

  setAntialiasingMode(mode: "msaa" | "smaa") {
    const samples = mode === "msaa" ? this.multisampling : 0;
    if (this.composer.multisampling !== samples) this.composer.multisampling = samples;
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
    this.composer.dispose();
    this.renderer.autoClear = this.autoClear;
  }
}
