"use client";

import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { CONFIG } from "@/config/constants";
import { useHeroLayout } from "@/context/HeroLayoutContext";
import { useHeroTransition } from "@/context/HeroTransitionContext";
import { useDebugSettings } from "@/context/DebugSettingsContext";
import type { DebugSettings } from "@/context/DebugSettingsContext";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { caseStudyStage } from "@/lib/caseStudyStage";
import { useSceneCapabilities } from "@/context/SceneCapabilitiesContext";
import { useTheme } from "@/context/ThemeContext";
import { buildCustomAberrationProgram } from "./Effects/CustomAberrationEffect";
import { HEADER_LAYER } from "./Effects/HeaderExclusionEffect";
import { THEME_SWEEP_LAYER } from "./ThemeSweep";

type Phase2Tuning = DebugSettings["phase2"];

function createPlaneGeometry(width: number, height: number): THREE.PlaneGeometry {
  return new THREE.PlaneGeometry(
    width,
    height,
    CONFIG.phase2.PLANE_SEGMENTS_X,
    CONFIG.phase2.PLANE_SEGMENTS_Y,
  );
}

function updatePlaneCurve(
  geometry: THREE.PlaneGeometry,
  width: number,
  height: number,
  curveDepth: number,
) {
  const positions = geometry.attributes.position;

  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index) / (width / 2);
    const y = positions.getY(index) / (height / 2);
    positions.setZ(index, curveDepth * (1 - x * x) * (1 - y * y));
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
}

function getTextureDimensions(sourceWidth: number, sourceHeight: number) {
  const rawWidth = Math.max(
    sourceWidth,
    sourceHeight * CONFIG.phase2.PLANE_ASPECT,
  );
  const scale = Math.min(
    1,
    CONFIG.phase2.TEXTURE_MAX_DIMENSION / rawWidth,
  );
  const width = Math.round(rawWidth * scale);

  return {
    width,
    height: Math.round(width / CONFIG.phase2.PLANE_ASPECT),
  };
}

function getDockLayout(
  textureWidth: number,
  textureHeight: number,
  tuning: Phase2Tuning,
) {
  const screenMargin =
    Math.min(textureWidth, textureHeight) *
    CONFIG.phase2.BROWSER_SAFE_MARGIN_MULT;
  const screenUnit = Math.min(textureWidth, textureHeight);
  const height =
    Math.min(textureWidth, textureHeight) *
    CONFIG.phase2.DOCK_HEIGHT_MULT *
    tuning.dockScale;
  const itemGap = height * CONFIG.phase2.DOCK_ITEM_GAP_MULT;
  const horizontalPadding = height * 0.16;
  const itemSize = height - horizontalPadding * 2;
  const itemsWidth =
    itemSize * CONFIG.phase2.DOCK_ITEM_COUNT +
    itemGap * (CONFIG.phase2.DOCK_ITEM_COUNT - 1);
  const width = itemsWidth + horizontalPadding * 2;
  const x = (textureWidth - width) / 2 + tuning.dockOffsetX * screenUnit;
  const y =
    textureHeight -
    screenMargin -
    height +
    tuning.dockOffsetY * screenUnit;

  return {
    x,
    y,
    width,
    height,
    itemGap,
    itemSize,
    centerX: x + width / 2,
    itemX: x + horizontalPadding,
    itemY: y + (height - itemSize) / 2,
    safeTop: y - tuning.safariBottomSafeArea * screenUnit,
  };
}

function getBrowserLayout(
  textureWidth: number,
  textureHeight: number,
  sourceWidth: number,
  sourceHeight: number,
  tuning: Phase2Tuning,
) {
  const margin =
    Math.min(textureWidth, textureHeight) *
    CONFIG.phase2.BROWSER_SAFE_MARGIN_MULT;
  const dock = getDockLayout(textureWidth, textureHeight, tuning);
  const availableWidth = textureWidth - margin * 2;
  const availableHeight = dock.safeTop - margin;
  const browserAspect =
    sourceWidth /
    (sourceHeight *
      (1 +
        CONFIG.phase2.BROWSER_CHROME_HEIGHT_MULT *
          tuning.safariChromeScale));
  let width = availableWidth;
  let height = width / browserAspect;

  if (height > availableHeight) {
    height = availableHeight;
    width = height * browserAspect;
  }

  const x = (textureWidth - width) / 2;
  const y = margin + (availableHeight - height) / 2;
  const contentHeight =
    height /
    (1 +
      CONFIG.phase2.BROWSER_CHROME_HEIGHT_MULT * tuning.safariChromeScale);

  return {
    x,
    y,
    width,
    height,
    contentHeight,
    chromeHeight: height - contentHeight,
  };
}

