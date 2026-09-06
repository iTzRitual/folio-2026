import { Box3, BufferGeometry, Float32BufferAttribute, MathUtils, Mesh, Object3D, Vector3 } from "three";
import { CONFIG } from "@/config/constants";

export function crtMorph(reveal: number, reducedMotion: boolean) {
  return reducedMotion ? 1 : MathUtils.smoothstep(reveal,
    CONFIG.phase2.BROWSER_REVEAL_START, CONFIG.phase2.CRT_MORPH_END);
}

function perimeter(mesh: Mesh) {
  const attribute = mesh.geometry.getAttribute("position");
  const unique = new Map<string, Vector3>();
  for (let i = 0; i < attribute.count; i += 1) {
    const p = new Vector3().fromBufferAttribute(attribute, i).applyMatrix4(mesh.matrixWorld);
    unique.set(`${p.x.toFixed(7)},${p.y.toFixed(7)}`, p);
  }
  const points = [...unique.values()].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (a: Vector3, b: Vector3, c: Vector3) =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const half = (list: Vector3[]) => {
    const hull: Vector3[] = [];
    for (const p of list) {
      while (hull.length > 1 && cross(hull[hull.length - 2], hull[hull.length - 1], p) <= 0) hull.pop();
      hull.push(p);
    }
    hull.pop();
    return hull;
  };
  const hull = [...half(points), ...half([...points].reverse())];
  return hull.flatMap((p, i) => {
    const next = hull[(i + 1) % hull.length];
    const count = Math.max(1, Math.ceil(p.distanceTo(next) / CONFIG.phase2.CRT_CONTOUR_STEP));
    return Array.from({ length: count }, (_, j) => p.clone().lerp(next, j / count));
  });
}

