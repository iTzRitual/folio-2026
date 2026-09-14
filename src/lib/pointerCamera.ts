import { MathUtils, Vector3, type PerspectiveCamera } from "three";
import { CONFIG } from "@/config/constants";
import type { DebugSettings } from "@/config/debugSettings";

export function createPointerCameraRuntime() {
  return {
    targetX: 0,
    targetY: 0,
    x: 0,
    y: 0,
    velocityX: 0,
    velocityY: 0,
    leaveX: 0,
    leaveY: 0,
    leaveElapsed: 0,
    entryElapsed: CONFIG.pointerCamera.REENTRY_DURATION as number,
    returning: false,
    inside: false,
    pressed: false,
    mouse: true,
    right: new Vector3(),
    focus: new Vector3(),
  };
}

type PointerCameraRuntime = ReturnType<typeof createPointerCameraRuntime>;

export function bindPointerCameraInput(
  runtime: PointerCameraRuntime,
  canvas: HTMLCanvasElement,
) {
  const surface = canvas.parentElement ?? canvas;
  const neutral = () => {
    if (runtime.inside) {
      runtime.leaveX = runtime.targetX;
      runtime.leaveY = runtime.targetY;
      runtime.leaveElapsed = 0;
      runtime.returning = true;
    }
    runtime.targetX = 0;
    runtime.targetY = 0;
    runtime.inside = false;
  };
  const move = (event: PointerEvent) => {
    runtime.mouse = event.pointerType === "mouse";
    if (!runtime.mouse) {
      neutral();
      return;
    }
    const bounds = canvas.getBoundingClientRect();
    const inside = bounds.width > 0 && bounds.height > 0 &&
      event.clientX >= bounds.left && event.clientX <= bounds.right &&
      event.clientY >= bounds.top && event.clientY <= bounds.bottom;
    if (!inside) {
      neutral();
      return;
    }
    if (runtime.returning) runtime.entryElapsed = 0;
    runtime.returning = false;
    runtime.inside = true;
    runtime.targetX = (event.clientX - bounds.left) / bounds.width * 2 - 1;
    runtime.targetY = 1 - (event.clientY - bounds.top) / bounds.height * 2;
    runtime.pressed = event.buttons !== 0;
  };
  const down = (event: PointerEvent) => {
    move(event);
    if (runtime.inside) runtime.pressed = true;
  };
  const up = (event: PointerEvent) => {
    move(event);
    runtime.pressed = event.buttons !== 0;
  };
  const cancel = () => {
    runtime.pressed = false;
    neutral();
  };
  const leaveWindow = (event: PointerEvent) => {
    if (event.relatedTarget === null) neutral();
  };
  window.addEventListener("pointermove", move, true);
  window.addEventListener("pointerdown", down, true);
  window.addEventListener("pointerup", up, true);
  window.addEventListener("pointercancel", cancel, true);
  window.addEventListener("lostpointercapture", up, true);
  window.addEventListener("pointerout", leaveWindow, true);
  window.addEventListener("blur", cancel);
  surface.addEventListener("pointerleave", neutral);
  return () => {
    window.removeEventListener("pointermove", move, true);
    window.removeEventListener("pointerdown", down, true);
    window.removeEventListener("pointerup", up, true);
    window.removeEventListener("pointercancel", cancel, true);
    window.removeEventListener("lostpointercapture", up, true);
    window.removeEventListener("pointerout", leaveWindow, true);
    window.removeEventListener("blur", cancel);
    surface.removeEventListener("pointerleave", neutral);
    cancel();
  };
}

function pointerAxis(value: number, deadzone: number) {
  const limit = CONFIG.pointerCamera.POINTER_CLAMP;
  const magnitude = MathUtils.clamp(Math.abs(value), 0, limit);
  return Math.sign(value) * Math.max(0, magnitude - deadzone) / (limit - deadzone);
}

