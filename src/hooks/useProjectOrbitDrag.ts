import { useEffect, useMemo, type RefObject } from "react";
import { useThree } from "@react-three/fiber";
import { Group, Raycaster, Vector2, Vector3 } from "three";
import { CONFIG } from "@/config/constants";
import { orbitMomentumStep, orbitReleaseVelocity, type OrbitDragSample } from "@/lib/projectOrbitMotion";

const C = CONFIG.projectOrbit;

export function useProjectOrbitDrag(rotation: RefObject<Group | null>, orbit: RefObject<Group | null>) {
  const get = useThree((state) => state.get);
  const runtime = useMemo(() => ({
    enabled: false,
    reducedMotion: false,
    velocity: C.SPEED as number,
    friction: C.DRAG.FRICTION as number,
    held: false,
    cancel: () => {},
  }), []);

  useEffect(() => {
    const raycaster = new Raycaster();
    const pointer = new Vector2();
    const point = new Vector3();
    const tangent = new Vector3();
    let drag: { id: number; target: Element; x: number; y: number; axis: Vector2; pixelsPerRadian: number; samples: OrbitDragSample[] } | null = null;
    let savedCursor: string | null = null;
    const cursor = (value: string | null) => {
      if (value) {
        savedCursor ??= document.body.style.cursor;
        document.body.style.cursor = value;
      } else if (savedCursor !== null) {
        document.body.style.cursor = savedCursor;
        savedCursor = null;
      }
    };
    const pick = (event: PointerEvent) => {
      if (!runtime.enabled || !rotation.current || !orbit.current) return;
      const { gl, camera, events } = get();
      const surface = events.connected instanceof HTMLElement ? events.connected : gl.domElement;
      if (!(event.target instanceof Element) || !surface.contains(event.target)) return;
      if (event.target.closest("a, button, input, select, textarea, [contenteditable]")) return;
      const bounds = gl.domElement.getBoundingClientRect();
      pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
      rotation.current.updateWorldMatrix(true, true);
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObject(rotation.current, true).find((hit) => hit.uv && hit.uv.x >= 0 && hit.uv.x <= 1 && hit.uv.y >= 0 && hit.uv.y <= 1);
    };
    const finish = (fling: boolean) => {
      const previous = drag;
      drag = null;
      runtime.held = false;
      runtime.velocity = fling && previous && !runtime.reducedMotion ? orbitReleaseVelocity(previous.samples, performance.now()) : 0;
      runtime.friction = Math.abs(runtime.velocity) >= C.DRAG.FLING_THRESHOLD ? C.DRAG.FRICTION : C.DRAG.IDLE_RESPONSE;
      if (previous?.target.hasPointerCapture(previous.id)) previous.target.releasePointerCapture(previous.id);
      cursor(null);
    };
    const cancel = () => finish(false);
    runtime.cancel = cancel;
    const down = (event: PointerEvent) => {
      if (drag || event.button !== 0 || !event.isPrimary) return;
      const hit = pick(event);
      if (!hit || !orbit.current || !rotation.current || !(event.target instanceof Element)) return;
      const { gl, camera } = get();
      const bounds = gl.domElement.getBoundingClientRect();
      point.copy(hit.point);
      orbit.current.worldToLocal(point);
      tangent.set(point.z, 0, -point.x).multiplyScalar(0.01).add(point);
      orbit.current.localToWorld(tangent).project(camera);
      point.copy(hit.point).project(camera);
      const axis = new Vector2((tangent.x - point.x) * bounds.width / 2, -(tangent.y - point.y) * bounds.height / 2);
      const pixelsPerRadian = Math.max(C.DRAG.MIN_PIXELS_PER_RADIAN, axis.length() / 0.01);
      if (axis.lengthSq() < 0.0001) axis.set(1, 0);
      else axis.normalize();
      drag = { id: event.pointerId, target: event.target, x: event.clientX, y: event.clientY, axis, pixelsPerRadian,
        samples: [{ time: performance.now(), phase: rotation.current.rotation.y }] };
      runtime.held = true;
      runtime.velocity = 0;
      event.target.setPointerCapture(event.pointerId);
      cursor("grabbing");
      if (event.pointerType === "mouse") event.preventDefault();
      event.stopPropagation();
    };
    const move = (event: PointerEvent) => {
      if (!drag) {
        if (event.pointerType === "mouse") cursor(pick(event) ? "grab" : null);
        return;
      }
      if (event.pointerId !== drag.id || !rotation.current) return;
      const angle = ((event.clientX - drag.x) * drag.axis.x + (event.clientY - drag.y) * drag.axis.y) / drag.pixelsPerRadian;
      rotation.current.rotation.y += angle;
      drag.x = event.clientX;
      drag.y = event.clientY;
      const time = performance.now();
      drag.samples.push({ time, phase: rotation.current.rotation.y });
      while (drag.samples.length > 2 && drag.samples[1].time < time - C.DRAG.VELOCITY_WINDOW_MS) drag.samples.shift();
      event.stopPropagation();
    };
    const up = (event: PointerEvent) => {
      if (drag?.id !== event.pointerId) return;
      finish(event.type === "pointerup");
      event.stopPropagation();
    };
    const visibility = () => { if (document.hidden) cancel(); };
    const leave = () => { if (!drag) cursor(null); };
    window.addEventListener("pointerdown", down, true);
    window.addEventListener("pointermove", move, true);
    window.addEventListener("pointerup", up, true);
    window.addEventListener("pointercancel", up, true);
    window.addEventListener("lostpointercapture", up, true);
    window.addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", visibility);
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      cancel();
      runtime.cancel = () => {};
      window.removeEventListener("pointerdown", down, true);
      window.removeEventListener("pointermove", move, true);
      window.removeEventListener("pointerup", up, true);
      window.removeEventListener("pointercancel", up, true);
      window.removeEventListener("lostpointercapture", up, true);
      window.removeEventListener("blur", cancel);
      document.removeEventListener("visibilitychange", visibility);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, [get, orbit, rotation, runtime]);

  return (delta: number, enabled: boolean, reducedMotion: boolean, moving = enabled) => {
    if (runtime.enabled && !enabled) {
      const velocity = runtime.velocity;
      const friction = runtime.friction;
      runtime.cancel();
      if (moving) {
        runtime.velocity = velocity;
        runtime.friction = friction;
      }
    }
    runtime.enabled = enabled;
    runtime.reducedMotion = reducedMotion;
    if (!moving) {
      runtime.velocity = C.SPEED;
      return;
    }
    if (runtime.held || reducedMotion || !rotation.current) return;
    const next = orbitMomentumStep(runtime.velocity, delta, runtime.friction);
    runtime.velocity = next.velocity;
    rotation.current.rotation.y += next.angle;
  };
}
