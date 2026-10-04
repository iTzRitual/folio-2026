import {
  Matrix4,
  Plane,
  Ray,
  Raycaster,
  Triangle,
  Vector2,
  Vector3,
  type Camera,
  type Face,
  type Intersection,
  type Mesh,
} from "three";
import type { ThreeEvent } from "@react-three/fiber";
import {
  beginVSCodeScrollbarDrag,
  endVSCodeScrollbarDrag,
  updateVSCodeScrollbarDrag,
  type VSCodeRenderer,
  type VSCodeScrollbarDrag,
} from "@/lib/vscodeRenderer";

type CaptureOwner = Pick<Element,
  "setPointerCapture" | "hasPointerCapture" | "releasePointerCapture"
>;

export function isPointerCaptureOwner(target: unknown): target is CaptureOwner {
  return typeof target === "object" && target !== null &&
    "setPointerCapture" in target && typeof target.setPointerCapture === "function" &&
    "hasPointerCapture" in target && typeof target.hasPointerCapture === "function" &&
    "releasePointerCapture" in target && typeof target.releasePointerCapture === "function";
}

export function createScrollbarPointerSession(
  terminalTarget: EventTarget,
  onFinish: (canceled: boolean) => void,
) {
  let active: { pointerId: number; owner: CaptureOwner; nativeTarget: EventTarget } | null = null;

  const finish = (pointerId?: number, canceled = true) => {
    if (!active || (pointerId !== undefined && pointerId !== active.pointerId)) return false;
    const previous = active;
    active = null;
    terminalTarget.removeEventListener("pointerup", onUp, { capture: true });
    terminalTarget.removeEventListener("pointercancel", onCancel, { capture: true });
    terminalTarget.removeEventListener("blur", onInterrupt);
    terminalTarget.removeEventListener("resize", onInterrupt);
    previous.nativeTarget.removeEventListener("lostpointercapture", onCancel);
    try {
      if (previous.owner.hasPointerCapture(previous.pointerId)) {
        try {
          previous.owner.releasePointerCapture(previous.pointerId);
        } catch (error) {
          if (!(error instanceof DOMException) || error.name !== "NotFoundError") throw error;
        }
      }
    } finally {
      onFinish(canceled);
    }
    return true;
  };
  const pointerIdOf = (event: Event) =>
    "pointerId" in event && typeof event.pointerId === "number"
      ? event.pointerId
      : null;
  const onUp = (event: Event) => {
    const pointerId = pointerIdOf(event);
    if (pointerId !== null) finish(pointerId, false);
  };
  const onCancel = (event: Event) => {
    const pointerId = pointerIdOf(event);
    if (pointerId !== null) finish(pointerId);
  };
  const onInterrupt = () => finish();

  return {
    get pointerId() { return active?.pointerId ?? null; },
    begin(pointerId: number, owner: CaptureOwner, nativeTarget: EventTarget) {
      if (active) return false;
      active = { pointerId, owner, nativeTarget };
      terminalTarget.addEventListener("pointerup", onUp, { capture: true });
      terminalTarget.addEventListener("pointercancel", onCancel, { capture: true });
      terminalTarget.addEventListener("blur", onInterrupt);
      terminalTarget.addEventListener("resize", onInterrupt);
      nativeTarget.addEventListener("lostpointercapture", onCancel);
      try {
        owner.setPointerCapture(pointerId);
      } catch (error) {
        finish();
        throw error;
      }
      return true;
    },
    finish,
  };
}

export function createScrollbarUvProjection(mesh: Mesh, face: Face) {
  const positions = mesh.geometry.getAttribute("position");
  const uvs = mesh.geometry.getAttribute("uv");
  const vertices = [face.a, face.b, face.c].map(index =>
    new Vector3().fromBufferAttribute(positions, index),
  );
  const coordinates = [face.a, face.b, face.c].map(index =>
    new Vector2(uvs.getX(index), uvs.getY(index)),
  );
  const plane = new Plane().setFromCoplanarPoints(vertices[0], vertices[1], vertices[2]);
  const inverse = new Matrix4();
  const localRay = new Ray();
  const point = new Vector3();
  const weights = new Vector3();
  const raycaster = new Raycaster();
  const intersections: Intersection[] = [];

  return (ray: Ray, target: Vector2) => {
    mesh.updateWorldMatrix(true, false);
    raycaster.ray.copy(ray);
    intersections.length = 0;
    raycaster.intersectObject(mesh, false, intersections);
    const uv = intersections[0]?.uv;
    if (uv) return target.copy(uv);
    inverse.copy(mesh.matrixWorld).invert();
    localRay.copy(ray).applyMatrix4(inverse);
    if (!localRay.intersectPlane(plane, point)) return null;
    if (!Triangle.getBarycoord(point, vertices[0], vertices[1], vertices[2], weights)) return null;
    target.set(
      coordinates[0].x * weights.x + coordinates[1].x * weights.y + coordinates[2].x * weights.z,
      coordinates[0].y * weights.x + coordinates[1].y * weights.y + coordinates[2].y * weights.z,
    );
    return target.clampScalar(0, 1);
  };
}

