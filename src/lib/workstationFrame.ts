import { MathUtils, Matrix4, Vector3 } from "three";
import { CONFIG } from "@/config/constants";
import type { DebugSettings } from "@/config/debugSettings";
import type { getCRTReferenceFrame } from "./crtScreen";

type CRTFrame = ReturnType<typeof getCRTReferenceFrame>;

export function workstationToScreen(frame: CRTFrame, settings: DebugSettings["workstation"]) {
  const p = settings.monitorPosition;
  return new Matrix4()
    .makeTranslation(-frame.screenCenter.x, -frame.screenCenter.y, -frame.screenFront - CONFIG.workstation.CRT_SCREEN_CLEARANCE)
    .multiply(new Matrix4().makeRotationY(-MathUtils.degToRad(settings.monitorYaw)))
    .multiply(new Matrix4().makeTranslation(-p.x, -p.y - settings.deskPosition.y, -p.z));
}

export function createWorkstationCameraPath(frame: CRTFrame, settings: DebugSettings, width: number, aspect: number) {
  const scale = width / frame.screenWidth;
  const matrix = workstationToScreen(frame, settings.workstation);
  const { cameraEnd, cameraTarget, cameraCurve, arcStart } = settings.sceneFraming;
  const narrow = 1 - MathUtils.smoothstep(aspect, 0.65, 1.35);
  const x = MathUtils.lerp(cameraEnd.x, settings.workstation.monitorPosition.x, narrow);
  const targetX = MathUtils.lerp(cameraTarget.x, settings.workstation.monitorPosition.x, narrow);
  const z = MathUtils.lerp(cameraEnd.z, CONFIG.workstation.CAMERA_NARROW_WIDTH / (2 * Math.tan(MathUtils.degToRad(settings.sceneFraming.finalFov) / 2) * aspect), narrow);
  const toScreen = (p: Vector3) => p.applyMatrix4(matrix).multiplyScalar(scale).add(new Vector3(0, 0, CONFIG.workstation.PLANE_Z));
  const end = toScreen(new Vector3(x, frame.supportY + cameraEnd.y, z));
  const target = toScreen(new Vector3(targetX, frame.supportY + cameraTarget.y, cameraTarget.z));
  const start = new Vector3(0, 0, CONFIG.scene.CAMERA_REST_Z);
  const startTarget = new Vector3(0, 0, CONFIG.workstation.PLANE_Z);
  const bend = new Vector3(cameraCurve.x, cameraCurve.y, cameraCurve.z).multiplyScalar(scale);
  return {
    sample(progress: number, position: Vector3, lookAt: Vector3) {
      const t = MathUtils.smootherstep(progress, 0, 1);
      const arc = MathUtils.smootherstep(progress, arcStart, 1);
      position.copy(start).lerp(end, t);
      position.x = MathUtils.lerp(start.x, end.x, arc);
      position.y = MathUtils.lerp(start.y, end.y, arc);
      position.addScaledVector(bend, 16 * arc * arc * (1 - arc) * (1 - arc));
      lookAt.copy(startTarget).lerp(target, arc);
    },
  };
}
