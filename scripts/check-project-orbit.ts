import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { CONFIG } from "@/config/constants";
import { createProjectOrbitGeometry, projectOrbitLayout, PROJECT_ORBIT_ASPECT } from "@/lib/projectOrbit";
import { Group, Matrix4, Vector3 } from "three";
import { orbitCollisionTransform, projectCardDistance, projectOrbitCollisionShape } from "@/lib/projectOrbitCollision";
import { projectOrbitEntranceAt } from "@/lib/projectOrbitEntrance";
import { orbitIdleSpeed, orbitMomentumStep, orbitReleaseVelocity } from "@/lib/projectOrbitMotion";
import { heroAssemblyAt, orbitRibbonPoint, orbitRibbonCoordinates } from "@/lib/heroAssembly";
import { fitHeroModelSlot, fitHeroOrbitSlot, heroModelSlot } from "@/lib/heroModelPlacement";
import { pageScrollEasing } from "@/lib/pageScrollMotion";

const intro = CONFIG.projectOrbit;
const direction = Math.sign(intro.SPEED);
const duration = intro.ENTRANCE_DURATION;
const first = projectOrbitEntranceAt(0);
assert.equal(first.reveal, 0, "The slider stays hidden before it enters");
const initialSpeed = (projectOrbitEntranceAt(0.001).phase - first.phase) / 0.001;
const endingSpeed = (projectOrbitEntranceAt(duration).phase - projectOrbitEntranceAt(duration - 0.001).phase) / 0.001;
assert.equal(Math.sign(initialSpeed), direction, "Entrance follows the existing orbit direction");
assert(Math.abs(initialSpeed) > Math.abs(intro.SPEED) * 20, "Entrance has a deliberate fast start");
assert(Math.abs(endingSpeed - intro.SPEED) < 0.001, "Entrance joins idle rotation without a speed jump");
assert.equal(projectOrbitEntranceAt(duration).reveal, 1, "The loop is fully closed at the end");
for (const fps of [30, 60, 120]) {
  let previous = first;
  for (let frame = 1; frame <= fps * duration; frame++) {
    const current = projectOrbitEntranceAt(frame / fps);
    assert(current.reveal >= previous.reveal, "The revealed arc never shrinks or opens a second hole");
    assert((current.phase - previous.phase) * direction > 0, "Cards never reverse during deceleration");
    previous = current;
  }
}
for (const fraction of [0.1, 0.25, 0.5, 0.75]) {
  const pose = projectOrbitEntranceAt(duration * fraction);
  for (let card = 0; card < intro.COUNT; card++) {
    const angle = card * Math.PI * 2 / intro.COUNT;
    const travel = ((direction * (angle + pose.phase - intro.ENTRANCE_ORIGIN)) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    const point = new Vector3(Math.sin(angle), 0, Math.cos(angle));
    const visible = travel < pose.reveal * Math.PI * 2;
    assert.equal(projectCardDistance(point, pose.reveal, pose.phase) < 0, visible, "Only cards that have emerged can collide");
  }
}

for (const radius of [0.4, 0.9, 1.4]) {
  const geometry = createProjectOrbitGeometry(radius);
  const positions = geometry.attributes.position;
  const normals = geometry.attributes.normal;
  const uvs = geometry.attributes.uv;
  const arc = Math.PI * 2 / CONFIG.projectOrbit.COUNT * (1 - CONFIG.projectOrbit.GAP);
  let minY = Infinity;
  let maxY = -Infinity;
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index) + radius;
    assert(Math.abs(Math.hypot(x, z) - radius) < 1e-6, "Every vertex follows the circular surface");
    assert(x * normals.getX(index) + z * normals.getZ(index) > 0, "Card fronts face outwards");
    assert(Math.abs(Math.atan2(x, z) - (uvs.getX(index) - 0.5) * arc) < 1e-6, "Overflow follows the ring without stretching the video UVs");
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  assert(Math.abs(radius * arc * (1 + 2 * intro.HOLOGRAM_BLEED) / (maxY - minY) - PROJECT_ORBIT_ASPECT) < 1e-6, "Orbit cards retain the original project aspect ratio including glow padding");
  assert(arc < Math.PI * 2 / CONFIG.projectOrbit.COUNT, "Adjacent cards retain a gap around the entire ring");
  const minU = Math.min(...Array.from({ length: uvs.count }, (_, i) => uvs.getX(i)));
  const maxU = Math.max(...Array.from({ length: uvs.count }, (_, i) => uvs.getX(i)));
  assert(minU < 0 && maxU > 1, "The frame glow has room outside the card");
  assert.equal(PROJECT_ORBIT_ASPECT, CONFIG.projectPreview.ASPECT, "The complete project fits without changing its proportions");
  assert(intro.HOLOGRAM_BLEED > intro.HOLOGRAM_GLOW_FADE_END, "Glow fades to zero before the padded mesh ends");
  const halfHeight = arc / PROJECT_ORBIT_ASPECT / 2;
  assert(projectCardDistance(new Vector3(0, halfHeight - 0.001, 1)) < 0, "The shorter card retains collision at its top edge");
  assert(projectCardDistance(new Vector3(0, halfHeight + 0.02, 1)) > 0, "Fragments can pass above the shorter card");
  geometry.dispose();
}

