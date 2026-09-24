export const orbitSignalShader = `
  uniform vec4 uSignalPattern;
  uniform vec4 uSignalDamage;
  uniform float uSignalTime;
  uniform float uSignalMode;
  uniform float uSignalAnimated;
  uniform sampler2D uSkullMask;
  uniform vec2 uSignalSurface;
  varying vec4 vClipPosition;
  varying float vViewDepth;

  float signalHash(vec3 p) {
    p = fract(p * 0.1031 + uSignalPattern.x);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }

  float signalNoise(vec3 p) {
    vec3 cell = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(signalHash(cell), signalHash(cell + vec3(1, 0, 0)), f.x),
          mix(signalHash(cell + vec3(0, 1, 0)), signalHash(cell + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(signalHash(cell + vec3(0, 0, 1)), signalHash(cell + vec3(1, 0, 1)), f.x),
          mix(signalHash(cell + vec3(0, 1, 1)), signalHash(cell + vec3(1, 1, 1)), f.x), f.y), f.z);
  }

  vec3 orbitSignal() {
    vec2 screen = vClipPosition.xy / vClipPosition.w;
    vec4 skull = texture2D(uSkullMask, screen * 0.5 + 0.5);
    float overlap = skull.a * step(vViewDepth + 0.002, skull.r);
    if (overlap < 0.001) return vec3(0.0);
    if (uSignalAnimated < 0.5) return vec3(0.0, overlap * uSignalDamage.x * 0.2, 0.0);

    vec2 p = vec2(atan(vOrbitPosition.x, vOrbitPosition.z) * uSignalSurface.x, vOrbitPosition.y)
      / max(uSignalSurface.y, 0.001);
    float t = uSignalTime;
    float swell = signalNoise(vec3(t * 0.37, 8.1, 3.4));
    float burst = smoothstep(0.57, 0.78, swell) * uSignalDamage.z;
    float scale = 1.0 / uSignalPattern.w;
    float rowPosition = p.y * 20.0 * scale;
    float row = floor(rowPosition);
    float lane = signalHash(vec3(row, 2.7, 1.0));
    float rhythm = t * (0.7 + lane * 1.6) + lane * 8.0;
    float tick = floor(rhythm);
    float phase = fract(rhythm);
    float travel = t * uSignalPattern.y * (lane - 0.5) * 0.35;
    float cell = floor(p.x * scale / (0.4 + lane * 1.5) - travel);
    float packet = signalHash(vec3(cell, row, tick));
    float gate = step(0.65 - uSignalPattern.z * 0.35 - burst * 0.12, packet);
    float attack = uSignalMode < 1.5 ? (uSignalMode < 0.5 ? 0.12 : 0.04) : 0.26;
    float envelope = smoothstep(0.0, attack, phase)
      * (1.0 - smoothstep(0.38 + lane * 0.2, 0.7 + lane * 0.2, phase));
    float slit = smoothstep(0.02, 0.12, fract(rowPosition))
      * (1.0 - smoothstep(0.82, 0.98, fract(rowPosition)));
    float damage = gate * envelope * slit;
    float jitter = signalHash(vec3(row, tick, 17.3)) - 0.5;
    float opening = damage * (0.35 + 0.55 * uSignalDamage.x);
    float tear = jitter * damage * uSignalDamage.y * 0.08;
    float fringe = damage * burst * uSignalDamage.w * 0.012;
    return vec3(tear, opening, fringe) * overlap;
  }
`;
