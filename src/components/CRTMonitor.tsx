"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Mesh, Vector2, type Intersection, type Object3D } from "three";
import { CONFIG } from "@/config/constants";
import { createMonitorControls } from "@/lib/monitorControls";
import { knobNormalized, resetMonitorKnob, setMonitorKnob, toggleMonitorButton, type MonitorButton, type MonitorKnob, type MonitorState } from "@/lib/monitorState";
import { acquireRootScrollLock, type RootScrollLockLease } from "@/lib/rootScrollLock";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { getCRTReferenceFrame } from "@/lib/crtScreen";

export function CRTMonitor({ width, monitorState, onButtonPress }: {
  width: number;
  monitorState: MonitorState;
  onButtonPress?: (button: MonitorButton) => void;
}) {
  const { scene } = useGLTF(CONFIG.workstation.CRT_MODEL_URL);
  const three = useThree();
  const reducedMotion = usePrefersReducedMotion();
  const resources = useMemo(() => {
    const model = scene.clone(true);
    const frame = getCRTReferenceFrame(model);
    model.traverse(object => {
      if (object.name === "CRT_Screen" || object.name === "CRT_Glass") {
        object.visible = false;
        if (object instanceof Mesh) object.raycast = () => null;
      }
    });
    return { model, ...frame };
  }, [scene]);
  const { model, screenCenter, screenWidth, screenFront } = resources;
  const runtime = useRef<ReturnType<typeof createMonitorControls> | null>(null);

  useEffect(() => {
    const controls = createMonitorControls(model);
    runtime.current = controls;
    const pointer = new Vector2();
    const hits: Intersection[] = [];
    const canvas = three.gl.domElement;
    let hovered = false;
    let savedCursor = "";
    let hoverFrame = 0;
    let pendingHover: { x: number; y: number } | null = null;
    let lastTap: { key: MonitorKnob; time: number } | null = null;
    let drag: { id: number; touch: boolean; moved: boolean; key: MonitorKnob; x: number; y: number; value: number; target: Element; cameraControls: { enabled: boolean } | null; enabled: boolean; scrollLease: RootScrollLockLease } | null = null;
    const visible = () => {
      let object: Object3D | null = model;
      while (object) { if (!object.visible) return false; object = object.parent; }
      return true;
    };
    const pick = ({ clientX, clientY }: { clientX: number; clientY: number }) => {
      if (!visible()) return;
      const bounds = canvas.getBoundingClientRect();
      if (clientX < bounds.left || clientX > bounds.right || clientY < bounds.top || clientY > bounds.bottom) return;
      pointer.set((clientX - bounds.left) / bounds.width * 2 - 1, -(clientY - bounds.top) / bounds.height * 2 + 1);
      model.updateWorldMatrix(true, true);
      three.raycaster.setFromCamera(pointer, three.camera);
      hits.length = 0;
      three.raycaster.intersectObjects(controls.pickTargets, true, hits);
      const hit = hits[0];
      const control = hit && controls.resolve(hit.object);
      return control && (monitorState.power || control.id === "power") ? control : undefined;
    };
    const cursor = (value: string | null) => {
      if (value) {
        if (!hovered) savedCursor = document.body.style.cursor;
        hovered = true;
        document.body.style.cursor = value;
      } else if (hovered) { document.body.style.cursor = savedCursor; hovered = false; }
    };
    const stop = (event: Event) => { event.preventDefault(); event.stopImmediatePropagation(); };
    const finish = (event?: PointerEvent) => {
      if (!drag || (event && event.pointerId !== drag.id)) return;
      const previous = drag;
      drag = null;
      if (event?.type === "pointerup" && previous.touch && !previous.moved) {
        const now = performance.now();
        if (lastTap?.key === previous.key && now - lastTap.time < CONFIG.monitor.DOUBLE_TAP_MS) {
          resetMonitorKnob(monitorState, previous.key);
          lastTap = null;
        } else lastTap = { key: previous.key, time: now };
      }
      if (previous.target.hasPointerCapture(previous.id)) previous.target.releasePointerCapture(previous.id);
      if (previous.cameraControls) previous.cameraControls.enabled = previous.enabled;
      previous.scrollLease.release();
      cursor(null);
      if (event) stop(event);
    };
    const down = (event: PointerEvent) => {
      if (drag || event.button !== 0) return;
      const control = pick(event);
      if (!control) return;
      stop(event);
      if (control.kind === "button") {
        toggleMonitorButton(monitorState, control.id);
        onButtonPress?.(control.id);
        return;
      }
      const target = event.target instanceof Element ? event.target : canvas;
      const cameraControls = (three.get().controls as { enabled: boolean } | null) ?? null;
      drag = { id: event.pointerId, touch: event.pointerType !== "mouse", moved: false, key: control.id, x: event.clientX, y: event.clientY,
        value: knobNormalized(monitorState, control.id), target, cameraControls,
        enabled: cameraControls?.enabled ?? false,
        scrollLease: acquireRootScrollLock(window.scrollY) };
      target.setPointerCapture(event.pointerId);
      if (cameraControls) cameraControls.enabled = false;
      cursor("grabbing");
    };
    const move = (event: PointerEvent) => {
      if (drag) {
        if (event.pointerId !== drag.id) return;
        if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > CONFIG.monitor.TAP_SLOP) drag.moved = true;
        setMonitorKnob(monitorState, drag.key, drag.value + (event.clientX - drag.x + drag.y - event.clientY) / CONFIG.monitor.DRAG_PIXELS * 2);
        stop(event);
      } else {
        pendingHover = { x: event.clientX, y: event.clientY };
        if (hoverFrame) return;
        hoverFrame = requestAnimationFrame(() => {
          hoverFrame = 0;
          const point = pendingHover;
          pendingHover = null;
          const control = point ? pick({ clientX: point.x, clientY: point.y }) : undefined;
          cursor(control ? control.kind === "knob" ? "grab" : "pointer" : null);
        });
      }
    };
    const doubleClick = (event: MouseEvent) => {
      const control = pick(event);
      if (control?.kind !== "knob") return;
      resetMonitorKnob(monitorState, control.id);
      stop(event);
    };
    const click = (event: MouseEvent) => { if (pick(event)) stop(event); };
    const blur = () => { finish(); cursor(null); };
    const preventTouchScroll = (event: TouchEvent) => { if (drag) event.preventDefault(); };
    const wheel = (event: WheelEvent) => { if (drag) stop(event); };
    window.addEventListener("pointerdown", down, true);
    window.addEventListener("pointermove", move, { capture: true, passive: false });
    window.addEventListener("pointerup", finish, true);
    window.addEventListener("pointercancel", finish, true);
    window.addEventListener("lostpointercapture", finish, true);
    window.addEventListener("dblclick", doubleClick, true);
    window.addEventListener("click", click, true);
    window.addEventListener("blur", blur);
    window.addEventListener("touchmove", preventTouchScroll, { capture: true, passive: false });
    window.addEventListener("wheel", wheel, { capture: true, passive: false });
    return () => {
      if (hoverFrame) cancelAnimationFrame(hoverFrame);
      finish(); cursor(null);
      window.removeEventListener("pointerdown", down, true);
      window.removeEventListener("pointermove", move, true);
      window.removeEventListener("pointerup", finish, true);
      window.removeEventListener("pointercancel", finish, true);
      window.removeEventListener("lostpointercapture", finish, true);
      window.removeEventListener("dblclick", doubleClick, true);
      window.removeEventListener("click", click, true);
      window.removeEventListener("blur", blur);
      window.removeEventListener("wheel", wheel, true);
      window.removeEventListener("touchmove", preventTouchScroll, true);
      controls.dispose(); runtime.current = null;
    };
  }, [model, monitorState, onButtonPress, runtime, three]);

  useFrame((_, delta) => runtime.current?.syncPhysicalControlsFromState(monitorState, delta, reducedMotion));
  const scale = width / screenWidth;
  return <group name="CRTMonitor" scale={scale} position={[-screenCenter.x * scale, -screenCenter.y * scale, -(screenFront + CONFIG.workstation.CRT_SCREEN_CLEARANCE) * scale]} dispose={null}>
    <primitive object={model} />
  </group>;
}
