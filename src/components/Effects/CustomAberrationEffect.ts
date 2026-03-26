import { Effect } from "postprocessing";
import { Uniform, Vector2 } from "three";

const fragmentShader = `
precision mediump float;
uniform vec2 u_mouse;
uniform float u_aberrationIntensity;
uniform vec2 u_gridSize;
uniform vec2 u_aspect;
uniform vec2 u_mouseVelocity;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    if (u_aberrationIntensity < 0.001) {
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

    vec4 colorR = texture2D(inputBuffer, newUv + rgbOffset);
    vec4 colorG = texture2D(inputBuffer, newUv);
    vec4 colorB = texture2D(inputBuffer, newUv - rgbOffset);

    outputColor = vec4(colorR.r, colorG.g, colorB.b, 1.0);
}
`;

export class CustomAberrationEffect extends Effect {
  constructor() {
    super("CustomAberrationEffect", fragmentShader, {
      uniforms: new Map<string, Uniform<Vector2 | number>>([
        ["u_mouse", new Uniform(new Vector2(0.5, 0.5))],
        ["u_aberrationIntensity", new Uniform(0.0)],
        ["u_gridSize", new Uniform(new Vector2(80.0, 80.0))],
        ["u_aspect", new Uniform(new Vector2(1.0, 1.0))],
        ["u_mouseVelocity", new Uniform(new Vector2(0.0, 0.0))],
      ]),
    });
  }
}