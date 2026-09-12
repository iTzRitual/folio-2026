export const buildCustomAberrationProgram = (taps: number) => `
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

vec4 inputSample(vec2 uv);

vec4 applyCustomAberration(vec2 uv) {
    if (u_aberrationIntensity < 0.001 && abs(u_scrollVelocity) < 0.001) {
        return inputSample(uv);
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
        return vec4(
            inputSample(newUv + rgbOffset).r,
            inputSample(newUv).g,
            inputSample(newUv - rgbOffset).b,
            1.0
        );
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

        accum.r += inputSample(tapUv + rgbOffset + scrollSplit).r;
        accum.g += inputSample(tapUv).g;
        accum.b += inputSample(tapUv - rgbOffset - scrollSplit).b;
    }

    return vec4(accum / float(SCROLL_TAPS), 1.0);
}
`;
