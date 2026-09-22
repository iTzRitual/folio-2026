import { DataTexture, FloatType, IcosahedronGeometry, Mesh, MeshNormalMaterial, PerspectiveCamera, RGBAFormat, Scene, Uniform, WebGLRenderer, WebGLRenderTarget } from "three";
import { applySkullFragmentShader, createSkullFragments } from "@/lib/skullFragments";
import { skullParticleLayout } from "@/lib/skullParticles";

export function checkSkullSeams(renderer: WebGLRenderer) {
  const source = new IcosahedronGeometry(1, 3);
  const fragments = createSkullFragments(source, 12);
  const size = skullParticleLayout(fragments.count).textureSize;
  const rest = new DataTexture(fragments.samples.positions.slice(), size, size, RGBAFormat, FloatType);
  const positions = new DataTexture(fragments.samples.positions.slice(), size, size, RGBAFormat, FloatType);
  rest.needsUpdate = true;
  positions.needsUpdate = true;
  const solid = new MeshNormalMaterial();
  const broken = new MeshNormalMaterial();
  const restore = applySkullFragmentShader(broken, { positions: new Uniform(positions), restPosition: new Uniform(rest) });
  const camera = new PerspectiveCamera(45, 1, 0.1, 10);
  camera.position.z = 3.5;
  const scene = new Scene();
  const mesh: Mesh = new Mesh(source, solid);
  scene.add(mesh);
  const target = new WebGLRenderTarget(128, 128);
  const capture = () => {
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    const pixels = new Uint8Array(128 * 128 * 4);
    renderer.readRenderTargetPixels(target, 0, 0, 128, 128, pixels);
    return pixels;
  };
  try {
    const reference = capture();
    if (!reference.some((value, index) => index % 4 < 3 && value > 0)) throw new Error("Reference render is blank");
    mesh.geometry = fragments.geometry;
    mesh.material = broken;
    const closed = capture();
    const difference = (pixels: Uint8Array) => pixels.reduce((count, value, index) => count + (Math.abs(value - reference[index]) > 1 ? 1 : 0), 0);
    if (difference(closed) !== 0) throw new Error(`Resting fragments differ from the original surface: ${difference(closed)} channels`);
    const data = positions.image.data as Float32Array;
    for (let index = 0; index < fragments.count; index++) data[index * 4] += 0.000001;
    positions.needsUpdate = true;
    if (difference(capture()) !== 0) throw new Error("Numerical settling must not leave cracks");
    for (let index = 0; index < fragments.count; index++) {
      for (let axis = 0; axis < 3; axis++) data[index * 4 + axis] = fragments.samples.positions[index * 4 + axis] * 1.3;
    }
    positions.needsUpdate = true;
    if (difference(capture()) < 1000) throw new Error("Moving fragments must still separate");
    return "PASS: resting and settled fragment renders match the solid surface pixel for pixel; displaced fragments separate.";
  } finally {
    renderer.setRenderTarget(null);
    restore();
    source.dispose();
    fragments.geometry.dispose();
    solid.dispose();
    broken.dispose();
    rest.dispose();
    positions.dispose();
    target.dispose();
  }
}