const parent = new Group();
const orbit = new Group();
const simulation = new Group();
parent.add(orbit, simulation);
parent.position.set(2, -3, 2);
parent.rotation.set(0.2, -0.6, 0.4);
orbit.rotation.set(CONFIG.projectOrbit.TILT_X, 0.7, CONFIG.projectOrbit.TILT_Z);
orbit.position.y = CONFIG.projectOrbit.OFFSET_Y;
simulation.rotation.set(-1.3, -3.13, -1.57);
const transform = new Matrix4();
const pitch = Math.PI * 2 / CONFIG.projectOrbit.COUNT;
for (const scale of [0.05, 0.8, 1.5]) {
  parent.scale.setScalar(scale);
  simulation.scale.setScalar(scale * 0.8);
  const collider = { object: orbit, radius: scale * 1.4, active: true };
  assert(orbitCollisionTransform(simulation, collider, transform));
  for (let index = 0; index < CONFIG.projectOrbit.COUNT; index++) {
    const angle = index * pitch;
    const center = new Vector3(Math.sin(angle), 0, Math.cos(angle));
    const local = simulation.worldToLocal(orbit.localToWorld(center.clone().multiplyScalar(collider.radius)));
    assert(local.applyMatrix4(transform).distanceTo(center) < 1e-8, "Collision surfaces track the tilted, rotating cards at every scene scale");
    assert(projectCardDistance(center) < 0, "Each visible card has a solid collider");
    const gap = new Vector3(Math.sin(angle + pitch / 2), 0, Math.cos(angle + pitch / 2));
    assert(projectCardDistance(gap) > 0.01, "Every gap stays open in collision geometry");
  }
}
parent.scale.setScalar(0);
assert.equal(orbitCollisionTransform(simulation, { object: orbit, radius: 1, active: true }, transform), null, "Hidden intro geometry cannot produce a singular simulation transform");

console.log("PASS: orbit cards follow the circular surface, preserve preview proportions, face outwards, and retain gaps at every size.");

for (const count of [6, 10, 24]) {
  for (const gap of [0.08, 0.42, 0.65]) {
    for (const cardScale of [0.5, 1]) {
      const layout = projectOrbitLayout({ count, gap, cardScale });
      const shape = projectOrbitCollisionShape(layout);
      assert(shape.y > shape.w && shape.z > shape.w, "Every lab setting retains a valid rounded collider");
      const card = createProjectOrbitGeometry(1, layout);
      const positions = card.attributes.position;
      const uv = card.attributes.uv;
      for (let i = 0; i < positions.count; i++) {
        assert(Math.abs(positions.getY(i) - (uv.getY(i) - 0.5) * layout.height) < 1e-6, "Live card size preserves video proportions");
      }
      assert(projectCardDistance(new Vector3(0, 0, 1), 1, 0, layout) < 0, "A card center remains solid after tuning");
      assert(projectCardDistance(new Vector3(0, layout.height / 2 + 0.01, 1), 1, 0, layout) > 0, "Collision height follows live tuning");
      const angle = layout.pitch / 2;
      assert(projectCardDistance(new Vector3(Math.sin(angle), 0, Math.cos(angle)), 1, 0, layout) > 0, "Gaps remain open across the lab control range");
      card.dispose();
    }
  }
}
console.log("PASS: lab layout extremes preserve complete media proportions and matching collision surfaces.");

