import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CONFIG } from "@/config/constants";
import { useHeroTransition } from "@/context/HeroTransitionContext";
import { useSceneCapabilities } from "@/context/SceneCapabilitiesContext";
import { useDebugSettings } from "@/context/DebugSettingsContext";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { createSkullParticles } from "@/lib/skullParticles";
import { createSkullFragments } from "@/lib/skullFragments";
import { skullInteractionTransform } from "@/lib/skullInteraction";
import { SkullGlass } from "@/components/SkullGlass";
import { orbitCollisionTransform, type ProjectOrbitCollider } from "@/lib/projectOrbitCollision";
import { heroAssemblyAt } from "@/lib/heroAssembly";

export function SkullParticles({
  source,
  lowQuality,
  clippingPlanes,
  fragments = false,
  orbitCollider,
  entranceRef,
}: {
  entranceRef: RefObject<THREE.Group | null>;
  orbitCollider: RefObject<ProjectOrbitCollider>;
  fragments?: boolean;
  source: THREE.Object3D;
  lowQuality: boolean;
  clippingPlanes: THREE.Plane[];
}) {
  const group = useRef<THREE.Group>(null);
  const simulation = useRef<ReturnType<typeof createSkullParticles> | null>(null);
  const previousDetails = useRef(false);
  const orbitTransform = useMemo(() => new THREE.Matrix4(), []);
  const { gl } = useThree();
  const { inputMode } = useSceneCapabilities();
  const { progressRef, revealProgressRef } = useHeroTransition();
  const reducedMotion = usePrefersReducedMotion();
  const { particles: settings } = useDebugSettings();
  const fragmentGeometry = useMemo(() => {
    if (!fragments || !(source instanceof THREE.Mesh)) return null;
    return createSkullFragments(source.geometry, lowQuality ? CONFIG.model.FRAGMENTS.CELLS_LOW : CONFIG.model.FRAGMENTS.CELLS);
  }, [fragments, source, lowQuality]);
  const fragmentUniforms = useMemo(() => ({
    positions: new THREE.Uniform<THREE.Texture | null>(null),
    restPosition: new THREE.Uniform<THREE.Texture | null>(null),
  }), []);
  useEffect(() => () => fragmentGeometry?.geometry.dispose(), [fragmentGeometry]);
  const count = fragmentGeometry?.count ?? (lowQuality
    ? Math.min(settings.count, CONFIG.model.PARTICLE_COUNT_LOW)
    : settings.count);
  const pointer = useRef({
    position: new THREE.Vector2(),
    previous: new THREE.Vector2(),
    inside: false,
    initialized: false,
    raycaster: new THREE.Raycaster(),
    previousRaycaster: new THREE.Raycaster(),
    plane: new THREE.Plane(),
    normal: new THREE.Vector3(),
    center: new THREE.Vector3(),
    currentHit: new THREE.Vector3(),
    previousHit: new THREE.Vector3(),
    inverse: new THREE.Matrix4(),
    localRay: new THREE.Ray(),
  });

  useLayoutEffect(() => {
    if (!(source instanceof THREE.Mesh) || !group.current) return;
    const parent = group.current;
    const particles = createSkullParticles(
      gl,
      source.geometry,
      count,
      clippingPlanes,
      fragmentGeometry ? { samples: fragmentGeometry.samples, uniforms: fragmentUniforms } : undefined,
    );
    simulation.current = particles;
    if (!fragmentGeometry) parent.add(particles.points);
    return () => {
      parent.remove(particles.points);
      particles.dispose();
      simulation.current = null;
    };
  }, [gl, source, count, clippingPlanes, fragmentGeometry, fragmentUniforms]);

  useLayoutEffect(() => {
    const state = pointer.current;
    const move = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const rect = gl.domElement.getBoundingClientRect();
      state.position.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      state.inside =
        Math.abs(state.position.x) <= 1 && Math.abs(state.position.y) <= 1;
    };
    const leave = () => {
      state.inside = false;
      state.initialized = false;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("blur", leave);
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("blur", leave);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, [gl]);

  useFrame(({ camera, size }, delta) => {
    const particles = simulation.current;
    const object = group.current;
    if (!particles || !object) return;
    const inDetails = progressRef.current >= CONFIG.model.DETAILS_POPUP_START;
    const assembly = heroAssemblyAt(progressRef.current, reducedMotion);
    if (inDetails && !previousDetails.current) particles.reset();
    previousDetails.current = inDetails;
    particles.uniforms.scrollScatter.value = assembly.scatter;
    if (fragments) {
      particles.setEntranceScale(entranceRef.current?.scale.x ?? 0, delta,
        !reducedMotion && !document.hidden && settings.scale > 0
        && progressRef.current <= CONFIG.model.INTERACTION_LOCK_EPSILON && revealProgressRef.current === 0);
      const active = orbitCollider.current.active && settings.scale > 0 && !reducedMotion
        && orbitCollisionTransform(object, orbitCollider.current, orbitTransform) !== null;
      particles.setOrbit(orbitTransform, active, orbitCollider.current.reveal, orbitCollider.current.phase, orbitCollider.current.shape, orbitCollider.current.curvature);
    }
    particles.uniforms.cursorRadius.value = settings.cursorRadius;
    particles.uniforms.cursorStrength.value = settings.cursorStrength;
    particles.uniforms.spring.value = settings.returnStrength;
    particles.uniforms.damping.value = settings.damping;
    particles.points.material.uniforms.pointRadius.value =
      settings.radius *
      (lowQuality
        ? CONFIG.model.PARTICLE_RADIUS_LOW / CONFIG.model.PARTICLE_RADIUS
        : 1);
    particles.points.material.uniforms.viewportHeight.value =
      size.height * gl.getPixelRatio();
    const state = pointer.current;
    const active =
      state.inside &&
      inputMode === "fine" &&
      !reducedMotion &&
      settings.scale > 0 &&
      progressRef.current <= CONFIG.model.INTERACTION_LOCK_EPSILON &&
      revealProgressRef.current === 0 &&
      skullInteractionTransform(object, state.inverse);
    particles.uniforms.cursorActive.value = active ? 1 : 0;
    particles.uniforms.cursorVelocity.value.set(0, 0, 0);
    if (active) {
      object.getWorldPosition(state.center);
      camera.getWorldDirection(state.normal);
      state.plane.setFromNormalAndCoplanarPoint(state.normal, state.center);
      state.raycaster.setFromCamera(state.position, camera);
      state.previousRaycaster.setFromCamera(
        state.initialized ? state.previous : state.position,
        camera,
      );
      const currentHit = state.raycaster.ray.intersectPlane(
        state.plane,
        state.currentHit,
      );
      const previousHit = state.previousRaycaster.ray.intersectPlane(
        state.plane,
        state.previousHit,
      );
      state.localRay.copy(state.raycaster.ray).applyMatrix4(state.inverse);
      particles.uniforms.cursorOrigin.value.copy(state.localRay.origin);
      particles.uniforms.cursorDirection.value.copy(state.localRay.direction);
      if (currentHit && previousHit && delta > 0) {
        currentHit.applyMatrix4(state.inverse);
        previousHit.applyMatrix4(state.inverse);
        particles.uniforms.cursorVelocity.value
          .copy(currentHit)
          .sub(previousHit)
          .divideScalar(delta)
          .clampLength(0, CONFIG.model.PARTICLE_MAX_CURSOR_SPEED);
      }
    } else {
      particles.uniforms.cursorOrigin.value.set(0, 0, 0);
      particles.uniforms.cursorDirection.value.set(0, 0, -1);
    }
    state.previous.copy(state.position);
    state.initialized = active;
    if (revealProgressRef.current > 0.001) return;
    particles.update(delta, reducedMotion);
  }, -1);

  return (
    <group ref={group}>
      {fragmentGeometry && (
        <SkullGlass
          geometry={fragmentGeometry.geometry}
          fragments={fragmentUniforms}
          orbitCollider={orbitCollider}
          lowQuality={lowQuality}
          clippingPlanes={clippingPlanes}
        />
      )}
    </group>
  );
}
