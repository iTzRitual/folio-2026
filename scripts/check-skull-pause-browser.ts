import { BoxGeometry, Matrix4, Uniform, WebGLRenderer, type Texture } from "three";
import { CONFIG } from "@/config/constants";
import { createSkullParticles, sampleSkullSurface, skullParticleLayout } from "@/lib/skullParticles";

export function checkSkullPause(renderer: WebGLRenderer) {
  const source = new BoxGeometry();
  const count = CONFIG.model.PARTICLE_COUNT_MIN;
  const simulation = createSkullParticles(renderer, source, count, [], {
    samples: sampleSkullSurface(source, skullParticleLayout(count).textureSize),
    uniforms: { positions: new Uniform<Texture | null>(null), restPosition: new Uniform<Texture | null>(null) },
  });
  const autoReset = renderer.info.autoReset;
  const assert = (condition: boolean, message: string) => { if (!condition) throw new Error(message); };
  try {
    renderer.info.autoReset = false;
    simulation.update(1 / 60, false);
    const positions = simulation.points.material.uniforms.positions.value;
    const velocities = simulation.points.material.uniforms.velocities.value;
    const calls = renderer.info.render.calls;
    for (let frame = 0; frame < 300; frame++) simulation.update(1 / 60, false, false);
    assert(renderer.info.render.calls === calls, "Paused simulation must issue no GPU passes");
    assert(simulation.points.material.uniforms.positions.value === positions, "Pause must retain the displayed positions");
    assert(simulation.points.material.uniforms.velocities.value === velocities, "Pause must retain momentum");
    simulation.reset();
    const rest = simulation.points.material.uniforms.positions.value;
    const resetCalls = renderer.info.render.calls;
    for (let frame = 0; frame < 300; frame++) simulation.update(1 / 60, false, false);
    assert(renderer.info.render.calls === resetCalls && simulation.points.material.uniforms.positions.value === rest, "Reset details must remain at rest without GPU work");
    simulation.setOrbit(new Matrix4(), true);
    simulation.update(1 / 60, false);
    simulation.setOrbit(new Matrix4().makeRotationY(1), true);
    simulation.update(1 / 60, false, false);
    const orbit = new Matrix4().makeRotationY(2);
    simulation.setOrbit(orbit, true);
    const resumeCalls = renderer.info.render.calls;
    simulation.update(100, false);
    assert(renderer.info.render.calls - resumeCalls === 2 * Math.ceil(CONFIG.model.PARTICLE_MAX_DELTA / CONFIG.model.PARTICLE_TIME_STEP), "Resume must cap elapsed time before computing");
    assert(simulation.uniforms.orbitStart.value.elements.every((value, index) => Math.abs(value - orbit.elements[index]) < 1e-12), "Resume must start from the current collider pose");
    return "PASS: 600 paused frames issue no GPU passes, preserve momentum/rest textures, and resume with bounded delta and current collision history.";
  } finally {
    renderer.info.autoReset = autoReset;
    simulation.dispose();
    source.dispose();
  }
}
