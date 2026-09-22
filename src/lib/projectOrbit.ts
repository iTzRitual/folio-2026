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
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const projectOrbitFragmentShader = `
  uniform sampler2D uMap;
  uniform vec2 uCover;
  uniform float uAspect;
  uniform float uRadius;
  uniform float uBorder;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
    vec2 q = abs(p) - vec2(uAspect, 1.0) * 0.5 + uRadius;
    float edge = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius;
    float aa = fwidth(edge);
    float alpha = 1.0 - smoothstep(-aa, aa, edge);
    if (alpha < 0.01) discard;
    vec2 uv = vUv;
    if (!gl_FrontFacing) uv.x = 1.0 - uv.x;
    vec3 color = texture2D(uMap, (uv - 0.5) * uCover + 0.5).rgb;
    color *= gl_FrontFacing ? 1.0 : 0.65;
    float border = smoothstep(-uBorder - aa, -uBorder + aa, edge);
    gl_FragColor = vec4(mix(color, vec3(0.65), border * 0.7), alpha * uOpacity);
    #include <colorspace_fragment>
  }
`;