export function createWorkstationScrollbarController({
  terminalTarget,
  camera,
  getBounds,
  getSurface,
  getRenderer,
  mapContentUv,
}: {
  terminalTarget: EventTarget;
  camera: Camera;
  getBounds: () => Pick<DOMRect, "left" | "top" | "width" | "height">;
  getSurface: () => Mesh | null;
  getRenderer: () => VSCodeRenderer | null;
  mapContentUv: (source: Vector2, target: Vector2) => boolean;
}) {
  const pointer = new Vector2();
  const sourceUv = new Vector2();
  const contentUv = new Vector2();
  const raycaster = new Raycaster();
  let active: {
    renderer: VSCodeRenderer;
    drag: VSCodeScrollbarDrag;
    project: ReturnType<typeof createScrollbarUvProjection>;
  } | null = null;
  let suppressClick = false;
  const session = createScrollbarPointerSession(terminalTarget, canceled => {
    const renderer = active?.renderer;
    active = null;
    suppressClick = !canceled;
    if (renderer) endVSCodeScrollbarDrag(renderer);
  });
  const clearSuppression = () => {
    if (session.pointerId === null) suppressClick = false;
  };

  return {
    get pointerId() { return session.pointerId; },
    connect() {
      terminalTarget.addEventListener("pointerdown", clearSuppression, { capture: true });
      return () => {
        terminalTarget.removeEventListener("pointerdown", clearSuppression, { capture: true });
        session.finish();
        suppressClick = false;
      };
    },
    cancel() {
      session.finish();
      suppressClick = false;
    },
    consumeClick(detail: number) {
      const suppressed = suppressClick && detail > 0;
      suppressClick = false;
      return suppressed;
    },
    begin(event: ThreeEvent<PointerEvent>) {
      if (event.button !== 0 || !event.isPrimary || session.pointerId !== null) return false;
      const surface = getSurface();
      const renderer = getRenderer();
      const nativeTarget = event.nativeEvent.target;
      if (!surface || !renderer || !event.face || !event.uv ||
          !isPointerCaptureOwner(event.target) || !(nativeTarget instanceof EventTarget) ||
          !mapContentUv(event.uv, contentUv)) return false;
      const drag = beginVSCodeScrollbarDrag(renderer,
        contentUv.x * renderer.canvas.width,
        (1 - contentUv.y) * renderer.canvas.height,
      );
      if (!drag) return false;
      active = { renderer, drag, project: createScrollbarUvProjection(surface, event.face) };
      suppressClick = true;
      event.stopPropagation();
      event.nativeEvent.preventDefault();
      return session.begin(event.pointerId, event.target, nativeTarget);
    },
    move(event: ThreeEvent<PointerEvent>) {
      if (!active || session.pointerId !== event.pointerId) return false;
      const bounds = getBounds();
      if (bounds.width <= 0 || bounds.height <= 0) return false;
      pointer.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      if (!active.project(raycaster.ray, sourceUv)) return false;
      mapContentUv(sourceUv, contentUv);
      contentUv.clampScalar(0, 1);
      updateVSCodeScrollbarDrag(active.renderer, active.drag,
        contentUv.x * active.renderer.canvas.width,
        (1 - contentUv.y) * active.renderer.canvas.height,
      );
      event.stopPropagation();
      event.nativeEvent.preventDefault();
      return true;
    },
    finish(event: ThreeEvent<PointerEvent>) {
      if (!session.finish(event.pointerId, false)) return false;
      event.stopPropagation();
      event.nativeEvent.preventDefault();
      return true;
    },
  };
}
