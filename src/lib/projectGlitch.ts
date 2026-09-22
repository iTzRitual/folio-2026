export const projectGlitchShader = `
float previewHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float projectGlitchSlice(float band, float time, float strength, vec4 params) {
  float tick = floor(time * params.w);
  float gate = step(0.55, previewHash(vec2(band + 13.0, tick)));
  float jitter = previewHash(vec2(band, tick)) * 2.0 - 1.0;
  return jitter * gate * strength * params.y;
}
`;
