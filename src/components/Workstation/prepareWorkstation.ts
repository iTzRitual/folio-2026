import { Camera, Light, Mesh, Scene, WebGLRenderTarget, type Group, type Object3D, type WebGLRenderer } from "three";
import { CONFIG } from "@/config/constants";

export function scheduleWork(callback: () => void) {
  if (typeof requestIdleCallback === "function") {
    const id = requestIdleCallback(callback, { timeout: 100 });
    return () => cancelIdleCallback(id);
  }
  const id = requestAnimationFrame(callback);
  return () => cancelAnimationFrame(id);
}

export type WorkstationPreview = (draw: () => void) => void;

interface WarmupOptions {
  portfolio?: { page: Group; portrait: Object3D; desktop: Scene };
  gl: WebGLRenderer;
  camera: Camera;
  world: Scene;
  surface: Group | null;
  progress: (fraction: number) => void;
  complete: () => void;
  fail: (error: unknown) => void;
}

export function warmWorkstation({ gl, camera, world, surface, portfolio, progress, complete, fail }: WarmupOptions) {
  const target = new WebGLRenderTarget(4, 4);
  const batches: Scene[] = [];
  const collect = (roots: readonly Object3D[], environment: Scene) => {
    const lights: Light[] = [];
    const meshes: Mesh[] = [];
    for (const root of roots) root.traverseVisible(object => {
      if (object instanceof Light) lights.push(object);
      if (object instanceof Mesh) meshes.push(object);
    });
    for (let i = 0; i < meshes.length; i += CONFIG.workstation.WARMUP_BATCH_SIZE) {
      const batch = new Scene();
      batch.environment = environment.environment;
      batch.environmentIntensity = environment.environmentIntensity;
      batch.fog = environment.fog;
      batch.matrixWorldAutoUpdate = false;
      batch.children.push(...lights);
      for (const mesh of meshes.slice(i, i + CONFIG.workstation.WARMUP_BATCH_SIZE)) {
        batch.children.push(mesh.children.length ? mesh.clone(false) : mesh);
      }
      batches.push(batch);
    }
  };
  if (surface) collect(surface.children, world);
  if (portfolio) {
    const { page, portrait, desktop } = portfolio;
    const pageLights: Light[] = [];
    for (const child of page.children) {
      child.traverseVisible(object => { if (object instanceof Light) pageLights.push(object); });
    }
    collect([portrait, ...pageLights], world);
    collect(desktop.children, desktop);
  }
  let index = 0;
  let primed = false;
  let timer: number;
  const step = () => {
    const previous = gl.getRenderTarget();
    const face = gl.getActiveCubeFace();
    const mip = gl.getActiveMipmapLevel();
    try {
      gl.setRenderTarget(target);
      const batch = batches[index];
      if (!primed) {
        gl.compile(batch, camera);
        primed = true;
      } else {
        const culled = batch.children.filter(object => object instanceof Mesh && object.frustumCulled);
        for (const object of culled) object.frustumCulled = false;
        try {
          gl.render(batch, camera);
        } finally {
          for (const object of culled) object.frustumCulled = true;
        }
        index++;
        progress(index / batches.length);
        if (index < batches.length) gl.compile(batches[index], camera);
      }
    } catch (error) {
      fail(error);
      return;
    } finally {
      gl.setRenderTarget(previous, face, mip);
    }
    if (index < batches.length) timer = window.setTimeout(step, 0);
    else {
      target.dispose();
      batches.length = 0;
      complete();
    }
  };
  timer = window.setTimeout(step, 0);
  return () => { window.clearTimeout(timer); target.dispose(); };
}
