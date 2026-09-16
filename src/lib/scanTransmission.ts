import { BackSide, type Camera, type Mesh, type MeshPhysicalMaterial, type Scene, type Texture, type WebGLRenderer, type WebGLRenderTarget } from "three";

export function captureScanBackground(
  gl: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  mesh: Mesh,
  background: WebGLRenderTarget,
  backside: WebGLRenderTarget,
  renderBackside: boolean,
  layer: number,
) {
  const glass = mesh.material as MeshPhysicalMaterial & { buffer: Texture };
  glass.buffer = background.texture;
  mesh.layers.set(layer);
  gl.setRenderTarget(background);
  gl.render(scene, camera);
  if (!renderBackside) return;

  const originalSide = glass.side;
  const originalThickness = glass.thickness;
  const originalMask = camera.layers.mask;
  glass.side = BackSide;
  glass.thickness = 0;
  camera.layers.enable(layer);
  gl.setRenderTarget(backside);
  gl.render(scene, camera);
  camera.layers.mask = originalMask;
  glass.side = originalSide;
  glass.thickness = originalThickness;
  glass.buffer = backside.texture;
}
