import type { WebGLProgramParametersWithUniforms } from "three";
import { CONFIG } from "@/config/constants";

export const curlUniforms: Record<string, { value: number }> = {
    uCurlFoldY: { value: 0 },
    uCurlBottomY: { value: -1e6 },
    uCurlSheetZ: { value: CONFIG.scene.DETAILS_GROUP_Z },
    uCurlRadius: { value: 1 },
    uCurlMaxAngle: { value: CONFIG.detailsCurl.MAX_ANGLE },
    uCurlBend: { value: 1 },
    uCurlFadeStart: { value: 0 },
    uCurlFadeEndRise: { value: 1 },
    uCurlFadeEndDrop: { value: 1 },
    uCurlShadeStrength: { value: CONFIG.detailsCurl.SHADE_STRENGTH },
    uCurlShadeSpan: { value: CONFIG.detailsCurl.SHADE_SPAN_MULT },
    uCurlShadeMode: { value: CONFIG.detailsCurl.SHADE_MODE },
};

const curlFadeSpans = { start: 0, endRise: 1, endDrop: 1 };

export interface CurlSettings {
    foldOffsetMult: number;
    bottomOffsetMult: number;
    radiusMult: number;
    maxAngle: number;
    fadeAngleStart: number;
    fadeAngleEnd: number;
    shadeStrength: number;
    shadeSpanMult: number;
    shadeMode: number;
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
    const maxDescent = radius * Math.sin(Math.min(settings.maxAngle, Math.PI / 2));
    curlUniforms.uCurlBottomY.value =
        -viewportHeight / 2 +
        maxDescent +
        viewportHeight * settings.bottomOffsetMult;
    curlUniforms.uCurlMaxAngle.value = settings.maxAngle;
    curlUniforms.uCurlBend.value = settings.bend;
    curlUniforms.uCurlShadeStrength.value = settings.shadeStrength;
    curlUniforms.uCurlShadeSpan.value = settings.shadeSpanMult;
    curlUniforms.uCurlShadeMode.value = settings.shadeMode;

    const fadeStart = settings.fadeAngleStart * radius;
    const fadeEndRise = Math.max(settings.fadeAngleEnd * radius, fadeStart + 1e-4);
    const fadeEndDrop = Math.max(settings.maxAngle * radius, fadeStart + 1e-4);

    curlUniforms.uCurlFadeStart.value = fadeStart;
    curlUniforms.uCurlFadeEndRise.value = fadeEndRise;
    curlUniforms.uCurlFadeEndDrop.value = fadeEndDrop;
    curlFadeSpans.start = fadeStart;
    curlFadeSpans.endRise = fadeEndRise;
    curlFadeSpans.endDrop = fadeEndDrop;
}

const CURL_DEFS = /* glsl */ `
uniform float uCurlFoldY;
uniform float uCurlBottomY;
uniform float uCurlSheetZ;
uniform float uCurlRadius;
uniform float uCurlMaxAngle;
uniform float uCurlBend;
uniform float uCurlFadeStart;
uniform float uCurlFadeEndRise;
uniform float uCurlFadeEndDrop;
uniform float uCurlShadeStrength;
uniform float uCurlShadeSpan;
uniform float uCurlShadeMode;
varying float vCurlShade;
varying float vCurlFade;
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

  float curlPast = max(curlRise, curlDrop);
  float curlFadeEnd =
    curlRise > 0.0 ? uCurlFadeEndRise : uCurlFadeEndDrop;
  vCurlFade = 1.0 - smoothstep(uCurlFadeStart, curlFadeEnd, curlPast);

  float curlShadeT = clamp(
    curlPast / max(curlFadeEnd * uCurlShadeSpan, 1e-5),
    0.0,
    1.0
  );
  float curlShadeCurve = uCurlShadeMode < 0.5
    ? curlShadeT
    : (uCurlShadeMode < 1.5
        ? sin(curlShadeT * 1.5707963)
        : curlShadeT * curlShadeT * curlShadeT);
  vCurlShade = 1.0 - uCurlShadeStrength * curlShadeCurve;
}
`;

export function applyCurlShader(shader: WebGLProgramParametersWithUniforms) {
    shader.uniforms.uCurlFoldY = curlUniforms.uCurlFoldY;
    shader.uniforms.uCurlBottomY = curlUniforms.uCurlBottomY;
    shader.uniforms.uCurlSheetZ = curlUniforms.uCurlSheetZ;
    shader.uniforms.uCurlRadius = curlUniforms.uCurlRadius;
    shader.uniforms.uCurlMaxAngle = curlUniforms.uCurlMaxAngle;
    shader.uniforms.uCurlBend = curlUniforms.uCurlBend;
    shader.uniforms.uCurlFadeStart = curlUniforms.uCurlFadeStart;
    shader.uniforms.uCurlFadeEndRise = curlUniforms.uCurlFadeEndRise;
    shader.uniforms.uCurlFadeEndDrop = curlUniforms.uCurlFadeEndDrop;
    shader.uniforms.uCurlShadeStrength = curlUniforms.uCurlShadeStrength;
    shader.uniforms.uCurlShadeSpan = curlUniforms.uCurlShadeSpan;
    shader.uniforms.uCurlShadeMode = curlUniforms.uCurlShadeMode;
    shader.uniforms.uCurlFadePower = { value: 1 };

    shader.vertexShader = CURL_DEFS + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        CURL_BODY,
    );

    shader.fragmentShader = CURL_SHADE_FRAGMENT_DEFS + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
        "#include <opaque_fragment>",
        CURL_SHADE_FRAGMENT_BODY,
    );
}

const CURL_SHADE_FRAGMENT_DEFS = /* glsl */ `
uniform float uCurlFadePower;
varying float vCurlShade;
varying float vCurlFade;
`;

const CURL_SHADE_FRAGMENT_BODY = /* glsl */ `
diffuseColor.rgb *= vCurlShade;
diffuseColor.a *= pow(max(vCurlFade, 0.0), uCurlFadePower);
#include <opaque_fragment>
`;

export function curlFadePowerShader(power: number) {
    return (shader: WebGLProgramParametersWithUniforms) => {
        applyCurlShader(shader);
        shader.uniforms.uCurlFadePower.value = power;
    };
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

function fadeOverSpan(distance: number, end: number) {
    const { start } = curlFadeSpans;
    if (distance <= start) return 1;
    if (distance >= end) return 0;
    return 1 - (distance - start) / (end - start);
}

export function curlRiseOpacity(worldY: number) {
    const rise = worldY - curlUniforms.uCurlFoldY.value;
    if (rise <= 0) return 1;
    return fadeOverSpan(rise, curlFadeSpans.endRise);
}

export function curlDropOpacity(worldY: number) {
    const drop = curlUniforms.uCurlBottomY.value - worldY;
    if (drop <= 0) return 1;
    return fadeOverSpan(drop, curlFadeSpans.endDrop);
}