for (const fps of [20, 30, 60, 120]) {
  let phase = 0;
  for (let frame = 0; frame < fps * 10; frame++) phase += orbitMomentumStep(intro.SPEED, 1 / fps, intro.DRAG.FRICTION).angle;
  assert(Math.abs(phase - intro.SPEED * 10) < 1e-10, "Idle covers the same angle at 20, 30, 60 and 120 FPS");
}
assert.equal(orbitMomentumStep(intro.SPEED, 2, intro.DRAG.FRICTION).angle, 0, "Resuming after a background pause does not jump around the ring");
for (const cardCount of [6, 10, 24]) {
  const arc = projectOrbitLayout({ count: cardCount }).arc;
  const endpoint = projectOrbitEntranceAt(duration, arc).phase;
  const before = (endpoint - projectOrbitEntranceAt(duration - 0.0001, arc).phase) / 0.0001;
  const after = (projectOrbitEntranceAt(duration + 0.0001, arc).phase - endpoint) / 0.0001;
  assert(Math.abs(before - after) < 0.001, "Entrance hands off to idle with continuous angular velocity at every card count");
}
const speedAt = (time: number) => Math.abs((projectOrbitEntranceAt(time + 0.0001).phase - projectOrbitEntranceAt(time).phase) / 0.0001);
const cruiseSpeed = speedAt(0);
assert(Math.abs(speedAt(intro.ENTRANCE_CRUISE_DURATION / 2) - cruiseSpeed) < 0.001, "Cards keep their momentum throughout the first stage");
assert(speedAt(duration / 2) > cruiseSpeed * 0.8, "The ring retains most of its speed halfway through the entrance");
assert(speedAt(duration * 0.9) < cruiseSpeed * 0.05, "The second stage settles gently into idle");
const stageBoundary = intro.ENTRANCE_CRUISE_DURATION;
assert(Math.abs(speedAt(stageBoundary - 0.0001) - speedAt(stageBoundary)) < 0.001, "Braking begins without a velocity jump");
assert.equal(projectOrbitEntranceAt(duration * 0.75).reveal, 1, "The loop closes while the ring is still braking");
let reveal90 = 0;
while (projectOrbitEntranceAt(reveal90).reveal < 0.9) reveal90 += 0.001;
assert(1 - Math.exp(-intro.ENTRANCE_RESPONSE * reveal90) > 0.99, "Cards are fully readable before the entrance settles");
console.log("PASS: orbit timing preserves velocity at handoff, frame-rate-independent idle and prompt entrance opacity.");

for (const initial of [-8, -2, 0, 2, 8]) {
  const reference = { angle: 0, velocity: initial };
  for (let frame = 0; frame < 120 * 4; frame++) {
    const next = orbitMomentumStep(reference.velocity, 1 / 120, intro.DRAG.FRICTION);
    reference.angle += next.angle;
    reference.velocity = next.velocity;
  }
  for (const fps of [20, 30, 60]) {
    let angle = 0;
    let velocity = initial;
    for (let frame = 0; frame < fps * 4; frame++) {
      const next = orbitMomentumStep(velocity, 1 / fps, intro.DRAG.FRICTION);
      assert(Math.abs(next.velocity - intro.SPEED) <= Math.abs(velocity - intro.SPEED), "Fling energy decays toward idle without overshoot");
      angle += next.angle;
      velocity = next.velocity;
    }
    assert(Math.abs(angle - reference.angle) < 1e-10, "Fling distance is independent of frame rate in both directions");
    assert(Math.abs(velocity - intro.SPEED) < 0.015, "A fast fling returns close to idle after four seconds");
  }
}
assert.equal(orbitReleaseVelocity([{ time: 0, phase: 0 }, { time: 80, phase: 0.32 }], 85), 4, "Fast gestures transfer their measured angular velocity");
assert.equal(orbitReleaseVelocity([{ time: 0, phase: 0 }, { time: 80, phase: -0.32 }], 85), -4, "Reverse gestures transfer reverse momentum");
assert.equal(orbitReleaseVelocity([{ time: 0, phase: 0 }, { time: 80, phase: 0.32 }], 250), 0, "Holding before release cancels stale momentum");
assert.equal(orbitReleaseVelocity([{ time: 0, phase: 0 }, { time: 10, phase: 3 }], 12), intro.DRAG.MAX_SPEED, "Extreme gestures respect the speed limit");
assert.equal(orbitMomentumStep(4, 2, intro.DRAG.FRICTION).angle, 0, "Returning to a hidden tab does not jump the orbit");
console.log("PASS: orbit gestures preserve release direction, discard stale velocity and decay consistently across frame rates.");