function drawDock(
  context: CanvasRenderingContext2D,
  layout: ReturnType<typeof getDockLayout>,
  magnification = 0,
  pointerX: number | null = null,
) {
  const { y, height, itemGap, itemSize, centerX } = layout;
  const radius = height * 0.27;
  const magnificationRadius =
    itemSize * CONFIG.phase2.DOCK_MAGNIFICATION_RADIUS_MULT;
  const activeIndex =
    pointerX === null
      ? -1
      : Array.from({ length: CONFIG.phase2.DOCK_ITEM_COUNT }).findIndex(
          (_, index) => {
            const itemX = layout.itemX + index * (itemSize + itemGap);
            return pointerX >= itemX && pointerX <= itemX + itemSize;
          },
        );
  const scales = Array.from(
    { length: CONFIG.phase2.DOCK_ITEM_COUNT },
    (_, index) => {
      if (pointerX === null || magnification === 0) return 1;
      if (index === activeIndex) return 1 + magnification;

      const center =
        layout.itemX + index * (itemSize + itemGap) + itemSize / 2;
      const influence = THREE.MathUtils.clamp(
        1 - Math.abs(pointerX - center) / magnificationRadius,
        0,
        1,
      );

      return 1 + magnification * influence * influence;
    },
  );
  const itemsWidth =
    scales.reduce((total, scale) => total + itemSize * scale, 0) +
    itemGap * (CONFIG.phase2.DOCK_ITEM_COUNT - 1);
  const width = itemsWidth + height * 0.32;
  const x = centerX - width / 2;

  context.save();
  context.shadowColor = "rgba(0, 0, 0, 0.38)";
  context.shadowBlur = height * 0.18;
  context.shadowOffsetY = height * 0.08;
  context.fillStyle = "rgba(218, 218, 218, 0.2)";
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fill();
  context.shadowColor = "transparent";
  context.strokeStyle = "rgba(255, 255, 255, 0.22)";
  context.lineWidth = Math.max(1, height * 0.018);
  context.stroke();

  let currentX = x + height * 0.16;

  for (let index = 0; index < CONFIG.phase2.DOCK_ITEM_COUNT; index += 1) {
    const currentItemSize = itemSize * scales[index];
    const currentY = y + height - height * 0.16 - currentItemSize;
    const gradient = context.createLinearGradient(
      currentX,
      currentY,
      currentX + currentItemSize,
      currentY + currentItemSize,
    );
    gradient.addColorStop(0, "#d9d9d9");
    gradient.addColorStop(1, "#8a8a8a");
    context.fillStyle = gradient;
    context.beginPath();
    context.roundRect(
      currentX,
      currentY,
      currentItemSize,
      currentItemSize,
      currentItemSize * 0.24,
    );
    context.fill();
    context.strokeStyle = "rgba(255, 255, 255, 0.3)";
    context.lineWidth = Math.max(1, currentItemSize * 0.035);
    context.stroke();
    currentX += currentItemSize + itemGap;
  }

  context.restore();
}

type DockRenderer = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  layout: ReturnType<typeof getDockLayout>;
  lastMagnification: number;
  lastPointerX: number | null;
};

function updateDockRenderer(
  renderer: DockRenderer,
  magnification: number,
  pointerX: number | null,
) {
  if (
    renderer.lastMagnification === magnification &&
    (renderer.lastPointerX === pointerX ||
      (renderer.lastPointerX !== null &&
        pointerX !== null &&
        Math.abs(renderer.lastPointerX - pointerX) < 0.5))
  ) {
    return;
  }

  const { canvas, context, layout } = renderer;
  const clearTop = Math.max(
    0,
    layout.y -
      layout.itemSize * (1 + CONFIG.phase2.DOCK_MAGNIFICATION_MAX),
  );
  context.fillStyle = "#000000";
  context.fillRect(0, clearTop, canvas.width, canvas.height - clearTop);
  drawDock(context, layout, magnification, pointerX);
  renderer.texture.needsUpdate = true;
  renderer.lastMagnification = magnification;
  renderer.lastPointerX = pointerX;
}

