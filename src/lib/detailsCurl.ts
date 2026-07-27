import type { WebGLProgramParametersWithUniforms } from "three";
import { CONFIG } from "@/config/constants";

export const curlUniforms: Record<string, { value: number }> = {
    uCurlFoldY: { value: 0 },
    uCurlRadius: { value: 1 },
    uCurlMaxAngle: { value: CONFIG.detailsCurl.MAX_ANGLE },
    uCurlBend: { value: 1 },
};

export const modelCurlUniforms: Record<string, { value: number }> = {
    uCurlFoldY: { value: 0 },
    uCurlRadius: { value: 1 },
    uCurlMaxAngle: { value: CONFIG.detailsCurl.MAX_ANGLE },
    uCurlBend: { value: 1 },
};

const MODEL_DEPTH_RATIO =
    (CONFIG.scene.CAMERA_Z - CONFIG.model.DEPTH_Z) /
    (CONFIG.scene.CAMERA_Z - CONFIG.scene.DETAILS_GROUP_Z);

export const curlFadeRange: { start: number; end: number } = {
    start: CONFIG.detailsCurl.FADE_ANGLE_START,
    end: CONFIG.detailsCurl.FADE_ANGLE_END,
};

export interface CurlSettings {
    foldOffsetMult: number;
    radiusMult: number;
    maxAngle: number;
    fadeAngleStart: number;
    fadeAngleEnd: number;
    bend: number;
}

export function applyCurlSettings(
    viewportHeight: number,
    titleSettledBottomY: number,
    contentRestY: number,
    settings: CurlSettings,
) {
    const radius = Math.max(viewportHeight * settings.radiusMult, 0.0001);

    curlUniforms.uCurlRadius.value = radius;
    curlUniforms.uCurlFoldY.value =
        Math.max(
            contentRestY,
            titleSettledBottomY - settings.fadeAngleEnd * radius,
        ) +
        viewportHeight * settings.foldOffsetMult;
    curlUniforms.uCurlMaxAngle.value = settings.maxAngle;
    curlUniforms.uCurlBend.value = settings.bend;

    modelCurlUniforms.uCurlFoldY.value =
        curlUniforms.uCurlFoldY.value * MODEL_DEPTH_RATIO;
    modelCurlUniforms.uCurlRadius.value = radius * MODEL_DEPTH_RATIO;
    modelCurlUniforms.uCurlMaxAngle.value = settings.maxAngle;
    modelCurlUniforms.uCurlBend.value = settings.bend;

    curlFadeRange.start = settings.fadeAngleStart;
    curlFadeRange.end = settings.fadeAngleEnd;
}

const CURL_DEFS = /* glsl */ `
uniform float uCurlFoldY;
uniform float uCurlRadius;
uniform float uCurlMaxAngle;
uniform float uCurlBend;
`;

const CURL_BODY = /* glsl */ `
#include <begin_vertex>
{
  vec4 curlWorld = modelMatrix * vec4(transformed, 1.0);
  float curlRise = curlWorld.y - uCurlFoldY;

  if (curlRise > 0.0) {
    float curlTheta = min(curlRise / uCurlRadius, uCurlMaxAngle);
    transformed.y += (uCurlFoldY + uCurlRadius * sin(curlTheta) - curlWorld.y) * uCurlBend;
    transformed.z -= uCurlRadius * (1.0 - cos(curlTheta)) * uCurlBend;
  }
}
`;

export function applyCurlShader(shader: WebGLProgramParametersWithUniforms) {
    shader.uniforms.uCurlFoldY = curlUniforms.uCurlFoldY;
    shader.uniforms.uCurlRadius = curlUniforms.uCurlRadius;
    shader.uniforms.uCurlMaxAngle = curlUniforms.uCurlMaxAngle;
    shader.uniforms.uCurlBend = curlUniforms.uCurlBend;

    shader.vertexShader = CURL_DEFS + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        CURL_BODY,
    );
}

const MODEL_CURL_BODY = /* glsl */ `
vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
{
  float curlRise = mvPosition.y - uCurlFoldY;

  if (curlRise > 0.0) {
    float curlTheta = min(curlRise / uCurlRadius, uCurlMaxAngle);
    mvPosition.y += (uCurlFoldY + uCurlRadius * sin(curlTheta) - mvPosition.y) * uCurlBend;
    mvPosition.z -= uCurlRadius * (1.0 - cos(curlTheta)) * uCurlBend;
  }
}
gl_Position = projectionMatrix * mvPosition;
`;

export function applyModelCurlShader(
    shader: WebGLProgramParametersWithUniforms,
) {
    shader.uniforms.uCurlFoldY = modelCurlUniforms.uCurlFoldY;
    shader.uniforms.uCurlRadius = modelCurlUniforms.uCurlRadius;
    shader.uniforms.uCurlMaxAngle = modelCurlUniforms.uCurlMaxAngle;
    shader.uniforms.uCurlBend = modelCurlUniforms.uCurlBend;

    shader.vertexShader = CURL_DEFS + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
        "#include <project_vertex>",
        MODEL_CURL_BODY,
    );
}

export function curlAngle(worldY: number) {
    const rise = worldY - curlUniforms.uCurlFoldY.value;
    if (rise <= 0) return 0;
    return Math.min(
        rise / curlUniforms.uCurlRadius.value,
        curlUniforms.uCurlMaxAngle.value,
    );
}

export function curlOpacity(angle: number) {
    const { start, end } = curlFadeRange;
    if (angle <= start) return 1;
    if (angle >= end) return 0;
    return 1 - (angle - start) / (end - start);
}
