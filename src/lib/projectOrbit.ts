import { PlaneGeometry } from "three";
import { CONFIG } from "@/config/constants";

export function createProjectOrbitGeometry(radius: number) {
  const arc = (Math.PI * 2 / CONFIG.projectOrbit.COUNT) * (1 - CONFIG.projectOrbit.GAP);
  const width = radius * arc;
  const geometry = new PlaneGeometry(width, width / CONFIG.projectPreview.ASPECT, CONFIG.projectOrbit.SEGMENTS, 1);
  const positions = geometry.attributes.position;
  for (let index = 0; index < positions.count; index++) {
    const angle = positions.getX(index) / radius;
    positions.setXYZ(index, Math.sin(angle) * radius, positions.getY(index), (Math.cos(angle) - 1) * radius);
  }
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

export const projectOrbitVertexShader = `
  uniform vec3 uOrbitCenter;
  uniform float uOrbitRadius;
  varying vec2 vUv;
  varying float vOrbitDepth;
  void main() {
    vUv = uv;
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    float centerDepth = (viewMatrix * vec4(uOrbitCenter, 1.0)).z;
    vOrbitDepth = 0.5 + (centerDepth - viewPosition.z) / max(2.0 * uOrbitRadius, 0.0001);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

export const projectOrbitFragmentShader = `
  uniform sampler2D uMap;
  uniform vec2 uCover;
  uniform float uAspect;
  uniform float uRadius;
  uniform float uBorder;
  uniform float uOpacity;
  uniform float uFarBrightness;
  varying vec2 vUv;
  varying float vOrbitDepth;
  void main() {
    vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
    vec2 q = abs(p) - vec2(uAspect, 1.0) * 0.5 + uRadius;
    float edge = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius;
    float aa = fwidth(edge);
    float alpha = 1.0 - smoothstep(-aa, aa, edge);
    if (alpha < 0.01) discard;
    vec3 color = texture2D(uMap, (vUv - 0.5) * uCover + 0.5).rgb;
    float border = smoothstep(-uBorder - aa, -uBorder + aa, edge);
    float brightness = mix(1.0, uFarBrightness, smoothstep(0.0, 1.0, vOrbitDepth));
    gl_FragColor = vec4(mix(color, vec3(0.65), border * 0.7) * brightness, alpha * uOpacity);
    #include <colorspace_fragment>
  }
`;