function dampAxis(runtime: PointerCameraRuntime, axis: "x" | "y", target: number, omega: number, delta: number) {
  const velocityKey = axis === "x" ? "velocityX" : "velocityY";
  const offset = runtime[axis] - target;
  if (offset === 0) {
    runtime[velocityKey] = 0;
    return;
  }
  const decay = Math.exp(-omega * delta);
  const impulse = (runtime[velocityKey] + omega * offset) * delta;
  const position = target + (offset + impulse) * decay;
  runtime[velocityKey] = (runtime[velocityKey] - omega * impulse) * decay;
  if ((target - runtime[axis]) * (position - target) > 0 ||
    (Math.abs(position - target) < CONFIG.pointerCamera.SETTLE_EPSILON &&
      Math.abs(runtime[velocityKey]) < CONFIG.pointerCamera.SETTLE_EPSILON)) {
    runtime[axis] = target;
    runtime[velocityKey] = 0;
  } else {
    runtime[axis] = position;
  }
}

export function applyPointerCamera(
  runtime: PointerCameraRuntime,
  camera: PerspectiveCamera,
  focus: Vector3,
  settings: DebugSettings["pointerCamera"],
  reveal: number,
  scrollSpeed: number,
  delta: number,
  allowed: boolean,
) {
  if (!allowed || !settings.enabled || !runtime.mouse || reveal <= settings.revealStart) {
    runtime.x = 0;
    runtime.y = 0;
    runtime.velocityX = 0;
    runtime.velocityY = 0;
    return;
  }

  if (!runtime.pressed) {
    const scrollInfluence = 1 - settings.scrollAttenuation * MathUtils.smoothstep(
      Math.abs(scrollSpeed), 0, CONFIG.pointerCamera.SCROLL_FULL_SPEED,
    );
    runtime.leaveElapsed = Math.min(runtime.leaveElapsed + delta, settings.returnDuration);
    runtime.entryElapsed = Math.min(runtime.entryElapsed + delta, CONFIG.pointerCamera.REENTRY_DURATION);
    const returnProgress = runtime.leaveElapsed / settings.returnDuration;
    const returnAmount = returnProgress >= 1 ? 0 : Math.cos(returnProgress * Math.PI / 2);
    const x = pointerAxis(runtime.inside ? runtime.targetX : runtime.leaveX * returnAmount, settings.deadzone) * scrollInfluence;
    const y = pointerAxis(runtime.inside ? runtime.targetY : runtime.leaveY * returnAmount, settings.deadzone) * scrollInfluence;
    const entryProgress = runtime.entryElapsed / CONFIG.pointerCamera.REENTRY_DURATION;
    const entrySpeed = 1 - (1 - CONFIG.pointerCamera.REENTRY_SPEED) * Math.cos(entryProgress * Math.PI / 2);
    const omega = 2 / settings.smoothTime;
    dampAxis(runtime, "x", x, omega, delta * entrySpeed);
    dampAxis(runtime, "y", y, omega, delta * entrySpeed);
  } else {
    runtime.velocityX = 0;
    runtime.velocityY = 0;
  }

  const influence = MathUtils.smoothstep(reveal, settings.revealStart,
    Math.max(settings.revealStart, settings.revealFull));
  const referenceHalfHeight = Math.tan(MathUtils.degToRad(CONFIG.pointerCamera.REFERENCE_FOV) / 2) *
    Math.max(1, CONFIG.pointerCamera.REFERENCE_ASPECT / camera.aspect);
  const lensScale = Math.tan(MathUtils.degToRad(camera.fov) / 2) / referenceHalfHeight;
  const focusDistance = camera.position.distanceTo(focus) * settings.focusDepth;
  const horizontal = -runtime.x * settings.horizontalStrength * focusDistance * lensScale * influence;
  const vertical = -runtime.y * settings.verticalStrength * focusDistance * lensScale * influence;
  if (horizontal === 0 && vertical === 0) return;

  runtime.focus.copy(camera.position).lerp(focus, settings.focusDepth);
  runtime.right.set(1, 0, 0).applyQuaternion(camera.quaternion);
  camera.position.addScaledVector(runtime.right, horizontal);
  camera.position.addScaledVector(camera.up, vertical);
  camera.lookAt(runtime.focus);
}
