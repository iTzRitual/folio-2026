import { Color, Group, PerspectiveCamera, Scene, Texture, Vector2, Vector4, WebGLRenderTarget, type WebGLRenderer } from "three";
import { PortfolioCapture } from "@/components/Workstation/PortfolioCapture";
import { DEBUG_DEFAULTS } from "@/config/debugSettings";
import { captureVSCodeSession } from "@/lib/vscodeRenderer";

export function checkPortfolioCapture(renderer: WebGLRenderer) {
  const assert = (condition: boolean, message: string) => { if (!condition) throw new Error(message); };
  const size = renderer.getSize(new Vector2());
  const dpr = renderer.getPixelRatio();
  const previousTarget = renderer.getRenderTarget();
  const baseline = renderer.info.memory.textures;
  const camera = new PerspectiveCamera(40, 16 / 9, 0.1, 100);
  camera.position.set(1, 2, 8);
  camera.lookAt(0, 1, 0);
  const cameraMatrix = camera.matrixWorld.clone();
  const scene = new Scene();
  scene.background = new Color("#26394b");
  const page = new Group();
  const surface = new Group();
  scene.add(page, surface);
  const capture = new PortfolioCapture();
  const sentinel = new WebGLRenderTarget(32, 32);
  sentinel.viewport.set(2, 3, 20, 21);
  sentinel.scissor.set(4, 5, 10, 11);
  sentinel.scissorTest = true;
  const render = renderer.render;
  const getContext = HTMLCanvasElement.prototype.getContext;
  const dispose = Texture.prototype.dispose;
  const manifest = { version: "capture-check", files: [{ path: "src/long.ts", content: Array.from({ length: 500 }, (_, index) => `export const row${index} = ${index};`).join("\n") }] };
  try {
    renderer.setPixelRatio(1.5);
    renderer.setSize(64, 64);
    renderer.setRenderTarget(sentinel);
    page.visible = false;
    surface.visible = true;
    const injected = new Error("Injected capture render failure");
    renderer.render = () => { throw injected; };
    let thrown: unknown;
    try { capture.render(renderer, scene, camera, page, surface, { width: 1440, height: 900 }, "balanced"); }
    catch (error) { thrown = error; }
    renderer.render = render;
    assert(thrown === injected, "Capture must preserve the original render error");
    assert(renderer.getRenderTarget() === sentinel, "Capture failure must restore the render target");
    assert(renderer.getCurrentViewport(new Vector4()).equals(sentinel.viewport), "Capture must restore target viewport at fractional DPR");
    const context = renderer.getContext();
    assert(Array.from(context.getParameter(context.SCISSOR_BOX) as Int32Array).join() === sentinel.scissor.toArray().join(), "Capture must restore target scissor");
    assert(context.isEnabled(context.SCISSOR_TEST), "Capture must restore target scissor testing");
    assert(!page.visible && surface.visible, "Capture failure must restore both group visibilities");
    assert(camera.matrixWorld.equals(cameraMatrix), "Capture must leave the live camera pose alone");
    capture.reset();
    renderer.setRenderTarget(previousTarget);
    sentinel.dispose();
    assert(renderer.info.memory.textures === baseline, "Failed capture teardown must return to texture baseline");
    for (let cycle = 0; cycle < 8; cycle++) {
      const target = capture.render(renderer, scene, camera, page, surface, { width: 1440, height: 900 }, "balanced");
      const textures = capture.createDesktop(DEBUG_DEFAULTS.desktop, { width: 16, height: 9 }, manifest);
      assert(textures !== null, "Desktop textures must be available");
      if (!textures) throw new Error("Missing desktop textures");
      const owned = [textures.chrome, textures.dock.texture, textures.toolbar.texture, textures.vscode.texture, textures.mask];
      let disposals = 0;
      for (const texture of owned) {
        renderer.initTexture(texture);
        texture.addEventListener("dispose", () => { disposals++; });
      }
      for (const quality of ["low", "high", "balanced"] as const) {
        assert(capture.render(renderer, scene, camera, page, surface, { width: 1280, height: 720 }, quality) === target, "Quality changes must retain the target object");
        assert(capture.desktop === textures, "Quality changes must retain desktop textures and editor state");
      }
      textures.vscode.editorScrollY = 80;
      const session = captureVSCodeSession(textures.vscode);
      capture.reset();
      capture.reset();
      assert(disposals === owned.length, "Reset must dispose each desktop texture exactly once");
      assert(!capture.ready && capture.target === null, "Reset must clear all resource references");
      assert(JSON.stringify(capture.session) === JSON.stringify(session), "Reset must retain the editor session");
      assert(renderer.info.memory.textures === baseline, "Every resize/teardown must return to texture baseline");
    }
    capture.render(renderer, scene, camera, page, surface, { width: 1440, height: 900 }, "balanced");
    const restored = capture.createDesktop(DEBUG_DEFAULTS.desktop, { width: 16, height: 9 }, manifest);
    assert(restored?.vscode.editorScrollY === 80, "Reconfiguration must restore editor reading position");
    capture.reset();
    for (const failure of ["null", "throw"]) {
      capture.render(renderer, scene, camera, page, surface, { width: 1440, height: 900 }, "balanced");
      let contexts = 0;
      let disposals = 0;
      HTMLCanvasElement.prototype.getContext = function(this: HTMLCanvasElement, type: string, ...options: unknown[]) {
        if (type === "2d" && ++contexts === 3) {
          if (failure === "throw") throw new Error("Injected canvas context failure");
          return null;
        }
        return Reflect.apply(getContext, this, [type, ...options]);
      } as typeof getContext;
      Texture.prototype.dispose = function() { disposals++; return dispose.call(this); };
      let failed = false;
      try { failed = capture.createDesktop(DEBUG_DEFAULTS.desktop, { width: 16, height: 9 }, manifest) === null; }
      catch (error) { failed = error instanceof Error && error.message === "Injected canvas context failure"; }
      finally {
        HTMLCanvasElement.prototype.getContext = getContext;
        Texture.prototype.dispose = dispose;
      }
      assert(failed && !capture.ready && disposals >= 2, "Partial desktop construction must release previously created textures");
      capture.reset();
      assert(renderer.info.memory.textures === baseline, "Partial construction must not retain GPU textures");
    }
    capture.dispose();
    capture.dispose();
    assert(capture.session === null, "Final disposal must release the saved session");
  } finally {
    renderer.render = render;
    HTMLCanvasElement.prototype.getContext = getContext;
    Texture.prototype.dispose = dispose;
    capture.dispose();
    sentinel.dispose();
    renderer.setRenderTarget(previousTarget);
    renderer.setPixelRatio(dpr);
    renderer.setSize(size.x, size.y);
  }
  return "PASS: portfolio capture restores shared state after render failure, retains target/desktop identity across quality changes, releases partial Canvas2D construction, preserves editor reading across eight resets and returns GPU textures to baseline.";
}
