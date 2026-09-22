import { Matrix4, Vector3, WebGLRenderer } from "three";
import { GPUComputationRenderer } from "three/addons/misc/GPUComputationRenderer.js";
import { projectCardDistance, projectOrbitCollisionShader } from "@/lib/projectOrbitCollision";
import { CONFIG } from "@/config/constants";

export function checkOrbitCollision(renderer: WebGLRenderer) {
  const results: string[] = [];
  const pitch = Math.PI * 2 / CONFIG.projectOrbit.COUNT;
  function run(name: string, start: Vector3, speed: Vector3, radius: number, frames = 1, home = start, spring = 0, moving = false, dt = 1 / 120, active = true, reveal = 1) {
    const compute = new GPUComputationRenderer(1, 1, renderer);
    const initialPosition = compute.createTexture();
    const initialVelocity = compute.createTexture();
    (initialPosition.image.data as Float32Array).set([...start.toArray(), 1]);
    (initialVelocity.image.data as Float32Array).set([...speed.toArray(), 0]);
    const shader = (position: boolean) => `
      uniform float dt;
      uniform float radius;
      uniform vec3 home;
      uniform float spring;
      ${projectOrbitCollisionShader}
      void main() {
        vec3 p = texture2D(texturePosition, vec2(0.5)).xyz;
        vec3 v = texture2D(textureVelocity, vec2(0.5)).xyz;
        v = (v + (home - p) * spring * dt) * exp(-7.0 * dt * step(0.1, spring));
        vec3 next = p + v * dt;
        collideOrbit(p, home, radius, dt, next, v);
        gl_FragColor = vec4(${position ? "next" : "v"}, 1.0);
      }
    `;
    const position = compute.addVariable("texturePosition", shader(true), initialPosition);
    const velocity = compute.addVariable("textureVelocity", shader(false), initialVelocity);
    compute.setVariableDependencies(position, [position, velocity]);
    compute.setVariableDependencies(velocity, [position, velocity]);
    const uniforms = {
      dt: { value: dt }, radius: { value: radius }, home: { value: home }, spring: { value: spring },
      orbitActive: { value: active ? 1 : 0 }, orbitScale: { value: 1 },
      orbitReveal: { value: reveal }, orbitPhase: { value: 0 },
      orbitStart: { value: new Matrix4() }, orbitEnd: { value: new Matrix4() },
      simulationFromOrbit: { value: new Matrix4() },
    };
    Object.assign(position.material.uniforms, uniforms);
    Object.assign(velocity.material.uniforms, uniforms);
    const error = compute.init();
    if (error) throw new Error(error);
    const p = new Vector3();
    const v = new Vector3();
    const pixels = new Float32Array(4);
    let minimum = Infinity;
    for (let frame = 0; frame < frames; frame++) {
      if (moving) {
        uniforms.orbitStart.value.makeRotationY(frame * dt * 0.4);
        uniforms.orbitEnd.value.makeRotationY((frame + 1) * dt * 0.4);
        uniforms.simulationFromOrbit.value.copy(uniforms.orbitEnd.value).invert();
      }
      compute.compute();
      renderer.readRenderTargetPixels(compute.getCurrentRenderTarget(position), 0, 0, 1, 1, pixels);
      p.fromArray(pixels);
      minimum = Math.min(minimum, projectCardDistance(p.clone().applyMatrix4(uniforms.orbitEnd.value), reveal) - radius);
    }
    renderer.readRenderTargetPixels(compute.getCurrentRenderTarget(velocity), 0, 0, 1, 1, pixels);
    v.fromArray(pixels);
    compute.dispose();
    position.material.dispose();
    velocity.material.dispose();
    results.push(`${name}: p=${p.toArray().map(x => x.toFixed(4))} v=${v.toArray().map(x => x.toFixed(4))} clearance=${minimum.toFixed(5)}`);
    return { p, v, minimum };
  }
  const assert = (value: boolean, message: string) => { if (!value) throw new Error(`${message}\n${results.join("\n")}`); };
  const radial = (angle: number, radius: number, y = 0) => new Vector3(Math.sin(angle) * radius, y, Math.cos(angle) * radius);
  const fast = run("fast head-on", new Vector3(0, 0, 0.6), new Vector3(0, 0, 150), 0.03);
  assert(fast.p.z < 0.965 && fast.v.z < 0, "Fast fragment must bounce without crossing a card");
  const embedded = run("overlapping card", new Vector3(0, 0, 1), new Vector3(), 0.03);
  assert(embedded.minimum >= 0, "An overlapping fragment must be pushed out with a finite normal");
  const tiny = run("small fragment through gap", radial(pitch / 2, 0.6), radial(pitch / 2, 100), 0.003);
  assert(tiny.p.length() > 1.3, "Small fragment should pass through a gap");
  const medium = run("fragment through tolerant gap", radial(pitch / 2, 0.6), radial(pitch / 2, 100), 0.045);
  assert(medium.p.length() > 1.3, "Side tolerance should allow ordinary fragments through a visual gap");
  const large = run("large fragment at gap", radial(pitch / 2, 0.6), radial(pitch / 2, 100), 0.08);
  assert(large.p.length() < 1, "Large fragment must not fit through narrow gap");
  const top = run("over card", new Vector3(0, 0.35, 0.6), new Vector3(0, 0, 100), 0.03);
  assert(top.p.z > 1.3, "Open space above cards must remain open");
  const arc = pitch * (1 - CONFIG.projectOrbit.GAP);
  const corner = run("rounded corner", radial(arc / 2 - 0.001, 0.8, arc / CONFIG.projectPreview.ASPECT / 2 - 0.001), radial(arc / 2 - 0.001, 50), 0.0001);
  assert(Math.hypot(corner.p.x, corner.p.z) > 1.1, "Transparent rounded corner must remain open");
  const home = new Vector3(0, 0, 0.5);
  for (const fps of [30, 60, 120]) {
    const returning = run(`return at ${fps} fps`, new Vector3(0, 0.025, 1.08), new Vector3(), 0.03, fps * 8, home, 32, false, 1 / fps);
    assert(returning.minimum > -0.002, "Returning fragment must never penetrate cards");
    assert(returning.p.distanceTo(home) < 0.015, "Returning fragment must route around the card and reach home");
  }
  const moving = run("moving card", radial(pitch / 2, 1), new Vector3(), 0.003, 60, undefined, 0, true);
  assert(moving.minimum > -0.002, "Rotating card must push fragment out instead of crossing it");
  const disabled = run("hidden orbit", new Vector3(0, 0, 0.6), new Vector3(0, 0, 150), 0.03, 1, undefined, 0, false, 1 / 120, false);
  assert(disabled.p.z > 1.8, "Hidden orbit must stop colliding");
  const unrevealed = run("unrevealed front card", new Vector3(0, 0, 0.6), new Vector3(0, 0, 150), 0.03, 1, undefined, 0, false, 1 / 120, true, 0.25);
  assert(unrevealed.p.z > 1.8, "A card that has not emerged must not block fragments");
  const revealed = run("revealed rear card", radial(pitch * 5, 0.6), radial(pitch * 5, 150), 0.03, 1, undefined, 0, false, 1 / 120, true, 0.25);
  assert(revealed.p.length() < 0.965 && revealed.v.dot(radial(pitch * 5, 1)) < 0, "An emerged card must already deflect fragments");
  return `PASS\n${results.join("\n")}`;
}
