import { Float32BufferAttribute, PlaneGeometry } from "three";
import { CONFIG } from "@/config/constants";
import { projectGlitchShader } from "@/lib/projectGlitch";
import { orbitSignalShader } from "@/lib/orbitSignal";

export function createProjectOrbitGeometry(radius: number, cardIndex = 0) {
  const arc = (Math.PI * 2 / CONFIG.projectOrbit.COUNT) * (1 - CONFIG.projectOrbit.GAP);
  const width = radius * arc;
  const bleed = CONFIG.projectPreview.GLITCH_BLEED[0];
  const geometry = new PlaneGeometry(width * (1 + 2 * bleed), width / CONFIG.projectPreview.ASPECT, CONFIG.projectOrbit.SEGMENTS, 1);
  const positions = geometry.attributes.position;
  const uvs = geometry.attributes.uv;
  geometry.setAttribute("glitchTimeOffset", new Float32BufferAttribute(new Float32Array(positions.count).fill(cardIndex * CONFIG.projectOrbit.GLITCH_TIME_OFFSET), 1));
  for (let index = 0; index < positions.count; index++) {
    const angle = positions.getX(index) / radius;
    positions.setXYZ(index, Math.sin(angle) * radius, positions.getY(index), (Math.cos(angle) - 1) * radius);
    uvs.setX(index, uvs.getX(index) * (1 + 2 * bleed) - bleed);
  }
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

export const projectOrbitVertexShader = `
  uniform vec3 uOrbitCenter;
  uniform float uOrbitRadius;
  uniform mat4 uOrbitFrame;
  attribute float glitchTimeOffset;
  varying float vGlitchTimeOffset;
  varying vec2 vUv;
  varying float vOrbitDepth;
  varying vec3 vOrbitPosition;
  varying vec4 vClipPosition;
  varying float vViewDepth;
  void main() {
    vUv = uv;
    vGlitchTimeOffset = glitchTimeOffset;
    vOrbitPosition = (uOrbitFrame * modelMatrix * vec4(position, 1.0)).xyz;
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    float centerDepth = (viewMatrix * vec4(uOrbitCenter, 1.0)).z;
    vOrbitDepth = 0.5 + (centerDepth - viewPosition.z) / max(2.0 * uOrbitRadius, 0.0001);
    gl_Position = projectionMatrix * viewPosition;
    vClipPosition = gl_Position;
    vViewDepth = -viewPosition.z;
  }
`;

export const projectOrbitFragmentShader = `
  uniform sampler2D uMap;
  uniform bool uVideo;
  uniform vec2 uCover;
  uniform float uAspect;
  uniform float uRadius;
  uniform float uBorder;
  uniform float uOpacity;
  uniform float uFarBrightness;
  uniform float uReveal;
  uniform float uTime;
  uniform float uGlitch;
  uniform vec4 uGlitchParams;
  uniform float uHologramOpacity;
  uniform float uHologramTint;
  uniform vec3 uScan;
  varying float vGlitchTimeOffset;
  varying vec2 vUv;
  varying float vOrbitDepth;
  varying vec3 vOrbitPosition;
  ${projectGlitchShader}
  ${orbitSignalShader}
  float orbitEdge(vec2 uv) {
    vec2 p = (uv - 0.5) * vec2(uAspect, 1.0);
    vec2 q = abs(p) - vec2(uAspect, 1.0) * 0.5 + uRadius;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius;
  }
  void main() {
    if (uReveal <= 0.0) discard;
    if (uReveal < 1.0) {
      float angle = atan(vOrbitPosition.x, vOrbitPosition.z);
      float travel = mod(${(Math.sign(CONFIG.projectOrbit.SPEED) || -1).toFixed(1)} * (angle - ${CONFIG.projectOrbit.ENTRANCE_ORIGIN}) + ${Math.PI * 2}, ${Math.PI * 2});
      if (travel > uReveal * ${Math.PI * 2}) discard;
    }
    vec2 derivatives = fwidth(vUv) * vec2(uAspect, 1.0);
    float aa = max(derivatives.x, derivatives.y);
    float band = floor(clamp(vUv.y, 0.0, 0.999) * uGlitchParams.x);
    vec3 signal = orbitSignal();
    float glitchTime = uTime + vGlitchTimeOffset;
    float slice = projectGlitchSlice(band, glitchTime, uGlitch, uGlitchParams) + signal.x;
    vec2 uv = vUv - vec2(slice, 0.0);
    vec2 offset = vec2(uGlitch * uGlitchParams.z + signal.z, 0.0);
    vec2 redUv = uv + offset;
    vec2 blueUv = uv - offset;
    vec3 edges = vec3(orbitEdge(redUv), orbitEdge(uv), orbitEdge(blueUv));
    vec3 mask = 1.0 - smoothstep(vec3(-aa), vec3(aa), edges);
    float cover = max(mask.r, max(mask.g, mask.b));
    if (cover < 0.01) discard;
    vec3 color = vec3(
      texture2D(uMap, (redUv - 0.5) * uCover + 0.5).r,
      texture2D(uMap, (uv - 0.5) * uCover + 0.5).g,
      texture2D(uMap, (blueUv - 0.5) * uCover + 0.5).b
    );
    if (uVideo) color = sRGBTransferEOTF(vec4(color, 1.0)).rgb;
    float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
    float interference = 0.5 + 0.5 * sin(vUv.y * 6.283185 + vOrbitDepth * 4.0);
    vec3 tint = mix(vec3(0.25, 0.85, 1.0), vec3(0.75, 0.5, 1.0), interference);
    color = mix(color, tint * luminance, uHologramTint);
    float scanPosition = (vUv.y - uTime * uScan.z) * uScan.x;
    float scanVisibility = 1.0 - smoothstep(0.25, 0.5, fwidth(scanPosition));
    float scan = 1.0 - uScan.y * scanVisibility * (0.5 + 0.5 * sin(scanPosition * 6.283185));
    vec3 borders = smoothstep(vec3(-uBorder - aa), vec3(-uBorder + aa), edges);
    float border = max(borders.r * mask.r, max(borders.g * mask.g, borders.b * mask.b));
    float alpha = dot(mask, vec3(1.0 / 3.0)) * (1.0 - signal.y * (1.0 - border));
    float brightness = mix(1.0, uFarBrightness, smoothstep(0.0, 1.0, vOrbitDepth));
    float transmission = mix(0.65, 1.0, luminance) * uHologramOpacity * scan;
    transmission = mix(transmission, uHologramOpacity, border);
    color = mix(color, tint, borders * 0.7) * mask / cover;
    gl_FragColor = vec4(color * brightness, alpha * uOpacity * transmission);
    #include <colorspace_fragment>
  }
`;