for (const direction of [-1, 1]) {
  let idleSpeed = orbitIdleSpeed(direction * 0.01, intro.SPEED);
  idleSpeed = orbitIdleSpeed(0, idleSpeed);
  idleSpeed = orbitIdleSpeed(-direction * intro.DIRECTION_EPSILON / 2, idleSpeed);
  assert.equal(Math.sign(idleSpeed), direction, "Idle retains the last gesture direction through rest and numerical noise");
  for (const fps of [30, 60, 120]) {
    let velocity = direction * 4;
    for (let frame = 0; frame < fps * 6; frame++) {
      const next = orbitMomentumStep(velocity, 1 / fps, intro.DRAG.FRICTION, idleSpeed);
      assert.equal(Math.sign(next.angle), direction, "Release inertia never reverses on its way to idle");
      velocity = next.velocity;
    }
    assert(Math.abs(velocity - idleSpeed) < 0.001, "A fling settles into idle in its own direction");
    let progress = direction === -1 ? 0.3 : 0.7;
    const target = direction === -1 ? 0.7 : 0.3;
    for (let frame = 0; frame < fps * 3; frame++) {
      const next = target + (progress - target) * Math.exp(-7 / fps);
      const scrollAngle = heroAssemblyAt(next).spin - heroAssemblyAt(progress).spin;
      idleSpeed = orbitIdleSpeed(scrollAngle, idleSpeed);
      const angle = scrollAngle + orbitMomentumStep(idleSpeed, 1 / fps, intro.DRAG.FRICTION, idleSpeed).angle;
      assert.equal(Math.sign(angle), direction, "Decelerating scroll and idle reinforce each other instead of alternately reversing");
      progress = next;
    }
  }
}
console.log("PASS: scroll and drag hand off to persistent directional idle without reversing during deceleration.");

assert.equal(heroAssemblyAt(0).unfold, 0);
assert.equal(heroAssemblyAt(0.65).unfold, 1);
assert.equal(heroAssemblyAt(0.65).opacity, 1, "The unfolded cards remain visible before the shared exit");
assert.equal(heroAssemblyAt(0.88).opacity, 0, "The hero exits before the details skull returns");
assert.equal(heroAssemblyAt(0.9).scatter, 0, "The details skull has an intact rest shape");
assert.deepEqual(heroAssemblyAt(0.5, true), { ...heroAssemblyAt(0.5), unfold: 0, scatter: 0, spin: 0, rise: 0, orbitExpansion: 0 }, "Reduced motion removes unwrapping, scattering, expansion and scroll spin");
assert.equal(heroAssemblyAt(0.82).orbitOpacity, 1, "The large ribbon stays visible through the later scroll phase");
assert.equal(heroAssemblyAt(0.9).orbitOpacity, 0, "The ribbon exits before the model moves to details");
const scrollSpeedAt = (p: number) => Math.abs((heroAssemblyAt(p + 0.0001).spin - heroAssemblyAt(p).spin) / 0.0001);
assert(scrollSpeedAt(0.7) > scrollSpeedAt(0.1) * 2.5, "The later scroll phase accelerates the ribbon");
assert(Math.abs(scrollSpeedAt(CONFIG.heroAssembly.ORBIT_ACCEL_START - 0.0001) - scrollSpeedAt(CONFIG.heroAssembly.ORBIT_ACCEL_START)) < 0.01, "Scroll acceleration starts without a velocity jump");
const orbitSlot = { top: 0.4, bottom: -0.3, padding: 0.02 };
assert.equal(fitHeroOrbitSlot(orbitSlot, 0.15, 0), 1, "Hero and reduced motion preserve the original card size");
assert(fitHeroOrbitSlot(orbitSlot, 0.15, 1) > 2, "The unfolded ribbon fills more of the available gap independently of skull scale");
assert.equal(fitHeroOrbitSlot({ top: 0.1, bottom: 0.09, padding: 0.02 }, 0.15, 1), 1, "The ribbon retains its original size until it fades instead of collapsing");
const ribbonLayout = projectOrbitLayout({ count: 6, gap: 0.42 });
for (const curvature of [1, 0.75, 0.25, 0.001, 0]) {
  for (const phase of [-9.2, -0.4, 0.6, 13.1]) {
    for (let card = 0; card < ribbonLayout.count; card++) {
      const theta = Math.atan2(Math.sin(card * ribbonLayout.pitch + phase), Math.cos(card * ribbonLayout.pitch + phase));
      if (Math.abs(theta) > Math.PI * CONFIG.heroAssembly.EDGE_FADE_START) continue;
      const point = orbitRibbonPoint(theta, curvature);
      const inverse = orbitRibbonCoordinates(point.x, point.z, curvature);
      assert(Math.abs(inverse.angle - theta) < 1e-8 && Math.abs(inverse.depth) < 1e-8, "Collision coordinates follow the rendered ribbon across its full morph");
      const local = new Vector3(Math.cos(phase) * point.x - Math.sin(phase) * point.z, 0, Math.sin(phase) * point.x + Math.cos(phase) * point.z);
      assert(projectCardDistance(local, 1, phase, ribbonLayout, curvature) < 0, "Each unfolded card retains its collider");
      local.y = ribbonLayout.height;
      assert(projectCardDistance(local, 1, phase, ribbonLayout, curvature) > 0, "The ribbon does not create an invisible wall above the cards");
    }
  }
}
assert(Math.abs(heroAssemblyAt(0.5).spin) > Math.PI * 1.5, "Scrolling strongly accelerates the orbit");
console.log("PASS: scroll exit keeps cards visible, flattens the orbit, and preserves collision geometry and reduced motion.");

