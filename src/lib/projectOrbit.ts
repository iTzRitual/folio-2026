import { Float32BufferAttribute, PlaneGeometry } from "three";
import { CONFIG } from "@/config/constants";
import { projectGlitchShader } from "@/lib/projectGlitch";

export const PROJECT_ORBIT_ASPECT = CONFIG.projectPreview.ASPECT;

export function projectOrbitLayout({ count = CONFIG.projectOrbit.COUNT, gap = CONFIG.projectOrbit.GAP, cardScale = 1 }: { count?: number; gap?: number; cardScale?: number } = {}) {
  const pitch = Math.PI * 2 / count;
  const arc = pitch * (1 - gap) * cardScale;
  return { count, pitch, arc, height: arc / PROJECT_ORBIT_ASPECT };
}

export function createProjectOrbitGeometry(radius: number, layout = projectOrbitLayout(), cardIndex = 0) {
  const { arc } = layout;
  const width = radius * arc;
  const bleed = CONFIG.projectOrbit.HOLOGRAM_BLEED;
  const geometry = new PlaneGeometry(width * (1 + 2 * bleed), width / PROJECT_ORBIT_ASPECT * (1 + 2 * bleed), CONFIG.projectOrbit.SEGMENTS, 1);
  const positions = geometry.attributes.position;
  const uvs = geometry.attributes.uv;
  geometry.setAttribute("cardIndex", new Float32BufferAttribute(new Float32Array(positions.count).fill(cardIndex), 1));
  for (let index = 0; index < positions.count; index++) {
    const angle = positions.getX(index) / radius;
    positions.setXYZ(index, Math.sin(angle) * radius, positions.getY(index), (Math.cos(angle) - 1) * radius);
    uvs.setXY(index, uvs.getX(index) * (1 + 2 * bleed) - bleed, uvs.getY(index) * (1 + 2 * bleed) - bleed);
  }
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

export const projectOrbitVertexShader = `
  uniform vec3 uOrbitCenter;
  uniform float uOrbitRadius;
  uniform mat4 uOrbitFrame;
  uniform vec4 uSkullBounds;
  uniform float uSkullDepth;
  uniform vec2 uCardSize;
  uniform float uFadeReach;
  attribute float cardIndex;
  varying float vCardIndex;
  varying vec2 vUv;
  varying float vOrbitDepth;
  varying vec3 vOrbitPosition;
  varying float vSkullOverlap;
  varying float vSurfaceFacing;
  void main() {
    vUv = uv;
    vCardIndex = cardIndex;
    vOrbitPosition = (uOrbitFrame * modelMatrix * vec4(position, 1.0)).xyz;
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    float centerDepth = (viewMatrix * vec4(uOrbitCenter, 1.0)).z;
    vOrbitDepth = 0.5 + (centerDepth - viewPosition.z) / max(2.0 * uOrbitRadius, 0.0001);
    vec4 cardView = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    vec4 cardClip = projectionMatrix * cardView;
    vec4 edgeX = projectionMatrix * modelViewMatrix * vec4(uCardSize.x * 0.5, 0.0, 0.0, 1.0);
    vec4 edgeY = projectionMatrix * modelViewMatrix * vec4(0.0, uCardSize.y * 0.5, 0.0, 1.0);
    vec2 center = cardClip.xy / cardClip.w;
    vec2 extent = abs(edgeX.xy / edgeX.w - center) + abs(edgeY.xy / edgeY.w - center);
    vec2 reach = max(uSkullBounds.zw + extent * 0.5, vec2(0.0001));
    float distance = length((center - uSkullBounds.xy) / reach);
    float overlap = 1.0 - smoothstep(${CONFIG.projectOrbit.HOLOGRAM_FADE_START}, uFadeReach, distance);
    float front = smoothstep(0.0, max(uOrbitRadius * ${CONFIG.projectOrbit.HOLOGRAM_DEPTH_FADE}, 0.0001), uSkullDepth + cardView.z);
    vSkullOverlap = overlap * front;
    vSurfaceFacing = abs(dot(normalize(normalMatrix * normal), normalize(-viewPosition.xyz)));
    gl_Position = projectionMatrix * viewPosition;
  }
`;

export const projectOrbitFragmentShader = `
  uniform sampler2D uMap;
  uniform bool uVideo;
  uniform sampler2D uHudMap;
  uniform float uHudStyle;
  uniform float uHudDetail;
  varying float vCardIndex;
  uniform vec2 uCover;
  uniform float uAspect;
  uniform float uRadius;
  uniform float uBorder;
  uniform float uOpacity;
  uniform float uFarBrightness;
  uniform float uReveal;
  uniform float uTime;
  uniform float uGlitch;
  uniform float uGlitchMediaOnly;
  uniform vec4 uGlitchParams;
  uniform float uContentOpacity;
  uniform float uFrontOpacity;
  uniform float uGlow;
  uniform float uHologramTint;
  uniform vec3 uScan;
  varying vec2 vUv;
  varying float vOrbitDepth;
  varying vec3 vOrbitPosition;
  varying float vSkullOverlap;
  varying float vSurfaceFacing;
  ${projectGlitchShader}
  float orbitEdge(vec2 uv) {
    vec2 p = (uv - 0.5) * vec2(uAspect, 1.0);
    vec2 q = abs(p) - vec2(uAspect, 1.0) * 0.5 + uRadius;
    float rounded = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius;
    vec2 bounds = abs(p) - vec2(uAspect, 1.0) * 0.5;
    float bevel = (abs(p.x + p.y) - (uAspect * 0.5 + 0.5 - ${CONFIG.projectOrbit.HUD.CORNER_CUT})) * 0.70710678;
    return mix(rounded, max(max(bounds.x, bounds.y), bevel), uHudStyle);
  }
  vec4 shadeOrbitCard(vec2 uv, vec2 mediaPosition, float aa) {
    float edge = orbitEdge(uv);
    float face = 1.0 - smoothstep(-aa, aa, edge);
    float border = face * smoothstep(-uBorder - aa, -uBorder + aa, edge);
    float glow = exp(-abs(edge + uBorder * 0.5) / ${CONFIG.projectOrbit.HOLOGRAM_GLOW_WIDTH}) * uGlow * smoothstep(${CONFIG.projectOrbit.HOLOGRAM_GRAZING_START}, ${CONFIG.projectOrbit.HOLOGRAM_GRAZING_END}, vSurfaceFacing) * (1.0 - smoothstep(${CONFIG.projectOrbit.HOLOGRAM_GLOW_FADE_START}, ${CONFIG.projectOrbit.HOLOGRAM_GLOW_FADE_END}, max(edge, 0.0)));
    float mediaScale = mix(1.0, ${CONFIG.projectOrbit.HUD.MEDIA_SCALE}, uHudStyle);
    vec2 mediaUv = (mediaPosition - 0.5) / mediaScale * uCover + 0.5;
    vec2 mediaWindow = (uv - 0.5) / mediaScale * uCover + 0.5;
    float mediaMask = step(0.0, mediaUv.x) * step(mediaUv.x, 1.0) * step(0.0, mediaUv.y) * step(mediaUv.y, 1.0);
    mediaMask *= step(0.0, mediaWindow.x) * step(mediaWindow.x, 1.0) * step(0.0, mediaWindow.y) * step(mediaWindow.y, 1.0);
    vec3 color = texture2D(uMap, clamp(mediaUv, 0.0, 1.0)).rgb;
    if (uVideo) color = sRGBTransferEOTF(vec4(color, 1.0)).rgb;
    float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
    float iridescence = 0.5 + 0.5 * sin(uv.y * 6.283185 + vOrbitDepth * 4.0);
    vec3 tint = mix(vec3(0.38, 0.9, 1.0), vec3(0.8, 0.65, 1.0), iridescence);
    color = mix(color, tint * luminance, uHologramTint);
    float scanPosition = (uv.y - uTime * uScan.z) * uScan.x;
    float scanVisibility = 1.0 - smoothstep(0.25, 0.5, fwidth(scanPosition));
    float scan = 1.0 - uScan.y * scanVisibility * (0.5 + 0.5 * sin(scanPosition * 6.283185));
    float brightness = mix(1.0, uFarBrightness, smoothstep(0.0, 1.0, vOrbitDepth));
    brightness *= mix(1.0, ${CONFIG.projectOrbit.HUD.VIDEO_BRIGHTNESS}, uHudStyle);
    float contentOpacity = mix(uContentOpacity, uFrontOpacity, vSkullOverlap);
    float contentAlpha = face * mediaMask * contentOpacity;
    vec2 atlasSize = vec2(${CONFIG.projectOrbit.HUD.ATLAS_COLUMNS.toFixed(1)}, ${CONFIG.projectOrbit.HUD.ATLAS_ROWS.toFixed(1)});
    vec2 atlasCell = vec2(mod(vCardIndex, atlasSize.x), atlasSize.y - 1.0 - floor(vCardIndex / atlasSize.x));
    vec4 hud = texture2D(uHudMap, (atlasCell + clamp(uv, 0.001, 0.999)) / atlasSize);
    hud.a *= face * uHudStyle * uHudDetail * smoothstep(0.06, 0.3, vSurfaceFacing);
    glow *= mix(1.0, ${CONFIG.projectOrbit.HUD.GLOW_SCALE}, uHudStyle);
    float frameAlpha = border + (1.0 - border) * glow;
    float alpha = frameAlpha + contentAlpha * (1.0 - frameAlpha);
    vec3 frameColor = mix(tint, vec3(1.0), border * 0.35);
    frameColor = mix(frameColor, vec3(${CONFIG.projectOrbit.HUD.PRIMARY_LINEAR.join(", ")}), uHudStyle);
    float panelAlpha = face * uHudStyle * ${CONFIG.projectOrbit.HUD.PANEL_OPACITY} * contentOpacity;
    vec3 body = color * brightness * scan * contentAlpha;
    float bodyAlpha = contentAlpha + panelAlpha * (1.0 - contentAlpha);
    body += vec3(0.015, 0.02, 0.028) * panelAlpha * (1.0 - contentAlpha);
    body = hud.rgb * hud.a + body * (1.0 - hud.a);
    bodyAlpha = hud.a + bodyAlpha * (1.0 - hud.a);
    alpha = frameAlpha + bodyAlpha * (1.0 - frameAlpha);
    vec3 premultiplied = frameColor * frameAlpha + body * (1.0 - frameAlpha);
    return vec4(premultiplied, alpha);
  }
  void main() {
    if (uReveal <= 0.0) discard;
    if (uReveal < 1.0) {
      float angle = atan(vOrbitPosition.x, vOrbitPosition.z);
      float travel = mod(${(Math.sign(CONFIG.projectOrbit.SPEED) || -1).toFixed(1)} * (angle - ${CONFIG.projectOrbit.ENTRANCE_ORIGIN}) + ${Math.PI * 2}, ${Math.PI * 2});
      if (travel > uReveal * ${Math.PI * 2}) discard;
    }
    vec2 derivatives = fwidth(vUv) * vec2(uAspect, 1.0);
    float aa = min(max(derivatives.x, derivatives.y), uBorder * 0.5);
    float band = floor(clamp(vUv.y, 0.0, 0.999) * uGlitchParams.x);
    float time = uTime + vCardIndex * ${CONFIG.projectOrbit.GLITCH_TIME_OFFSET};
    float slice = projectGlitchSlice(band, time, uGlitch, uGlitchParams);
    vec2 uv = vUv - vec2(slice, 0.0);
    vec4 card = shadeOrbitCard(mix(uv, vUv, uGlitchMediaOnly), uv, aa);
    if (uGlitch > 0.0) {
      vec2 split = vec2(uGlitch * uGlitchParams.z, 0.0);
      vec4 red = shadeOrbitCard(mix(uv + split, vUv, uGlitchMediaOnly), uv + split, aa);
      vec4 blue = shadeOrbitCard(mix(uv - split, vUv, uGlitchMediaOnly), uv - split, aa);
      card = vec4(red.r, card.g, blue.b, max(red.a, max(card.a, blue.a)));
    }
    if (card.a < 0.001) discard;
    gl_FragColor = vec4(card.rgb / card.a, card.a * uOpacity);
    #include <colorspace_fragment>
  }
`;