function createBrowserChromeTexture({
  sourceWidth,
  sourceHeight,
  tuning,
}: {
  sourceWidth: number;
  sourceHeight: number;
  tuning: Phase2Tuning;
}) {
  const { width: textureWidth, height: textureHeight } = getTextureDimensions(
    sourceWidth,
    sourceHeight,
  );
  const textureCanvas = document.createElement("canvas");
  const textureContext = textureCanvas.getContext("2d");

  if (!textureContext) return null;

  textureCanvas.width = textureWidth;
  textureCanvas.height = textureHeight;
  textureContext.fillStyle = "#000000";
  textureContext.fillRect(0, 0, textureWidth, textureHeight);

  const layout = getBrowserLayout(
    textureWidth,
    textureHeight,
    sourceWidth,
    sourceHeight,
    tuning,
  );
  const dock = getDockLayout(textureWidth, textureHeight, tuning);
  const {
    x: browserX,
    y: browserY,
    width: browserWidth,
    height: browserHeight,
    contentHeight,
    chromeHeight,
  } = layout;
  const cornerRadius = chromeHeight * 0.34;

  textureContext.save();
  textureContext.beginPath();
  textureContext.roundRect(
    browserX,
    browserY,
    browserWidth,
    browserHeight,
    cornerRadius,
  );
  textureContext.clip();

  textureContext.fillStyle = CONFIG.phase2.BROWSER_BAR_COLOR;
  textureContext.fillRect(browserX, browserY, browserWidth, chromeHeight);
  textureContext.clearRect(
    browserX,
    browserY + chromeHeight,
    browserWidth,
    contentHeight,
  );

  const controlRadius =
    chromeHeight *
    CONFIG.phase2.BROWSER_CONTROL_RADIUS_MULT *
    tuning.safariControlsScale;
  const sidePadding =
    chromeHeight * CONFIG.phase2.BROWSER_SIDE_PADDING_MULT;
  const controlGap =
    chromeHeight *
    CONFIG.phase2.BROWSER_CONTROL_GAP_MULT *
    tuning.safariControlsScale;
  const controlY = browserY + chromeHeight / 2;
  const firstControlX = browserX + sidePadding;

  CONFIG.phase2.BROWSER_LIGHTS.forEach((color, index) => {
    textureContext.fillStyle = color;
    textureContext.beginPath();
    textureContext.arc(
      firstControlX + index * (controlRadius * 2 + controlGap),
      controlY,
      controlRadius,
      0,
      Math.PI * 2,
    );
    textureContext.fill();
  });

  const addressHeight =
    chromeHeight *
    CONFIG.phase2.BROWSER_ADDRESS_HEIGHT_MULT *
    tuning.safariAddressScale;
  const addressWidth =
    browserWidth *
    CONFIG.phase2.BROWSER_ADDRESS_WIDTH_MULT *
    tuning.safariAddressScale;
  textureContext.fillStyle = CONFIG.phase2.BROWSER_ADDRESS_COLOR;
  textureContext.fillRect(
    browserX + (browserWidth - addressWidth) / 2,
    controlY - addressHeight / 2,
    addressWidth,
    addressHeight,
  );
  textureContext.fillStyle = CONFIG.phase2.BROWSER_ICON_COLOR;
  textureContext.font = `400 ${
    chromeHeight * CONFIG.phase2.BROWSER_ADDRESS_FONT_MULT
      * tuning.safariAddressScale
  }px Arial`;
  textureContext.textAlign = "center";
  textureContext.textBaseline = "middle";
  textureContext.fillText("folio-2026", browserX + browserWidth / 2, controlY);
  textureContext.restore();
  drawDock(textureContext, dock);

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return {
    texture,
    dockRenderer: {
      canvas: textureCanvas,
      context: textureContext,
      texture,
      layout: dock,
      lastMagnification: 0,
      lastPointerX: null,
    },
  };
}

function createPageMask(
  textureWidth: number,
  textureHeight: number,
  layout: ReturnType<typeof getBrowserLayout>,
) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) return null;

  canvas.width = textureWidth;
  canvas.height = textureHeight;
  context.fillStyle = "#000000";
  context.fillRect(0, 0, textureWidth, textureHeight);
  context.save();
  context.beginPath();
  context.roundRect(
    layout.x,
    layout.y,
    layout.width,
    layout.height,
    layout.chromeHeight * 0.34,
  );
  context.clip();
  context.fillStyle = "#ffffff";
  context.fillRect(
    layout.x,
    layout.y + layout.chromeHeight,
    layout.width,
    layout.contentHeight,
  );
  context.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function setHtmlOverlayVisibility(
  container: HTMLElement | null,
  canvas: HTMLCanvasElement,
  hidden: boolean,
) {
  if (!container) return;

  for (const child of container.children) {
    if (child instanceof HTMLElement && !child.contains(canvas)) {
      child.classList.toggle("phase2-html-overlay-hidden", hidden);
    }
  }
}

function affordableAberrationTaps(width: number, height: number) {
  const devicePixels =
    width *
    height *
    CONFIG.customAberration.SCROLL_TAP_DPR_CEILING ** 2;

  if (devicePixels <= 0) return CONFIG.customAberration.SCROLL_TAPS;

  return THREE.MathUtils.clamp(
    Math.round(
      (CONFIG.customAberration.SCROLL_TAPS *
        CONFIG.customAberration.SCROLL_TAP_PIXEL_BUDGET) /
        devicePixels,
    ),
    CONFIG.customAberration.SCROLL_TAPS_MIN,
    CONFIG.customAberration.SCROLL_TAPS,
  );
}

