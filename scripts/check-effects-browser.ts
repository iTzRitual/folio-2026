import { Color, Mesh, MeshBasicMaterial, PerspectiveCamera, PlaneGeometry, Scene, Texture, Vector2, WebGLRenderer, type WebGLRenderTarget } from "three";
import { PortfolioEffectPipeline, selectAntialiasingSamples } from "@/components/Effects/PortfolioEffectPipeline";

async function waitForAntialiasing(pipeline: PortfolioEffectPipeline) {
  if (pipeline.antialiasing.weightsMaterial.areaTexture) return;
  const deadline = performance.now() + 5000;
  while (!pipeline.antialiasing.weightsMaterial.areaTexture) {
    if (performance.now() > deadline) throw new Error("SMAA lookup textures did not load");
    await new Promise(resolve => setTimeout(resolve, 16));
  }
}

export async function checkEffects(renderer: WebGLRenderer) {
  const assert = (condition: boolean, message: string) => { if (!condition) throw new Error(message); };
  assert(selectAntialiasingSamples([4, 2], [4, 2]) === 2, "Choose two supported samples within the AA budget");
  assert(selectAntialiasingSamples([4], [4]) === 0, "Do not exceed the AA budget on four-sample-only hardware");
  assert(selectAntialiasingSamples([1], [1]) === 0, "One sample must use the SMAA fallback");
  assert(selectAntialiasingSamples([], []) === 0, "Unsupported multisampling must use SMAA");
  assert(selectAntialiasingSamples([4, 2], [4]) === 0, "Color and depth must support the same count");
  assert(selectAntialiasingSamples([8, 4, 2], [8, 4, 2], 4) === 4, "The workstation must use four samples without exceeding its budget");
  assert(selectAntialiasingSamples([4], [4], 4) === 4, "Four-sample-only hardware must support geometry antialiasing");
  const scene = new Scene();
  scene.background = new Color("#28455c");
  const camera = new PerspectiveCamera();
  const size = renderer.getSize(new Vector2());
  const pixelRatio = renderer.getPixelRatio();
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
    const earlyUnmount = new PortfolioEffectPipeline(renderer, scene, camera);
    earlyUnmount.dispose();
    await waitForAntialiasing(earlyUnmount);
    assert(renderer.info.memory.textures === baselineTextures, "Lookup loading after an early unmount must not allocate GPU textures");
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
        await waitForAntialiasing(pipeline);
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
          const mode = (["msaa", "smaa", "workstation"] as const)[change % 3];
          pipeline.setAntialiasingMode(mode);
          const buffers = [pipeline.composer.inputBuffer, pipeline.composer.outputBuffer];
          let disposals = 0;
          const disposed = () => { disposals++; };
          buffers.forEach(buffer => buffer.addEventListener("dispose", disposed));
          pipeline.setAntialiasingMode(mode);
          buffers.forEach(buffer => buffer.removeEventListener("dispose", disposed));
          assert(disposals === 0, "An unchanged antialiasing mode must not reallocate GPU buffers");
          pipeline.setAberrationEnabled(change % 2 === 0);
          pipeline.aberration.setTaps(change % 3 === 0 ? 3 : 8);
          pipeline.composer.setSize(change % 2 === 0 ? 48 : 32, 32);
          pipeline.composer.render(1 / 60);
          assert(pipeline.composer.outputBuffer.samples === 0, "Fullscreen effects must not allocate a second multisampled buffer");
          const activePasses = pipeline.composer.passes.filter(pass => pass.enabled);
          assert(activePasses.filter(pass => pass.renderToScreen).length === 1 && activePasses.at(-1)?.renderToScreen === true, "Only the last active pass may render to screen in either antialiasing mode");
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
    const geometry = new PlaneGeometry(2, 2);
    const material = new MeshBasicMaterial({ color: "white" });
    const mesh = new Mesh(geometry, material);
    mesh.position.z = -3;
    mesh.rotation.z = 0.37;
    scene.add(mesh);
    scene.background = new Color("black");
    const pipeline = new PortfolioEffectPipeline(renderer, scene, camera);
    const actualSamples = pipeline.composer.multisampling;
    pipeline.setAntialiasingMode("workstation");
    const workstationSamples = pipeline.composer.multisampling;
    try {
      await waitForAntialiasing(pipeline);
      pipeline.header.setActive(false);
      for (const dpr of [0.75, 1, 1.5]) {
        renderer.setPixelRatio(dpr);
        pipeline.composer.setSize(64, 64);
        const dimensions = renderer.getDrawingBufferSize(new Vector2());
        const pixels = new Uint8Array(dimensions.x * dimensions.y * 4);
        const readEdges = () => {
          context.readPixels(0, 0, dimensions.x, dimensions.y, context.RGBA, context.UNSIGNED_BYTE, pixels);
          let edges = 0;
          for (let i = 0; i < pixels.length; i += 4) {
            if (pixels[i] > 8 && pixels[i] < 247) edges++;
          }
          return edges;
        };
        renderer.setRenderTarget(null);
        renderer.clear();
        renderer.render(scene, camera);
        const baselineEdges = readEdges();
        for (const mode of ["msaa", "smaa", "workstation"] as const) {
          pipeline.setAntialiasingMode(mode);
          assert(pipeline.composer.multisampling === (mode === "workstation" ? workstationSamples : mode === "msaa" ? actualSamples : 0), "AA mode changes must select the negotiated sample count");
          for (const aberration of [false, true]) {
            pipeline.setAberrationEnabled(aberration);
            pipeline.composer.render(1 / 60);
            assert(readEdges() > baselineEdges + 20, `${mode} must add subpixel coverage to diagonal geometry at DPR ${dpr}, aberration ${aberration}`);
            const center = (Math.floor(dimensions.y / 2) * dimensions.x + Math.floor(dimensions.x / 2)) * 4;
            assert(pixels[center] === 255 && pixels[0] === 0, "Antialiasing must preserve solid interior and background colors");
            assert(context.getError() === context.NO_ERROR, "Antialiasing must not produce WebGL errors");
          }
        }
      }
      if (workstationSamples > 1) {
        pipeline.setAntialiasingMode("workstation");
        pipeline.setAberrationEnabled(false);
        renderer.setPixelRatio(1);
        pipeline.composer.setSize(64, 64);
        scene.background = new Color("#45484d");
        material.color.set("#55585d");
        const pixels = new Uint8Array(64 * 64 * 4);
        const levels = () => {
          context.readPixels(0, 0, 64, 64, context.RGBA, context.UNSIGNED_BYTE, pixels);
          const background = pixels[0];
          const interior = pixels[(32 * 64 + 32) * 4];
          const edgeLevels = new Set<number>();
          for (let i = 0; i < pixels.length; i += 4) {
            if (pixels[i] > background && pixels[i] < interior) edgeLevels.add(pixels[i]);
          }
          return edgeLevels.size;
        };
        renderer.setRenderTarget(null);
        renderer.clear();
        renderer.render(scene, camera);
        const baseline = levels();
        pipeline.composer.render(1 / 60);
        assert(levels() >= baseline + Math.min(workstationSamples - 1, 3), "Workstation AA must smooth low-contrast gray contours that color-edge filters miss");
      }
    } finally {
      pipeline.dispose();
      geometry.dispose();
      material.dispose();
    }
    assert(renderer.info.memory.textures === baselineTextures, "Antialiasing targets and lookup textures must be released after DPR changes");
    return `PASS: 64 AA/effect toggles and resizes retain pass ownership and neutral pixels; only geometry uses MSAA; unchanged AA preserves buffers; early/normal unmounts release GPU textures; portfolio MSAA ${actualSamples}×, workstation MSAA ${workstationSamples}× and SMAA smooth geometry at DPR 0.75/1/1.5; supported workstation MSAA preserves low-contrast edge coverage.`;
  } finally {
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(size.x, size.y);
    renderer.autoClear = autoClear;
  }
}
