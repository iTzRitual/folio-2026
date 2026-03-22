import { Effect } from "postprocessing";
import { Uniform, Vector2 } from "three";

const fragmentShader = `
uniform vec2 u_mouse;
uniform vec2 u_prevMouse;
uniform float u_aberrationIntensity;
uniform vec2 u_resolution;
uniform float u_deltaTime; 

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
    
    float columns = 80.0; 
    float rows = columns / (u_resolution.x / u_resolution.y);
    vec2 gridSize = vec2(columns, rows);
    vec2 gridUV = floor(uv * gridSize) / gridSize;
    
    vec2 centerOfPixel = gridUV + vec2(1.0/gridSize.x, 1.0/gridSize.y) * 0.5;
    
    vec2 rawMouseDirection = u_mouse - u_prevMouse;
    vec2 mouseDirection = rawMouseDirection * (0.016666 / u_deltaTime);
    
    vec2 pixelToMouseDirection = (centerOfPixel - u_mouse) * aspect;
    float pixelDistanceToMouse = length(pixelToMouseDirection);
    
    float strength = smoothstep(0.15, 0.0, pixelDistanceToMouse);

    vec2 uvOffset = strength * mouseDirection * 0.3;
    vec2 newUv = uv - uvOffset;

    vec2 rgbOffset = mouseDirection * strength * u_aberrationIntensity * 1.5;

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
        ["u_prevMouse", new Uniform(new Vector2(0.5, 0.5))],
        ["u_aberrationIntensity", new Uniform(0.0)],
        ["u_resolution", new Uniform(new Vector2(1, 1))],
        ["u_deltaTime", new Uniform(0.016666)],
      ]),
    });
  }
}