export function createCRTGeometry(model: Object3D, width: number) {
  model.updateMatrixWorld(true);
  const source = model.getObjectByName("CRT_Screen") as Mesh;
  const glass = model.getObjectByName("CRT_Glass") as Mesh;
  const bounds = new Box3().setFromObject(source);
  const center = bounds.getCenter(new Vector3());
  const scale = width / (bounds.max.x - bounds.min.x);
  const contour = perimeter(glass);
  const glassBounds = new Box3().setFromPoints(contour);
  const inset = CONFIG.phase2.CRT_INNER_BORDER_WIDTH;
  const halfWidth = (glassBounds.max.x - glassBounds.min.x) / 2;
  const halfHeight = (glassBounds.max.y - glassBounds.min.y) / 2;
  const sx = (halfWidth - inset) / halfWidth;
  const sy = (halfHeight - inset) / halfHeight;
  let xx = 0, xy = 0, yy = 0, xz = 0, yz = 0;
  const positions = source.geometry.getAttribute("position");
  for (let i = 0; i < positions.count; i += 1) {
    const p = new Vector3().fromBufferAttribute(positions, i).applyMatrix4(source.matrixWorld);
    const x = (p.x - center.x) ** 2;
    const y = (p.y - center.y) ** 2;
    const z = p.z - bounds.max.z;
    xx += x * x; xy += x * y; yy += y * y; xz += x * z; yz += y * z;
  }
  const determinant = xx * yy - xy * xy;
  const curveX = (xz * yy - yz * xy) / determinant;
  const curveY = (yz * xx - xz * xy) / determinant;
  const crown = (x: number, y: number) => bounds.max.z + curveX * (x - center.x) ** 2 + curveY * (y - center.y) ** 2;
  const transform = (x: number, y: number, z: number) => [
    (x - center.x) * scale,
    (y - center.y) * scale,
    (z - bounds.max.z - CONFIG.phase2.CRT_SCREEN_CLEARANCE) * scale,
  ];
  const vertices = [...transform(center.x, center.y, crown(center.x, center.y))];
  const uv = [0.5, 0.5];
  const edge = [0];
  const indices: number[] = [];
  const n = contour.length;
  const rings = CONFIG.phase2.CRT_SCREEN_RINGS;
  for (let ring = 1; ring <= rings; ring += 1) {
    const t = ring / rings;
    for (const p of contour) {
      const x = center.x + (p.x - center.x) * sx * t;
      const y = center.y + (p.y - center.y) * sy * t;
      vertices.push(...transform(x, y, crown(x, y)));
      const u = (x - center.x) / (halfWidth * sx);
      const v = (y - center.y) / (halfHeight * sy);
      const k = CONFIG.phase2.CRT_BARREL;
      uv.push((u + k * u * v * v * (1 - u * u) + 1) / 2,
        (v + k * v * u * u * (1 - v * v) + 1) / 2);
      edge.push(t);
    }
    for (let i = 0; i < n; i += 1) {
      const a = 1 + (ring - 1) * n + i;
      const b = 1 + (ring - 1) * n + (i + 1) % n;
      if (ring === 1) indices.push(0, a, b);
      else indices.push(a - n, a, b, a - n, b, b - n);
    }
  }
  const surface = new BufferGeometry();
  surface.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  surface.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  surface.setAttribute("screenEdge", new Float32BufferAttribute(edge, 1));
  surface.setIndex(indices);
  surface.computeVertexNormals();
  surface.computeBoundingSphere();

  const rimVertices: number[] = [];
  const rimIndices: number[] = [];
  const bevel = CONFIG.phase2.CRT_INNER_BORDER_BEVEL;
  const steps = CONFIG.phase2.CRT_BORDER_SEGMENTS;
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    for (const p of contour) {
      const x = center.x + (p.x - center.x) * (1 - (1 - sx) * t);
      const y = center.y + (p.y - center.y) * (1 - (1 - sy) * t);
      const z = crown(x, y) - CONFIG.phase2.CRT_INNER_BORDER_RECESS * (1 - t)
        + bevel * t + Math.sin(Math.PI * t) * bevel;
      rimVertices.push(...transform(x, y, z));
    }
    if (step === 0) continue;
    for (let i = 0; i < n; i += 1) {
      const a = (step - 1) * n + i;
      const b = (step - 1) * n + (i + 1) % n;
      rimIndices.push(a, b, b + n, a, b + n, a + n);
    }
  }
  const border = new BufferGeometry();
  border.setAttribute("position", new Float32BufferAttribute(rimVertices, 3));
  border.setIndex(rimIndices);
  border.computeVertexNormals();
  border.computeBoundingSphere();
  const finalPositions = new Float32Array(vertices);
  const finalUvs = new Float32Array(uv);
  let previousAmount = -1;
  const updateSurface = (amount: number) => {
    if (amount === previousAmount) return;
    previousAmount = amount;
    const position = surface.getAttribute("position");
    const texcoord = surface.getAttribute("uv");
    for (let i = 0; i < position.count; i += 1) {
      const x = finalUvs[i * 2] * 2 - 1;
      const y = finalUvs[i * 2 + 1] * 2 - 1;
      const radius = Math.max(Math.abs(x), Math.abs(y));
      const expansion = radius > 0 ? edge[i] / radius : 0;
      const u = (x * expansion + 1) / 2;
      const v = (y * expansion + 1) / 2;
      position.setXYZ(i,
        MathUtils.lerp((u - 0.5) * width, finalPositions[i * 3], amount),
        MathUtils.lerp((v - 0.5) * width / CONFIG.phase2.PLANE_ASPECT, finalPositions[i * 3 + 1], amount),
        finalPositions[i * 3 + 2] * amount);
      texcoord.setXY(i, MathUtils.lerp(u, finalUvs[i * 2], amount),
        MathUtils.lerp(v, finalUvs[i * 2 + 1], amount));
    }
    position.needsUpdate = true;
    texcoord.needsUpdate = true;
    surface.computeVertexNormals();
    surface.computeBoundingSphere();
  };
  updateSurface(0);
  return { surface, border, updateSurface };
}
