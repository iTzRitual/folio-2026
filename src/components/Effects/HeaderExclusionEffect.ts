import { Effect } from "postprocessing";
import {
  LinearFilter,
  Uniform,
  WebGLRenderTarget,
  type Camera,
  type Scene,
  type WebGLRenderer,
} from "three";

export const HEADER_LAYER = 1;
const EMPTY_LAYER = 31;

const FRAGMENT = /* glsl */ `
uniform sampler2D u_header;
uniform sampler2D u_backdropSample;
uniform float u_threshold;
uniform float u_softness;
uniform float u_strength;

vec3 linearToSRGB(vec3 c) {
  vec3 low = c * 12.92;
  vec3 high = 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
  return mix(low, high, step(vec3(0.0031308), c));
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec4 header = texture2D(u_header, uv);

  if (header.a <= 0.0) {
    outputColor = inputColor;
    return;
  }

  vec3 backdrop = clamp(inputColor.rgb, 0.0, 1.0);
  vec3 bg = clamp(texture2D(u_backdropSample, vec2(0.5)).rgb, 0.0, 1.0);
  float difference = distance(linearToSRGB(backdrop), linearToSRGB(bg));
  float coverage = smoothstep(
    u_threshold,
    u_threshold + max(u_softness, 0.0001),
    difference
  );

  vec3 headerColor = header.rgb / header.a;
  vec3 knocked = mix(headerColor, bg, coverage * u_strength);

  outputColor = vec4(mix(backdrop, knocked, header.a), inputColor.a);
}
`;

export class HeaderExclusionEffect extends Effect {
  private readonly scene: Scene;
  private readonly camera: Camera;
  private readonly target: WebGLRenderTarget;
  private readonly backdropSample: WebGLRenderTarget;

  constructor(scene: Scene, camera: Camera) {
    const target = new WebGLRenderTarget(1, 1, {
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
    });

    const backdropSample = new WebGLRenderTarget(1, 1, {
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
    });

    super("HeaderExclusionEffect", FRAGMENT, {
      uniforms: new Map<string, Uniform<unknown>>([
        ["u_header", new Uniform(target.texture)],
        ["u_backdropSample", new Uniform(backdropSample.texture)],
        ["u_threshold", new Uniform(0.05)],
        ["u_softness", new Uniform(0.15)],
        ["u_strength", new Uniform(1)],
      ]),
    });

    this.scene = scene;
    this.camera = camera;
    this.target = target;
    this.backdropSample = backdropSample;
  }

  update(renderer: WebGLRenderer) {
    const previousTarget = renderer.getRenderTarget();
    const previousMask = this.camera.layers.mask;
    const previousClearAlpha = renderer.getClearAlpha();
    const previousBackground = this.scene.background;

    this.camera.layers.set(EMPTY_LAYER);
    renderer.setRenderTarget(this.backdropSample);
    renderer.render(this.scene, this.camera);

    this.camera.layers.set(HEADER_LAYER);
    this.scene.background = null;
    renderer.setClearAlpha(0);
    renderer.setRenderTarget(this.target);
    renderer.render(this.scene, this.camera);

    this.scene.background = previousBackground;
    renderer.setClearAlpha(previousClearAlpha);
    renderer.setRenderTarget(previousTarget);
    this.camera.layers.mask = previousMask;
  }

  setSize(width: number, height: number) {
    this.target.setSize(width, height);
  }

  dispose() {
    this.target.dispose();
    this.backdropSample.dispose();
    super.dispose();
  }
}
