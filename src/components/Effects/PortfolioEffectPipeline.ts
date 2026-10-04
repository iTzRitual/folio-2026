import { EffectComposer, EffectPass, RenderPass } from "postprocessing";
import { HalfFloatType, type Camera, type Scene, type WebGLRenderer } from "three";
import { CustomAberrationEffect } from "./CustomAberrationEffect";
import { HeaderExclusionEffect } from "./HeaderExclusionEffect";

export class PortfolioEffectPipeline {
  readonly composer: EffectComposer;
  readonly header: HeaderExclusionEffect;
  readonly aberration: CustomAberrationEffect;
  private readonly headerPass: EffectPass;
  private readonly aberrationPass: EffectPass;
  private readonly renderer: WebGLRenderer;
  private readonly autoClear: boolean;
  private disposed = false;

  constructor(renderer: WebGLRenderer, scene: Scene, camera: Camera) {
    this.renderer = renderer;
    this.autoClear = renderer.autoClear;
    this.header = new HeaderExclusionEffect(scene, camera);
    this.aberration = new CustomAberrationEffect();
    this.headerPass = new EffectPass(camera, this.header);
    this.aberrationPass = new EffectPass(camera, this.aberration);
    this.composer = new EffectComposer(renderer, { multisampling: 0, frameBufferType: HalfFloatType });
    this.composer.autoRenderToScreen = false;
    this.composer.addPass(new RenderPass(scene, camera));
    this.composer.addPass(this.headerPass);
    this.composer.addPass(this.aberrationPass);
    this.setAberrationEnabled(true);
  }

  setAberrationEnabled(enabled: boolean) {
    this.headerPass.renderToScreen = !enabled;
    this.aberrationPass.renderToScreen = enabled;
    this.aberrationPass.enabled = enabled;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.composer.dispose();
    this.renderer.autoClear = this.autoClear;
  }
}
