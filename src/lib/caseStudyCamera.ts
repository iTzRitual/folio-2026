import { MathUtils, type Camera, type Vector3 } from "three";
import { CONFIG } from "@/config/constants";

export function applyCaseStudyCamera(
  camera: Camera,
  anchor: Vector3,
  distance: number,
  progress: number,
) {
  camera.position.set(
    MathUtils.lerp(0, anchor.x, progress),
    MathUtils.lerp(0, anchor.y, progress),
    MathUtils.lerp(CONFIG.scene.CAMERA_REST_Z, anchor.z + distance, progress),
  );
  camera.up.set(0, 1, 0);
  camera.quaternion.identity();
  camera.updateMatrixWorld();
}
