import type { WebGLProgramParametersWithUniforms } from "three";
import { CONFIG } from "@/config/constants";

export const curlUniforms: Record<string, { value: number }> = {
    uCurlFoldY: { value: 0 },
    uCurlBottomY: { value: -1e6 },
    uCurlSheetZ: { value: CONFIG.scene.DETAILS_GROUP_Z },
    uCurlRadius: { value: 1 },
    uCurlMaxAngle: { value: CONFIG.detailsCurl.MAX_ANGLE },
    uCurlBend: { value: 1 },
    uCurlFadeStart: { value: CONFIG.detailsCurl.FADE_ANGLE_START },
    uCurlFadeEnd: { value: CONFIG.detailsCurl.FADE_ANGLE_END },
};

export const curlFadeRange: { start: number; end: number } = {
    start: CONFIG.detailsCurl.FADE_ANGLE_START,
    end: CONFIG.detailsCurl.FADE_ANGLE_END,
};

export interface CurlSettings {
    foldOffsetMult: number;
    bottomOffsetMult: number;
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
    curlUniforms.uCurlBottomY.value =
        -viewportHeight / 2 + viewportHeight * settings.bottomOffsetMult;
    curlUniforms.uCurlMaxAngle.value = settings.maxAngle;
    curlUniforms.uCurlBend.value = settings.bend;
    curlUniforms.uCurlFadeStart.value = settings.fadeAngleStart;
    curlUniforms.uCurlFadeEnd.value = settings.fadeAngleEnd;
    curlFadeRange.start = settings.fadeAngleStart;
    curlFadeRange.end = settings.fadeAngleEnd;
}

const CURL_DEFS = /* glsl */ `
uniform float uCurlFoldY;
uniform float uCurlBottomY;
uniform float uCurlSheetZ;
uniform float uCurlRadius;
uniform float uCurlMaxAngle;
uniform float uCurlBend;
`;

const CURL_BODY = /* glsl */ `
#include <begin_vertex>
{
  vec4 curlWorld = modelMatrix * vec4(transformed, 1.0);
  float curlRise = curlWorld.y - uCurlFoldY;
  float curlDrop = uCurlBottomY - curlWorld.y;
  float curlLift = curlWorld.z - uCurlSheetZ;

  if (curlRise > 0.0) {
    float curlTheta = min(curlRise / uCurlRadius, uCurlMaxAngle);
    float curlArm = uCurlRadius + curlLift;
    transformed.y += (uCurlFoldY + curlArm * sin(curlTheta) - curlWorld.y) * uCurlBend;
    transformed.z += (curlArm * cos(curlTheta) - uCurlRadius - curlLift) * uCurlBend;
  } else if (curlDrop > 0.0) {
    float curlTheta = min(curlDrop / uCurlRadius, uCurlMaxAngle);
    float curlArm = uCurlRadius - curlLift;
    transformed.y += (uCurlBottomY - curlArm * sin(curlTheta) - curlWorld.y) * uCurlBend;
    transformed.z += (uCurlRadius - curlArm * cos(curlTheta) - curlLift) * uCurlBend;
  }
}
`;

export function applyCurlShader(shader: WebGLProgramParametersWithUniforms) {
    shader.uniforms.uCurlFoldY = curlUniforms.uCurlFoldY;
    shader.uniforms.uCurlBottomY = curlUniforms.uCurlBottomY;
    shader.uniforms.uCurlSheetZ = curlUniforms.uCurlSheetZ;
    shader.uniforms.uCurlRadius = curlUniforms.uCurlRadius;
    shader.uniforms.uCurlMaxAngle = curlUniforms.uCurlMaxAngle;
    shader.uniforms.uCurlBend = curlUniforms.uCurlBend;

    shader.vertexShader = CURL_DEFS + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        CURL_BODY,
    );
}

const CURL_FADE_VERTEX_DEFS = /* glsl */ `
uniform float uCurlFadeStart;
uniform float uCurlFadeEnd;
varying float vCurlFade;
`;

const CURL_FADE_VERTEX_BODY = /* glsl */ `
{
  vec4 fadeWorld = modelMatrix * vec4(position, 1.0);
  float fadeRise = max(fadeWorld.y - uCurlFoldY, 0.0);
  float fadeDrop = max(uCurlBottomY - fadeWorld.y, 0.0);
  float fadeAngle = min(
    max(fadeRise, fadeDrop) / uCurlRadius,
    uCurlMaxAngle
  );
  vCurlFade = 1.0 - smoothstep(uCurlFadeStart, uCurlFadeEnd, fadeAngle);
}
`;

const CURL_FADE_FRAGMENT_DEFS = /* glsl */ `
varying float vCurlFade;
`;

const CURL_FADE_FRAGMENT_BODY = /* glsl */ `
diffuseColor.a *= vCurlFade;
#include <opaque_fragment>
`;

export function applyCurlFadeShader(
    shader: WebGLProgramParametersWithUniforms,
) {
    applyCurlShader(shader);

    shader.uniforms.uCurlFadeStart = curlUniforms.uCurlFadeStart;
    shader.uniforms.uCurlFadeEnd = curlUniforms.uCurlFadeEnd;

    shader.vertexShader = CURL_FADE_VERTEX_DEFS + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
        "#include <project_vertex>",
        CURL_FADE_VERTEX_BODY + "#include <project_vertex>",
    );

    shader.fragmentShader = CURL_FADE_FRAGMENT_DEFS + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
        "#include <opaque_fragment>",
        CURL_FADE_FRAGMENT_BODY,
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

export function curlBottomAngle(worldY: number) {
    const drop = curlUniforms.uCurlBottomY.value - worldY;
    if (drop <= 0) return 0;
    return Math.min(
        drop / curlUniforms.uCurlRadius.value,
        curlUniforms.uCurlMaxAngle.value,
    );
}

export function curlRowTransform(worldY: number) {
    const radius = curlUniforms.uCurlRadius.value;
    const topAngle = curlAngle(worldY);
    if (topAngle > 0) {
        return {
            dy: curlUniforms.uCurlFoldY.value + radius * Math.sin(topAngle) - worldY,
            dz: radius * Math.cos(topAngle) - radius,
            angle: topAngle,
        };
    }
    const bottomAngle = curlBottomAngle(worldY);
    if (bottomAngle > 0) {
        return {
            dy:
                curlUniforms.uCurlBottomY.value -
                radius * Math.sin(bottomAngle) -
                worldY,
            dz: radius - radius * Math.cos(bottomAngle),
            angle: bottomAngle,
        };
    }
    return { dy: 0, dz: 0, angle: 0 };
}

export function curlOpacity(angle: number) {
    const { start, end } = curlFadeRange;
    if (angle <= start) return 1;
    if (angle >= end) return 0;
    return 1 - (angle - start) / (end - start);
}
