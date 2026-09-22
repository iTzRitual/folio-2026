import { Matrix4, type Object3D } from "three";
import { CONFIG } from "@/config/constants";

export function skullInteractionTransform(object: Object3D, target: Matrix4) {
  object.updateWorldMatrix(true, false);
  const determinant = object.matrixWorld.determinant();
  if (!Number.isFinite(determinant) || Math.abs(determinant) < CONFIG.model.PARTICLE_MIN_INTERACTION_SCALE ** 3) return false;
  target.copy(object.matrixWorld).invert();
  return true;
}