for (const screenHeight of [600, 720, 1080]) {
  const layout = { viewport: { width: 12, height: 8 }, marginY: 1.6, titleY: -2.6, size: { width: 1440, height: screenHeight } };
  for (const progress of [0, 0.1, 0.5, 0.8, 0.3, 0.85, 0]) {
    const slot = heroModelSlot(layout, progress);
    const extent = 0.5 + heroAssemblyAt(progress).scatter * 0.4;
    const placement = fitHeroModelSlot(slot, extent, 1);
    assert.equal(placement.y, (slot.top + slot.bottom) / 2, "Model position matches the current text midpoint without temporal lag");
    assert(placement.y + extent * placement.scale / 2 <= slot.top - slot.padding + 1e-10, "Fast scrolling and reversal keep the skull below the subtitle");
    assert(placement.y - extent * placement.scale / 2 >= slot.bottom + slot.padding - 1e-10, "Fast scrolling and reversal keep the skull above the title");
    assert(placement.scale >= 0 && Number.isFinite(placement.y), "Placement remains finite across viewport sizes");
  }
}
console.log("PASS: the hero model stays between text blocks and follows scroll directly without temporal lag.");

const lenisSource = readFileSync("node_modules/lenis/dist/lenis.mjs", "utf8");
const animateEnd = lenisSource.indexOf("// packages/core/src/debounce.ts");
assert(animateEnd > 0, "Update the Lenis animation harness if its module layout changes");
const LenisAnimate = runInNewContext(`${lenisSource.slice(0, animateEnd)}\nAnimate;`);
const scrollConfig = CONFIG.scrollTimeline;
for (const fps of [30, 60, 120]) {
  for (const distance of [-2000, -240, -1, 1, 240, 2000]) {
    const animate = new LenisAnimate();
    const steps: number[] = [];
    let previous = 0;
    let time = 0;
    animate.fromTo(0, distance, {
      lerp: 0,
      duration: scrollConfig.LENIS_DURATION,
      easing: pageScrollEasing,
      onUpdate: (value: number) => {
        steps.push(Math.abs(value - previous));
        assert(value * Math.sign(distance) >= previous * Math.sign(distance), "Lenis settles without reversing direction");
        previous = value;
      },
    });
    for (let frame = 0; animate.isRunning && frame < fps * (scrollConfig.LENIS_DURATION + 1); frame++) {
      time += 1 / fps;
      animate.advance(1 / fps);
      if (time < scrollConfig.LENIS_SETTLE_START) {
        assert(Math.abs(previous - distance * (1 - Math.exp(-scrollConfig.LENIS_DECAY * time))) < 1e-8, "The main Lenis deceleration matches the previous exponential trajectory");
      }
    }
    assert.equal(previous, distance, "Lenis reaches its exact target");
    for (let i = 1; i < steps.length; i++) {
      assert(steps[i] <= steps[i - 1] + 1e-9, "No frame, including Lenis completion, accelerates during deceleration");
    }
    assert(steps.at(-1)! < 0.001, "The final scroll step is imperceptible even for a large wheel gesture");
  }
}
assert.equal(pageScrollEasing(0), 0);
assert.equal(pageScrollEasing(1), 1);
console.log("PASS: installed Lenis preserves exponential braking and settles without a terminal snap at 30, 60 and 120 FPS in both directions.");
