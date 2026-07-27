import type { Vector2, WebGLProgramParametersWithUniforms } from "three";
import { applyCurlShader } from "./detailsCurl";

const BLOCK_VARYING = /* glsl */ `
varying vec2 vBlockUv;
`;

const BLOCK_DEFS = /* glsl */ `
uniform vec2 uBlockRadiusUv;
varying vec2 vBlockUv;
`;

const BLOCK_ALPHA = /* glsl */ `
{
  vec2 blockCorner =
    max(abs(vBlockUv - 0.5) - (0.5 - uBlockRadiusUv), 0.0) / uBlockRadiusUv;
  float blockDist = length(blockCorner) - 1.0;
  float blockEdge = max(fwidth(blockDist), 1e-5);
  diffuseColor.a *= 1.0 - smoothstep(-blockEdge, blockEdge, blockDist);
}
#include <opaque_fragment>
`;

export function roundedCurlShader(radiusUv: { value: Vector2 }) {
    return (shader: WebGLProgramParametersWithUniforms) => {
        applyCurlShader(shader);

        shader.uniforms.uBlockRadiusUv = radiusUv;

        shader.vertexShader = BLOCK_VARYING + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
            "void main() {",
            "void main() {\n  vBlockUv = uv;",
        );

        shader.fragmentShader = BLOCK_DEFS + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace(
            "#include <opaque_fragment>",
            BLOCK_ALPHA,
        );
    };
}
