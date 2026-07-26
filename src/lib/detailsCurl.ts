import type { WebGLProgramParametersWithUniforms } from "three";
import { CONFIG } from "@/config/constants";

export const curlUniforms: Record<string, { value: number }> = {
    uCurlFoldY: { value: 0 },
    uCurlRadius: { value: 1 },
    uCurlMaxAngle: { value: CONFIG.detailsCurl.MAX_ANGLE },
};

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
}

export function applyCurlSettings(
    viewportHeight: number,
    titleSettledBottomY: number,
    settings: CurlSettings,
) {
    curlUniforms.uCurlFoldY.value =
        titleSettledBottomY + viewportHeight * settings.foldOffsetMult;
    curlUniforms.uCurlRadius.value = Math.max(
        viewportHeight * settings.radiusMult,
        0.0001,
    );
    curlUniforms.uCurlMaxAngle.value = settings.maxAngle;
    curlFadeRange.start = settings.fadeAngleStart;
    curlFadeRange.end = settings.fadeAngleEnd;
}

const CURL_DEFS = /* glsl */ `
uniform float uCurlFoldY;
uniform float uCurlRadius;
uniform float uCurlMaxAngle;
`;

const CURL_BODY = /* glsl */ `
#include <begin_vertex>
{
  vec4 curlWorld = modelMatrix * vec4(transformed, 1.0);
  float curlRise = curlWorld.y - uCurlFoldY;

  if (curlRise > 0.0) {
    float curlTheta = min(curlRise / uCurlRadius, uCurlMaxAngle);
    transformed.y += uCurlFoldY + uCurlRadius * sin(curlTheta) - curlWorld.y;
    transformed.z -= uCurlRadius * (1.0 - cos(curlTheta));
  }
}
`;

export function applyCurlShader(shader: WebGLProgramParametersWithUniforms) {
    shader.uniforms.uCurlFoldY = curlUniforms.uCurlFoldY;
    shader.uniforms.uCurlRadius = curlUniforms.uCurlRadius;
    shader.uniforms.uCurlMaxAngle = curlUniforms.uCurlMaxAngle;

    shader.vertexShader = CURL_DEFS + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        CURL_BODY,
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
