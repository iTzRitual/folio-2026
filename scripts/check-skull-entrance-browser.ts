import { BoxGeometry, FloatType, Matrix4, Uniform, Vector3, WebGLRenderer, WebGLRenderTarget, type Texture } from "three";
import { GPUComputationRenderer } from "three/addons/misc/GPUComputationRenderer.js";
import { gsap } from "gsap";
import { CONFIG } from "@/config/constants";
import { createSkullParticles, skullParticleLayout } from "@/lib/skullParticles";
import { projectCardDistance } from "@/lib/projectOrbitCollision";

export function checkSkullEntrance(renderer: WebGLRenderer) {
  const result: string[] = [];
  const peaks: number[] = [];
  const ease = gsap.parseEase(CONFIG.model.FRAGMENTS.ENTRANCE_EASE);
  for (const scenario of ["30 fps", "60 fps", "120 fps", "reduced motion", "mounted after entrance", "collision"]) {
    const fps = Number.parseInt(scenario) || 60;
    const reduced = scenario === "reduced motion";
    const resting = scenario === "mounted after entrance";
    const collision = scenario === "collision";
    const restPoint = new Vector3(0, 0.025, collision ? 0.9 : 0.6);
    const count = CONFIG.model.PARTICLE_COUNT_MIN;
    const size = skullParticleLayout(count).textureSize;
    const samples = {
      positions: new Float32Array(size * size * 4),
      normals: new Float32Array(size * size * 3),
      uvs: new Float32Array(size * size * 2),
    };
    for (let index = 0; index < count; index++) samples.positions.set([...restPoint.toArray(), 0.02], index * 4);
    const uniforms = { positions: new Uniform<Texture | null>(null), restPosition: new Uniform<Texture | null>(null) };
    const source = new BoxGeometry();
    const simulation = createSkullParticles(renderer, source, count, [], { samples, uniforms });
    const reader = new GPUComputationRenderer(size, size, renderer);
    const target = new WebGLRenderTarget(size, size, { type: FloatType });
    const pixels = new Float32Array(4);
    const position = new Vector3();
    let peak = 0;
    let peakTime = 0;
    let coastSpeed = 0;
    let clearance = Infinity;
    simulation.setEntranceScale(resting ? 1 : 0, 1 / fps, !reduced);
    simulation.setOrbit(new Matrix4(), collision);
    for (let frame = 1; frame <= fps * 5; frame++) {
      const time = frame / fps;
      const scale = resting ? 1 : ease(Math.min(1, time / CONFIG.model.FRAGMENTS.ENTRANCE_DURATION));
      simulation.setEntranceScale(scale, 1 / fps, !reduced);
      simulation.update(1 / fps, reduced);
      reader.renderTexture(uniforms.positions.value!, target);
      renderer.readRenderTargetPixels(target, 0, 0, 1, 1, pixels);
      position.fromArray(pixels);
      const displacement = position.distanceTo(restPoint);
      if (displacement > peak) { peak = displacement; peakTime = time; }
      clearance = Math.min(clearance, projectCardDistance(position) - 0.02);
      if (Math.abs(time - CONFIG.model.FRAGMENTS.ENTRANCE_DURATION) < 0.5 / fps) {
        reader.renderTexture(simulation.points.material.uniforms.velocities.value, target);
        renderer.readRenderTargetPixels(target, 0, 0, 1, 1, pixels);
        coastSpeed = new Vector3().fromArray(pixels).length();
      }
    }
    simulation.dispose();
    source.dispose();
    reader.dispose();
    target.dispose();
    const assert = (condition: boolean, message: string) => { if (!condition) throw new Error(`${scenario}: ${message}`); };
    assert(Number.isFinite(peak) && position.distanceTo(restPoint) < 0.001, "Fragments must settle back into the skull");
    if (reduced || resting) assert(peak < 0.00001, "No impulse when reduced motion is enabled or mounting at full scale");
    else {
      assert(peak > 0.08 && peak < 0.4, `Expected a controlled overshoot, got ${peak}`);
      assert(coastSpeed > 0.001, "Fragment velocity must survive the end of the scale animation");
      if (collision) assert(clearance > -0.002, "Entrance momentum must respect project colliders");
      else peaks.push(peak);
    }
    result.push(`${scenario}: peak=${peak.toFixed(4)} at ${peakTime.toFixed(3)}s, coast=${coastSpeed.toFixed(4)}, final=${position.distanceTo(restPoint).toFixed(6)}`);
  }
  if (Math.max(...peaks) - Math.min(...peaks) > 0.015) throw new Error(`Frame rate changes the entrance: ${peaks}`);
  return `PASS\n${result.join("\n")}`;
}