const PAGE_ABERRATION_VERTEX_SHADER = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

function createPageAberrationMaterial(taps: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      u_pageTexture: { value: null },
      u_pageMask: { value: null },
      u_pageBounds: { value: new THREE.Vector4(0, 0, 1, 1) },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
      u_aberrationIntensity: { value: 0 },
      u_gridSize: { value: new THREE.Vector2(80, 80) },
      u_aspect: { value: new THREE.Vector2(1, 1) },
      u_mouseVelocity: { value: new THREE.Vector2(0, 0) },
      u_scrollVelocity: { value: 0 },
      u_scrollBlur: { value: CONFIG.customAberration.SCROLL_BLUR },
      u_scrollSplit: { value: CONFIG.customAberration.SCROLL_SPLIT },
      u_scrollVignette: {
        value: new THREE.Vector4(
          CONFIG.customAberration.SCROLL_VIGNETTE_X_WEIGHT,
          CONFIG.customAberration.SCROLL_VIGNETTE_INNER,
          CONFIG.customAberration.SCROLL_VIGNETTE_OUTER,
          CONFIG.customAberration.SCROLL_VIGNETTE_FLOOR,
        ),
      },
    },
    vertexShader: PAGE_ABERRATION_VERTEX_SHADER,
    fragmentShader: `
uniform sampler2D u_pageTexture;
uniform sampler2D u_pageMask;
uniform vec4 u_pageBounds;
varying vec2 vUv;

${buildCustomAberrationProgram(taps)}

vec4 inputSample(vec2 uv) {
  return texture2D(u_pageTexture, uv);
}

void main() {
  if (texture2D(u_pageMask, vUv).r < 0.5) discard;
  vec2 pageUv = (vUv - u_pageBounds.xy) / u_pageBounds.zw;
  gl_FragColor = applyCustomAberration(pageUv);
}
`,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
}

type PageUvBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function configurePageAberrationMaterial(
  material: THREE.ShaderMaterial,
  target: THREE.WebGLRenderTarget,
  pageMask: THREE.CanvasTexture,
  bounds: PageUvBounds,
) {
  material.uniforms.u_pageTexture.value = target.texture;
  material.uniforms.u_pageMask.value = pageMask;
  material.uniforms.u_pageBounds.value.set(
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
  );
  const aspect = bounds.width / bounds.height;
  material.uniforms.u_gridSize.value.set(
    CONFIG.customAberration.COLUMNS,
    CONFIG.customAberration.COLUMNS / aspect,
  );
  material.uniforms.u_aspect.value.set(aspect, 1);
}

function isThemeToggleHit({
  pageX,
  pageY,
  viewport,
  size,
  leftX,
  rightX,
  layoutMode,
}: {
  pageX: number;
  pageY: number;
  viewport: { width: number; height: number };
  size: { width: number; height: number };
  leftX: number;
  rightX: number;
  layoutMode: "wide" | "narrow";
}) {
  const headerMargin =
    layoutMode === "narrow"
      ? CONFIG.header.NARROW_MARGIN_Y_PX
      : CONFIG.header.MARGIN_Y_PX;
  const verticalCenter = 1 - headerMargin / size.height;
  const verticalHitRadius = 24 / size.height;

  if (Math.abs(pageY - verticalCenter) > verticalHitRadius) return false;

  const themeX =
    layoutMode === "narrow"
      ? leftX +
        (rightX - leftX) * CONFIG.header.NARROW_THEME_SLOT_T
      : leftX + (rightX - leftX) * CONFIG.header.SLOT_TS[2];
  const themeXNormalized = (themeX + viewport.width / 2) / viewport.width;

  if (layoutMode === "narrow") {
    const hitRadius = 24 / size.width;
    return Math.abs(pageX - themeXNormalized) <= hitRadius;
  }

  return (
    pageX >= themeXNormalized - 18 / size.width &&
    pageX <= themeXNormalized + 150 / size.width
  );
}

