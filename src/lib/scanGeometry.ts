import { CONFIG } from "@/config/constants";
import { BufferGeometry, Float32BufferAttribute, Matrix4, Mesh, Vector3 } from "three";

export function createScanGeometry(node: Mesh): BufferGeometry {
  node.updateWorldMatrix(true, false);
  const geometry = node.geometry.clone();
  for (const name of ["position", "normal"]) {
    const attribute = geometry.getAttribute(name);
    const values = new Float32Array(attribute.count * 3);
    for (let i = 0; i < attribute.count; i++) {
      values[i * 3] = attribute.getX(i);
      values[i * 3 + 1] = attribute.getY(i);
      values[i * 3 + 2] = attribute.getZ(i);
    }
    geometry.setAttribute(name, new Float32BufferAttribute(values, 3));
  }
  geometry.applyMatrix4(node.matrixWorld);
  geometry.applyMatrix4(new Matrix4().makeRotationY(CONFIG.scan.FRONT_YAW));
  geometry.computeBoundingBox();
  const center = geometry.boundingBox!.getCenter(new Vector3());
  const size = geometry.boundingBox!.getSize(new Vector3());
  geometry.translate(-center.x, -center.y, -center.z);
  geometry.scale(1 / size.y, 1 / size.y, 1 / size.y);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
