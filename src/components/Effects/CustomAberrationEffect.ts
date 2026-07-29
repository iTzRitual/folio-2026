import { Effect, EffectAttribute } from "postprocessing";
import { Uniform, Vector2, Vector4 } from "three";
import { CONFIG } from "../../config/constants";

const {
  SCROLL_TAPS,
  SCROLL_BLUR,
  SCROLL_SPLIT,
  SCROLL_VIGNETTE_X_WEIGHT,
  SCROLL_VIGNETTE_FLOOR,
  SCROLL_VIGNETTE_INNER,
  SCROLL_VIGNETTE_OUTER,
} = CONFIG.customAberration;

const buildFragmentShader = (taps: number) => `
precision mediump float;
uniform vec2 u_mouse;
uniform float u_aberrationIntensity;
uniform vec2 u_gridSize;
uniform vec2 u_aspect;
uniform vec2 u_mouseVelocity;
uniform float u_scrollVelocity;
uniform float u_scrollBlur;
uniform float u_scrollSplit;
uniform vec4 u_scrollVignette;

#define SCROLL_TAPS ${Math.max(2, Math.round(taps))}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    if (u_aberrationIntensity < 0.001 && abs(u_scrollVelocity) < 0.001) {
        outputColor = texture2D(inputBuffer, uv);
        return;
    }

    vec2 gridUV = floor(uv * u_gridSize) / u_gridSize;
    vec2 centerOfPixel = gridUV + (1.0 / u_gridSize) * 0.5;

    vec2 pixelToMouseDirection = (centerOfPixel - u_mouse) * u_aspect;
    float pixelDistanceToMouse = length(pixelToMouseDirection);
    float strength = smoothstep(0.15, 0.0, pixelDistanceToMouse);

    vec2 uvOffset = strength * u_mouseVelocity * 0.3;
    vec2 newUv = uv - uvOffset;
    vec2 rgbOffset = u_mouseVelocity * strength * u_aberrationIntensity * 1.5;

    // The tap loop costs three dependent fetches per iteration. When the page
    // is still, every tap lands on the same texel — the split alone needs
    // three fetches, not SCROLL_TAPS * 3. The test is on uniforms only, so the
    // branch is coherent across the whole pass.
    if (abs(u_scrollVelocity) * u_scrollBlur < 0.0001) {
        outputColor = vec4(
            texture2D(inputBuffer, newUv + rgbOffset).r,
            texture2D(inputBuffer, newUv).g,
            texture2D(inputBuffer, newUv - rgbOffset).b,
            1.0
        );
        return;
    }

    vec2 fromCenter = (uv - 0.5) * vec2(u_scrollVignette.x, 1.0);
    float edge = mix(
        u_scrollVignette.w,
        1.0,
        smoothstep(u_scrollVignette.y, u_scrollVignette.z, length(fromCenter))
    );
    float blurAmount = abs(u_scrollVelocity) * u_scrollBlur * edge;
    vec2 scrollSplit = vec2(0.0, u_scrollVelocity * u_scrollSplit * edge);

    vec3 accum = vec3(0.0);

    for (int i = 0; i < SCROLL_TAPS; i++) {
        float t = float(i) / float(SCROLL_TAPS - 1) - 0.5;
        vec2 tapUv = newUv + vec2(0.0, t * blurAmount);

        accum.r += texture2D(inputBuffer, tapUv + rgbOffset + scrollSplit).r;
        accum.g += texture2D(inputBuffer, tapUv).g;
        accum.b += texture2D(inputBuffer, tapUv - rgbOffset - scrollSplit).b;
    }

    outputColor = vec4(accum / float(SCROLL_TAPS), 1.0);
}
`;

export class CustomAberrationEffect extends Effect {
  constructor(taps: number = SCROLL_TAPS) {
    super("CustomAberrationEffect", buildFragmentShader(taps), {
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, Uniform<Vector2 | Vector4 | number>>([
        ["u_mouse", new Uniform(new Vector2(0.5, 0.5))],
        ["u_aberrationIntensity", new Uniform(0.0)],
        ["u_gridSize", new Uniform(new Vector2(80.0, 80.0))],
        ["u_aspect", new Uniform(new Vector2(1.0, 1.0))],
        ["u_mouseVelocity", new Uniform(new Vector2(0.0, 0.0))],
        ["u_scrollVelocity", new Uniform(0.0)],
        ["u_scrollBlur", new Uniform(SCROLL_BLUR)],
        ["u_scrollSplit", new Uniform(SCROLL_SPLIT)],
        [
          "u_scrollVignette",
          new Uniform(
            new Vector4(
              SCROLL_VIGNETTE_X_WEIGHT,
              SCROLL_VIGNETTE_INNER,
              SCROLL_VIGNETTE_OUTER,
              SCROLL_VIGNETTE_FLOOR,
            ),
          ),
        ],
      ]),
    });
  }
}
