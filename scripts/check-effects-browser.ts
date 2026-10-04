import { Color, PerspectiveCamera, Scene, Texture, Vector2, WebGLRenderer, type WebGLRenderTarget } from "three";
import { PortfolioEffectPipeline } from "@/components/Effects/PortfolioEffectPipeline";

export function checkEffects(renderer: WebGLRenderer) {
  const assert = (condition: boolean, message: string) => { if (!condition) throw new Error(message); };
  const scene = new Scene();
  scene.background = new Color("#28455c");
  const camera = new PerspectiveCamera();
  const size = renderer.getSize(new Vector2());
  const baselineTextures = renderer.info.memory.textures;
  const autoClear = renderer.autoClear;
  const listenerCount = (effect: unknown) => (effect as { _listeners?: { change?: unknown[] } })._listeners?.change?.length ?? 0;
  const context = renderer.getContext();
  const capture = () => {
    const pixels = new Uint8Array(4);
    context.readPixels(16, 16, 1, 1, context.RGBA, context.UNSIGNED_BYTE, pixels);
    return pixels;
  };
  try {
    renderer.setSize(32, 32);
    for (let mount = 0; mount < 4; mount++) {
      const pipeline = new PortfolioEffectPipeline(renderer, scene, camera);
      const passes = [...pipeline.composer.passes];
      const listeners = listenerCount(pipeline.aberration);
      assert(listeners === 1, "Aberration must have exactly one owning pass listener");
      const headerTexture = pipeline.header.uniforms.get("u_header")?.value;
      assert(headerTexture instanceof Texture, "Header target must expose its texture");
      const headerTarget = (pipeline.header as unknown as { target: WebGLRenderTarget }).target;
      let headerDisposals = 0;
      headerTarget.addEventListener("dispose", () => { headerDisposals++; });
      try {
        const render = renderer.render;
        const target = renderer.getRenderTarget();
        const mask = camera.layers.mask;
        const alpha = renderer.getClearAlpha();
        const background = scene.background;
        let failed = false;
        renderer.render = () => { throw new Error("Injected header render failure"); };
        try {
          pipeline.header.update(renderer);
        } catch {
          failed = true;
        } finally {
          renderer.render = render;
        }
        assert(failed && renderer.getRenderTarget() === target && camera.layers.mask === mask && renderer.getClearAlpha() === alpha && scene.background === background, "Header render failure must restore shared renderer/scene state");
        pipeline.header.setActive(false);
        pipeline.composer.render(1 / 60);
        const reference = capture();
        assert(reference.slice(0, 3).some(value => value > 0), "Pipeline output must not be blank");
        for (let change = 0; change < 16; change++) {
          pipeline.setAberrationEnabled(change % 2 === 0);
          pipeline.aberration.setTaps(change % 3 === 0 ? 3 : 8);
          pipeline.composer.setSize(change % 2 === 0 ? 48 : 32, 32);
          pipeline.composer.render(1 / 60);
          assert(pipeline.composer.passes.every((pass, index) => pass === passes[index]) && pipeline.composer.passes.length === passes.length, "Quality and resize must retain the same passes");
          assert(listenerCount(pipeline.aberration) === listeners, "Shader changes must not retain replaced pass listeners");
          assert(capture().every((value, index) => Math.abs(value - reference[index]) <= 1), "Neutral enabled/disabled effects must preserve the image");
        }
      } finally {
        const beforeDisposal = headerDisposals;
        pipeline.dispose();
        assert(headerDisposals === beforeDisposal + 1, "Header target must be disposed exactly once on teardown");
        pipeline.dispose();
        assert(headerDisposals === beforeDisposal + 1, "Repeated teardown must not dispose targets again");
      }
      assert(listenerCount(pipeline.aberration) === 0, "Disposal must detach all pass listeners");
      assert(renderer.info.memory.textures === baselineTextures, "Remounts must return GPU textures to baseline");
      assert(renderer.autoClear === autoClear, "Disposal must restore renderer autoClear");
    }
    return "PASS: 64 effect toggles/resizes retain pass ownership and neutral pixels; four remounts release listeners/targets and restore GPU texture baseline.";
  } finally {
    renderer.setSize(size.x, size.y);
    renderer.autoClear = autoClear;
  }
}