export function Phase2Surface({ children }: { children: ReactNode }) {
  const {
    viewport,
    size: layoutSize,
    leftX,
    rightX,
  } = useHeroLayout();
  const { revealProgressRef } = useHeroTransition();
  const { camera, events, gl, scene, size } = useThree();
  const prefersReducedMotion = usePrefersReducedMotion();
  const { scrollBlur: scroll, phase2 } = useDebugSettings();
  const { inputMode, layoutMode } = useSceneCapabilities();
  const { theme, setTheme } = useTheme();
  const pageGroupRef = useRef<THREE.Group>(null);
  const surfaceGroupRef = useRef<THREE.Group>(null);
  const chromeMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const pageMeshRef = useRef<THREE.Mesh>(null);
  const pageAberrationMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const targetRef = useRef<THREE.WebGLRenderTarget | null>(null);
  const chromeTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const dockRendererRef = useRef<DockRenderer | null>(null);
  const pageMaskRef = useRef<THREE.CanvasTexture | null>(null);
  const surfaceTransformRef = useRef<{ scale: number; y: number } | null>(
    null,
  );
  const capturedRef = useRef(false);
  const capturePendingRef = useRef(false);
  const lastCurveDepthRef = useRef(-1);
  const htmlOverlayHiddenRef = useRef(false);
  const pageUvBoundsRef = useRef<PageUvBounds | null>(null);
  const currentMouseRef = useRef(new THREE.Vector2(0.5, 0.5));
  const targetMouseRef = useRef(new THREE.Vector2(0.5, 0.5));
  const prevMouseRef = useRef(new THREE.Vector2(0.5, 0.5));
  const mouseIntensityRef = useRef(0);
  const previousScrollYRef = useRef<number | null>(null);
  const scrollVelocityRef = useRef(0);
  const intersectionsRef = useRef<THREE.Intersection[]>([]);

  const taps = Math.min(
    scroll.taps,
    affordableAberrationTaps(size.width, size.height),
    inputMode === "coarse" ? 4 : CONFIG.customAberration.SCROLL_TAPS,
  );
  const pageAberrationMaterial = useMemo(
    () => createPageAberrationMaterial(taps),
    [taps],
  );

  const planeWidth = Math.max(
    viewport.width,
    viewport.height *
      (1 + CONFIG.phase2.BROWSER_CHROME_HEIGHT_MULT) *
      CONFIG.phase2.PLANE_ASPECT,
  );
  const planeHeight = planeWidth / CONFIG.phase2.PLANE_ASPECT;
  const maxCurveDepth =
    Math.min(planeWidth, planeHeight) * CONFIG.phase2.PLANE_CURVE_DEPTH_MULT;
  const planeGeometry = useMemo(
    () => createPlaneGeometry(planeWidth, planeHeight),
    [planeHeight, planeWidth],
  );

  useEffect(() => {
    return () => planeGeometry.dispose();
  }, [planeGeometry]);

  useEffect(() => {
    return () => pageAberrationMaterial.dispose();
  }, [pageAberrationMaterial]);

  useEffect(() => {
    pageAberrationMaterialRef.current = pageAberrationMaterial;
    return () => {
      if (pageAberrationMaterialRef.current === pageAberrationMaterial) {
        pageAberrationMaterialRef.current = null;
      }
    };
  }, [pageAberrationMaterial]);

  useEffect(() => {
    const target = targetRef.current;
    const pageMask = pageMaskRef.current;
    const bounds = pageUvBoundsRef.current;

    if (target && pageMask && bounds) {
      configurePageAberrationMaterial(
        pageAberrationMaterial,
        target,
        pageMask,
        bounds,
      );
    }
  }, [pageAberrationMaterial]);

  useEffect(() => {
    capturedRef.current = false;
    capturePendingRef.current = false;
    lastCurveDepthRef.current = -1;
    targetRef.current?.dispose();
    targetRef.current = null;
    chromeTextureRef.current?.dispose();
    chromeTextureRef.current = null;
    dockRendererRef.current = null;
    pageMaskRef.current?.dispose();
    pageMaskRef.current = null;
    surfaceTransformRef.current = null;
    pageUvBoundsRef.current = null;
    previousScrollYRef.current = null;
    scrollVelocityRef.current = 0;

    if (pageGroupRef.current) pageGroupRef.current.visible = true;
    if (surfaceGroupRef.current) {
      surfaceGroupRef.current.visible = false;
      surfaceGroupRef.current.position.y = 0;
      surfaceGroupRef.current.scale.setScalar(1);
    }
  }, [
    phase2.dockScale,
    phase2.dockOffsetX,
    phase2.dockOffsetY,
    phase2.safariAddressScale,
    phase2.safariBottomSafeArea,
    phase2.safariChromeScale,
    phase2.safariControlsScale,
    size.height,
    size.width,
  ]);

  useEffect(() => {
    return () => {
      targetRef.current?.dispose();
      chromeTextureRef.current?.dispose();
      dockRendererRef.current = null;
      pageMaskRef.current?.dispose();
      setHtmlOverlayVisibility(
        events.connected as HTMLElement | null,
        gl.domElement,
        false,
      );
    };
  }, [events, gl]);

  useFrame(() => {
    const scrollReveal = THREE.MathUtils.clamp(revealProgressRef.current, 0, 1);
    const reveal = prefersReducedMotion
      ? scrollReveal > 0
        ? 1
        : 0
      : scrollReveal;
    const hideHtmlOverlays = reveal >= CONFIG.phase2.BROWSER_REVEAL_START;

    if (htmlOverlayHiddenRef.current !== hideHtmlOverlays) {
      setHtmlOverlayVisibility(
        (events.connected as HTMLElement | null) ?? gl.domElement.parentElement,
        gl.domElement,
        hideHtmlOverlays,
      );
      htmlOverlayHiddenRef.current = hideHtmlOverlays;
    }
    const planeZ = CONFIG.phase2.PLANE_Z;
    const restZ = CONFIG.caseStudy.CAMERA_REST_Z;
    const perspective = camera as THREE.PerspectiveCamera;
    const restDistance = restZ - planeZ;
    const restHeight =
      2 *
      Math.tan(THREE.MathUtils.degToRad(perspective.fov) / 2) *
      restDistance;
    const restWidth = restHeight * perspective.aspect;
    const fit = Math.max(
      1,
      planeWidth / (restWidth * CONFIG.phase2.REVEAL_CAMERA_FILL),
      planeHeight / (restHeight * CONFIG.phase2.REVEAL_CAMERA_FILL),
    );
    const targetZ = planeZ + restDistance * fit;

    if (!caseStudyStage.open && caseStudyStage.progress < 0.001) {
      camera.position.set(0, 0, THREE.MathUtils.lerp(restZ, targetZ, reveal));
      camera.updateMatrixWorld();
    }

    const surfaceProgress = prefersReducedMotion
      ? reveal
      : THREE.MathUtils.mapLinear(
          reveal,
          CONFIG.phase2.BROWSER_REVEAL_START,
          1,
          0,
          1,
        );
    const curveDepth =
      maxCurveDepth *
      THREE.MathUtils.smoothstep(
        reveal,
        CONFIG.phase2.PLANE_CURVE_START,
        CONFIG.phase2.PLANE_CURVE_END,
      );

    if (Math.abs(curveDepth - lastCurveDepthRef.current) > 0.0001) {
      updatePlaneCurve(planeGeometry, planeWidth, planeHeight, curveDepth);
      lastCurveDepthRef.current = curveDepth;
    }

    if (!capturedRef.current && reveal >= CONFIG.phase2.BROWSER_REVEAL_START) {
      if (!capturePendingRef.current) {
        capturePendingRef.current = true;
        return;
      }
    }

    if (capturedRef.current && pageGroupRef.current) {
      pageGroupRef.current.visible =
        reveal < CONFIG.phase2.BROWSER_REVEAL_START;
    }

    if (surfaceGroupRef.current && capturedRef.current) {
      const transform = surfaceTransformRef.current;

      if (transform) {
        const progress = THREE.MathUtils.clamp(surfaceProgress, 0, 1);
        const scale = THREE.MathUtils.lerp(transform.scale, 1, progress);
        surfaceGroupRef.current.scale.setScalar(scale);
        surfaceGroupRef.current.position.y = THREE.MathUtils.lerp(
          transform.y,
          0,
          progress,
        );
      }
      surfaceGroupRef.current.visible =
        reveal >= CONFIG.phase2.BROWSER_REVEAL_START;
    }
  });

  useFrame((state, delta) => {
    if (
      !capturedRef.current ||
      revealProgressRef.current < CONFIG.phase2.BROWSER_REVEAL_START ||
      !pageMeshRef.current ||
      !pageUvBoundsRef.current ||
      !pageAberrationMaterialRef.current
    ) {
      return;
    }

    const intersections = intersectionsRef.current;
    intersections.length = 0;
    state.raycaster.setFromCamera(state.pointer, state.camera);
    state.raycaster.intersectObject(pageMeshRef.current, false, intersections);
    const pageUv = intersections[0]?.uv;
    const bounds = pageUvBoundsRef.current;
    const mouseX = pageUv ? (pageUv.x - bounds.x) / bounds.width : -1;
    const mouseY = pageUv ? (pageUv.y - bounds.y) / bounds.height : -1;
    const pointerInsidePage =
      mouseX >= 0 && mouseX <= 1 && mouseY >= 0 && mouseY <= 1;
    const dockRenderer = dockRendererRef.current;
    const pointerX =
      pageUv && dockRenderer
        ? pageUv.x * dockRenderer.canvas.width
        : null;
    const pointerY =
      pageUv && dockRenderer
        ? (1 - pageUv.y) * dockRenderer.canvas.height
        : null;
    const pointerInsideDock =
      dockRenderer !== null &&
      pointerX !== null &&
      pointerY !== null &&
      pointerX >= dockRenderer.layout.x - dockRenderer.layout.itemSize &&
      pointerX <=
        dockRenderer.layout.x +
        dockRenderer.layout.width +
        dockRenderer.layout.itemSize &&
      pointerY >=
        dockRenderer.layout.y -
        dockRenderer.layout.itemSize * CONFIG.phase2.DOCK_MAGNIFICATION_MAX &&
      pointerY <= dockRenderer.layout.y + dockRenderer.layout.height;

    if (dockRenderer) {
      updateDockRenderer(
        dockRenderer,
        phase2.dockMagnification,
        pointerInsideDock ? pointerX : null,
      );
    }

    if (pointerInsidePage) {
      const dx = mouseX - targetMouseRef.current.x;
      const dy = mouseY - targetMouseRef.current.y;

      if (
        inputMode === "fine" &&
        (Math.abs(dx) > 0.0001 || Math.abs(dy) > 0.0001)
      ) {
        mouseIntensityRef.current = 1;
      }

      targetMouseRef.current.set(mouseX, mouseY);
    }

    prevMouseRef.current.copy(currentMouseRef.current);
    currentMouseRef.current.lerp(
      targetMouseRef.current,
      1 - Math.exp(-CONFIG.customAberration.LERP_FACTOR_MULT * delta),
    );
    mouseIntensityRef.current = THREE.MathUtils.lerp(
      mouseIntensityRef.current,
      0,
      1 - Math.exp(-CONFIG.customAberration.INTENSITY_LERP_MULT * delta),
    );

    if (mouseIntensityRef.current < CONFIG.customAberration.INTENSITY_MIN) {
      mouseIntensityRef.current = 0;
    }

    const safeDelta = Math.max(delta, CONFIG.customAberration.SAFE_DELTA_MIN);
    const mouseVelocityX =
      mouseIntensityRef.current > 0
        ? ((currentMouseRef.current.x - prevMouseRef.current.x) *
            CONFIG.customAberration.VEL_MULT) /
          safeDelta
        : 0;
    const mouseVelocityY =
      mouseIntensityRef.current > 0
        ? ((currentMouseRef.current.y - prevMouseRef.current.y) *
            CONFIG.customAberration.VEL_MULT) /
          safeDelta
        : 0;
    const scrollY = window.scrollY;
    const scrollDelta =
      previousScrollYRef.current === null
        ? 0
        : scrollY - previousScrollYRef.current;
    previousScrollYRef.current = scrollY;
    const targetScrollVelocity = THREE.MathUtils.clamp(
      ((scrollDelta / size.height) *
        scroll.velocityScale *
        CONFIG.customAberration.VEL_MULT) /
        safeDelta,
      -CONFIG.customAberration.SCROLL_VEL_CLAMP,
      CONFIG.customAberration.SCROLL_VEL_CLAMP,
    );
    const scrollLerp =
      Math.abs(targetScrollVelocity) > Math.abs(scrollVelocityRef.current)
        ? scroll.attack
        : scroll.release;

    scrollVelocityRef.current = THREE.MathUtils.lerp(
      scrollVelocityRef.current,
      targetScrollVelocity,
      1 - Math.exp(-scrollLerp * delta),
    );

    if (Math.abs(scrollVelocityRef.current) < CONFIG.customAberration.SCROLL_MIN) {
      scrollVelocityRef.current = 0;
    }

    const uniforms = pageAberrationMaterialRef.current.uniforms;
    uniforms.u_mouse.value.copy(currentMouseRef.current);
    uniforms.u_aberrationIntensity.value =
      inputMode === "fine" ? mouseIntensityRef.current : 0;
    uniforms.u_mouseVelocity.value.set(mouseVelocityX, mouseVelocityY);
    uniforms.u_scrollVelocity.value = scrollVelocityRef.current;
    const mobileIntensity = inputMode === "coarse" ? 0.55 : 1;
    uniforms.u_scrollBlur.value = scroll.blur * mobileIntensity;
    uniforms.u_scrollSplit.value = scroll.split * mobileIntensity;
    uniforms.u_scrollVignette.value.set(
      scroll.vignetteXWeight,
      scroll.vignetteInner,
      scroll.vignetteOuter,
      scroll.vignetteFloor,
    );
  });

  useFrame(() => {
    if (
      (!capturePendingRef.current && !capturedRef.current) ||
      revealProgressRef.current < CONFIG.phase2.BROWSER_REVEAL_START ||
      !pageGroupRef.current ||
      !surfaceGroupRef.current
    ) {
      return;
    }

    const pixelRatio = gl.getPixelRatio();
    const sourceWidth = Math.round(size.width * pixelRatio);
    const sourceHeight = Math.round(size.height * pixelRatio);
    if (!targetRef.current) {
      const target = new THREE.WebGLRenderTarget(sourceWidth, sourceHeight, {
        depthBuffer: true,
        stencilBuffer: false,
      });
      target.texture.colorSpace = gl.outputColorSpace;
      targetRef.current = target;
    }

    const target = targetRef.current;
    const previousTarget = gl.getRenderTarget();
    const wasSurfaceVisible = surfaceGroupRef.current.visible;
    const wasPageVisible = pageGroupRef.current.visible;
    const captureCamera = (camera as THREE.PerspectiveCamera).clone();

    surfaceGroupRef.current.visible = false;
    pageGroupRef.current.visible = true;
    captureCamera.position.z = CONFIG.caseStudy.CAMERA_REST_Z;
    captureCamera.layers.enable(HEADER_LAYER);
    captureCamera.layers.enable(THEME_SWEEP_LAYER);
    captureCamera.updateMatrixWorld();
    gl.setRenderTarget(target);
    gl.clear();
    gl.render(scene, captureCamera);
    gl.setRenderTarget(previousTarget);
    pageGroupRef.current.visible = capturedRef.current ? false : wasPageVisible;
    surfaceGroupRef.current.visible = wasSurfaceVisible;

    if (capturedRef.current) return;

    const { width: textureWidth, height: textureHeight } = getTextureDimensions(
      sourceWidth,
      sourceHeight,
    );
    const layout = getBrowserLayout(
      textureWidth,
      textureHeight,
      sourceWidth,
      sourceHeight,
      phase2,
    );
    const chromeTexture = createBrowserChromeTexture({
      sourceWidth,
      sourceHeight,
      tuning: phase2,
    });
    const pageMask = createPageMask(textureWidth, textureHeight, layout);

    if (
      !chromeTexture ||
      !pageMask ||
      !chromeMaterialRef.current
    ) {
      return;
    }

    chromeTextureRef.current?.dispose();
    chromeTextureRef.current = chromeTexture.texture;
    dockRendererRef.current = chromeTexture.dockRenderer;
    pageMaskRef.current?.dispose();
    pageMaskRef.current = pageMask;
    chromeMaterialRef.current.map = chromeTexture.texture;
    chromeMaterialRef.current.needsUpdate = true;
    const bounds = {
      x: layout.x / textureWidth,
      y:
        1 -
        (layout.y + layout.chromeHeight + layout.contentHeight) /
          textureHeight,
      width: layout.width / textureWidth,
      height: layout.contentHeight / textureHeight,
    };
    pageUvBoundsRef.current = bounds;
    configurePageAberrationMaterial(
      pageAberrationMaterial,
      target,
      pageMask,
      bounds,
    );
    const restDistance = CONFIG.caseStudy.CAMERA_REST_Z - CONFIG.phase2.PLANE_Z;
    const restHeight =
      2 *
      Math.tan(THREE.MathUtils.degToRad(captureCamera.fov) / 2) *
      restDistance;
    const restWidth = restHeight * captureCamera.aspect;
    const contentWidth = planeWidth * (layout.width / textureWidth);
    const contentCenterY =
      planeHeight *
      (0.5 -
        (layout.y + layout.chromeHeight + layout.contentHeight / 2) /
          textureHeight);
    const scale = restWidth / contentWidth;

    surfaceTransformRef.current = {
      scale,
      y: -contentCenterY * scale,
    };
    capturedRef.current = true;
    capturePendingRef.current = false;
    pageGroupRef.current.visible = false;
    surfaceGroupRef.current.scale.setScalar(scale);
    surfaceGroupRef.current.position.y = -contentCenterY * scale;
    surfaceGroupRef.current.visible = true;
  }, 0.5);

  const handlePageClick = (event: ThreeEvent<MouseEvent>) => {
    const pageUv = event.uv;
    const bounds = pageUvBoundsRef.current;

    if (!pageUv || !bounds) return;

    const pageX = (pageUv.x - bounds.x) / bounds.width;
    const pageY = (pageUv.y - bounds.y) / bounds.height;

    if (
      !isThemeToggleHit({
        pageX,
        pageY,
        viewport,
        size: layoutSize,
        leftX,
        rightX,
        layoutMode,
      })
    ) {
      return;
    }

    event.stopPropagation();
    setTheme(theme === "Light" ? "Dark" : "Light");
  };

  return (
    <group>
      <group ref={pageGroupRef}>{children}</group>

      <group
        ref={surfaceGroupRef}
        position={[0, 0, CONFIG.phase2.PLANE_Z]}
        visible={false}
      >
        <mesh
          geometry={planeGeometry}
          renderOrder={10}
          frustumCulled={false}
          raycast={() => null}
        >
          <meshBasicMaterial
            ref={chromeMaterialRef}
            color="#ffffff"
            transparent
            depthTest={false}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <mesh
          ref={pageMeshRef}
          geometry={planeGeometry}
          renderOrder={11}
          frustumCulled={false}
          onClick={handlePageClick}
        >
          <primitive object={pageAberrationMaterial} attach="material" />
        </mesh>
      </group>
    </group>
  );
}
