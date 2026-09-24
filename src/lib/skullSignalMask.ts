import { BufferGeometry, Camera, Color, HalfFloatType, Mesh, Object3D, Scene, ShaderMaterial, WebGLRenderer, WebGLRenderTarget } from "three";
import { CONFIG } from "@/config/constants";

export function createSkullSignalMask(geometry: BufferGeometry) {
  const scene = new Scene();
  const material = new ShaderMaterial({
    vertexShader: `varying float depth;
      void main() {
        vec4 view = modelViewMatrix * vec4(position, 1.0);
        depth = -view.z;
        gl_Position = projectionMatrix * view;
      }`,
    fragmentShader: `varying float depth;
      void main() { gl_FragColor = vec4(depth, 0.0, 0.0, 1.0); }`,
    toneMapped: false,
  });
  const mesh = new Mesh(geometry, material);
  mesh.matrixAutoUpdate = false;
  scene.add(mesh);
  const target = new WebGLRenderTarget(CONFIG.projectOrbit.SIGNAL_MASK_SIZE, CONFIG.projectOrbit.SIGNAL_MASK_SIZE, { type: HalfFloatType });
  const clearColor = new Color();

  return {
    texture: target.texture,
    render(renderer: WebGLRenderer, camera: Camera, object: Object3D) {
      object.updateWorldMatrix(true, false);
      mesh.matrix.copy(object.matrixWorld);
      const previousTarget = renderer.getRenderTarget();
      const previousAlpha = renderer.getClearAlpha();
      const previousAutoClear = renderer.autoClear;
      renderer.getClearColor(clearColor);
      try {
        renderer.autoClear = true;
        renderer.setRenderTarget(target);
        renderer.setClearColor(0, 0);
        renderer.render(scene, camera);
      } finally {
        renderer.setRenderTarget(previousTarget);
        renderer.setClearColor(clearColor, previousAlpha);
        renderer.autoClear = previousAutoClear;
      }
    },
    dispose() {
      target.dispose();
      material.dispose();
    },
  };
}
