import { BoxGeometry, FloatType, Group, Matrix4, Ray, Uniform, Vector3, WebGLRenderer, WebGLRenderTarget, type Texture } from "three";
import { GPUComputationRenderer } from "three/addons/misc/GPUComputationRenderer.js";
import { CONFIG } from "@/config/constants";
import { createSkullParticles, sampleSkullSurface, skullParticleLayout } from "@/lib/skullParticles";
import { skullInteractionTransform } from "@/lib/skullInteraction";

export function checkSkullStartup(renderer: WebGLRenderer) {
  const results: string[] = [];
  for (const fragments of [false, true]) {
    const source = new BoxGeometry();
    const count = CONFIG.model.PARTICLE_COUNT_MIN;
    const size = skullParticleLayout(count).textureSize;
    const uniforms = { positions: new Uniform<Texture | null>(null), restPosition: new Uniform<Texture | null>(null) };
    const simulation = createSkullParticles(renderer, source, count, [], fragments
      ? { samples: sampleSkullSurface(source, size), uniforms }
      : undefined);
    const model = new Group();
    const inverse = new Matrix4();
    const ray = new Ray();
    const reader = new GPUComputationRenderer(size, size, renderer);
    const target = new WebGLRenderTarget(size, size, { type: FloatType });
    const pixels = new Float32Array(size * size * 4);
    try {
      for (let frame = 0; frame < 360; frame++) {
        model.scale.setScalar(frame < 30 ? 0 : Math.min(1, (frame - 30) / 60));
        const active = frame < 120 && skullInteractionTransform(model, inverse);
        simulation.uniforms.cursorActive.value = active ? 1 : 0;
        if (active) {
          ray.set(new Vector3(0.1, 0.1, 5), new Vector3(0, 0, -1)).applyMatrix4(inverse);
          simulation.uniforms.cursorOrigin.value.copy(ray.origin);
          simulation.uniforms.cursorDirection.value.copy(ray.direction);
        } else {
          simulation.uniforms.cursorOrigin.value.set(NaN, NaN, NaN);
          simulation.uniforms.cursorDirection.value.set(0, 0, 0);
        }
        simulation.update(1 / 60, false);
        reader.renderTexture(simulation.points.material.uniforms.positions.value, target);
        renderer.readRenderTargetPixels(target, 0, 0, size, size, pixels);
        if (!pixels.every(Number.isFinite)) throw new Error(`Invalid skull positions at frame ${frame}, fragments=${fragments}`);
      }
      results.push(`${fragments ? "Glass fragments" : "Particles"}: finite GPU positions before, during and after zero-scale entrance with cursor input`);
    } finally {
      simulation.dispose();
      source.dispose();
      reader.dispose();
      target.dispose();
    }
  }
  return `PASS\n${results.join("\n")}`;
}
