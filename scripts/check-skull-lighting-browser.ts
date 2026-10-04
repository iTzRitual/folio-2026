import { Color, IcosahedronGeometry, Mesh, MeshStandardMaterial, PerspectiveCamera, Scene, WebGLRenderTarget, type WebGLRenderer } from "three";
import { applySkullOrbitLighting, createSkullOrbitLightingUniforms } from "@/lib/skullOrbitLighting";

export function checkSkullLighting(renderer: WebGLRenderer) {
  const geometry = new IcosahedronGeometry(0.65, 3);
  const material = new MeshStandardMaterial({ color: "#888888", emissive: "#505050" });
  const uniforms = createSkullOrbitLightingUniforms();
  const restore = applySkullOrbitLighting(material, uniforms);
  const scene = new Scene();
  scene.background = new Color("#202020");
  const camera = new PerspectiveCamera(45, 1, 0.1, 10);
  camera.position.z = 3;
  camera.updateMatrixWorld();
  uniforms.skullOrbitFromView.value.copy(camera.matrixWorld);
  uniforms.skullOrbitReveal.value = 1;
  const mesh = new Mesh(geometry, material);
  scene.add(mesh);
  const target = new WebGLRenderTarget(96, 96);
  const previousTarget = renderer.getRenderTarget();
  const capture = () => {
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    const pixels = new Uint8Array(96 * 96 * 4);
    renderer.readRenderTargetPixels(target, 0, 0, 96, 96, pixels);
    return pixels;
  };
  try {
    const reference = capture();
    const center = (48 * 96 + 48) * 4;
    if (reference[center] <= 0) throw new Error("Skull lighting reference must have a visible surface");
    let checks = 0;
    for (const curvature of [1, 0.5, 0.01, 0]) {
      uniforms.skullOrbitCurvature.value = curvature;
      for (const phase of [-Math.PI, -Math.PI / 2, -0.01, 0, 0.01, Math.PI / 2, Math.PI]) {
        uniforms.skullOrbitPhase.value = phase;
        uniforms.skullOrbitLight.value.set(1, 0, 0, 0);
        const neutral = capture();
        const changed = neutral.reduce((count, value, index) => count + (Math.abs(value - reference[index]) > 1 ? 1 : 0), 0);
        if (changed > 0) throw new Error(`Neutral orbit lighting corrupts ${changed} channels at phase ${phase}, curvature ${curvature}`);
        uniforms.skullOrbitLight.value.set(1, 1, 0, 0);
        const lit = capture();
        if (lit.some((value, index) => index % 4 < 3 && value + 1 < reference[index])) {
          throw new Error(`Additive orbit lighting darkens the surface at phase ${phase}, curvature ${curvature}`);
        }
        checks++;
      }
    }
    return `PASS: skull orbit lighting preserves neutral pixels and never darkens additive light across ${checks} signed phase/curvature combinations.`;
  } finally {
    renderer.setRenderTarget(previousTarget);
    restore();
    target.dispose();
    geometry.dispose();
    material.dispose();
  }
}
