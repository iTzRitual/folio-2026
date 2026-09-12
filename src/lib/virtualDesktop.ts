import * as THREE from "three";
import { CONFIG } from "@/config/constants";
import type { DebugSettings } from "@/context/DebugSettingsContext";
import { buildCustomAberrationProgram } from "@/lib/customAberrationShader";

type DesktopTuning = DebugSettings["desktop"];

type DockApp = {
  id: string;
  label: string;
  icon: "finder" | "safari" | "vscode" | "codex" | "gaming" | "notes" | "music" | "mail";
  isRunning: boolean;
};

export const DOCK_APPS: DockApp[] = [
  { id: "finder", label: "Finder", icon: "finder", isRunning: true },
  { id: "safari", label: "Safari — Folio-2026", icon: "safari", isRunning: true },
  { id: "vscode", label: "Visual Studio Code", icon: "vscode", isRunning: false },
  { id: "codex", label: "Codex", icon: "codex", isRunning: false },
  { id: "gaming", label: "Gaming", icon: "gaming", isRunning: false },
  { id: "notes", label: "Notes — About me", icon: "notes", isRunning: false },
  { id: "music", label: "Music", icon: "music", isRunning: false },
  { id: "mail", label: "Mail — Contact", icon: "mail", isRunning: false },
];

export const SAFARI_DOCK_INDEX = DOCK_APPS.findIndex((app) => app.id === "safari");
export const VSCODE_DOCK_INDEX = DOCK_APPS.findIndex((app) => app.id === "vscode");
export const WORKSTATION_WALLPAPER_SRC = "/media/workstation/wallpaper.jpeg";
export type GenieUniforms = {
  progress: { value: number };
  opacity: { value: number };
  window: { value: THREE.Vector4 };
  target: { value: THREE.Vector3 };
};

export function createPlaneGeometry(width: number, height: number): THREE.PlaneGeometry {
  return new THREE.PlaneGeometry(
    width,
    height,
    CONFIG.workstation.PLANE_SEGMENTS_X,
    CONFIG.workstation.PLANE_SEGMENTS_Y,
  );
}

export function getTextureDimensions(sourceWidth: number, sourceHeight: number) {
  const rawWidth = Math.max(
    sourceWidth,
    sourceHeight * CONFIG.workstation.PLANE_ASPECT,
  );
  const scale = Math.min(
    1,
    CONFIG.workstation.TEXTURE_MAX_DIMENSION / rawWidth,
  );
  const width = Math.round(rawWidth * scale);

  return {
    width,
    height: Math.round(width / CONFIG.workstation.PLANE_ASPECT),
  };
}

export function getPageTargetDimensions(
  sourceWidth: number,
  sourceHeight: number,
  qualityTier: "high" | "balanced" | "low",
) {
  const maxDimension =
    qualityTier === "low"
      ? CONFIG.workstation.PAGE_TARGET_LOW_MAX_SIZE
      : qualityTier === "balanced"
        ? CONFIG.workstation.PAGE_TARGET_BALANCED_MAX_SIZE
        : CONFIG.workstation.PAGE_TARGET_HIGH_MAX_SIZE;
  const scale = Math.min(
    1,
    maxDimension / Math.max(sourceWidth, sourceHeight),
  );

  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
  };
}

function getDockLayout(
  textureWidth: number,
  textureHeight: number,
  tuning: DesktopTuning,
) {
  const screenMargin =
    Math.min(textureWidth, textureHeight) *
    CONFIG.workstation.BROWSER_SAFE_MARGIN_MULT;
  const screenUnit = Math.min(textureWidth, textureHeight);
  const height =
    Math.min(textureWidth, textureHeight) *
    CONFIG.workstation.DOCK_HEIGHT_MULT *
    tuning.dockScale;
  const itemGap = height * CONFIG.workstation.DOCK_ITEM_GAP_MULT;
  const horizontalPadding = height * 0.16;
  const itemSize = height - horizontalPadding * 2;
  const itemsWidth =
    itemSize * DOCK_APPS.length + itemGap * (DOCK_APPS.length - 1);
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

export function getBrowserLayout(
  textureWidth: number,
  textureHeight: number,
  sourceWidth: number,
  sourceHeight: number,
  tuning: DesktopTuning,
) {
  const margin =
    Math.min(textureWidth, textureHeight) *
    CONFIG.workstation.BROWSER_SAFE_MARGIN_MULT;
  const dock = getDockLayout(textureWidth, textureHeight, tuning);
  const availableWidth = textureWidth - margin * 2;
  const availableHeight = dock.safeTop - margin;
  const browserAspect =
    sourceWidth /
    (sourceHeight *
      (1 +
        CONFIG.workstation.BROWSER_CHROME_HEIGHT_MULT *
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
      CONFIG.workstation.BROWSER_CHROME_HEIGHT_MULT * tuning.safariChromeScale);

  return {
    x,
    y,
    width,
    height,
    contentHeight,
    chromeHeight: height - contentHeight,
  };
}

export function getBrowserControlHit(
  layout: ReturnType<typeof getBrowserLayout>,
  tuning: DesktopTuning,
  pointerX: number,
  pointerY: number,
  textureToCssScale: number,
) {
  const controlRadius =
    layout.chromeHeight *
    CONFIG.workstation.BROWSER_CONTROL_RADIUS_MULT *
    tuning.safariControlsScale;
  const sidePadding =
    layout.chromeHeight * CONFIG.workstation.BROWSER_SIDE_PADDING_MULT;
  const controlGap =
    layout.chromeHeight *
    CONFIG.workstation.BROWSER_CONTROL_GAP_MULT *
    tuning.safariControlsScale;
  const controlY = layout.y + layout.chromeHeight / 2;
  const firstControlX = layout.x + sidePadding;
  const hitRadius = Math.max(controlRadius * 1.8, 22 * textureToCssScale);
  let closestIndex = -1;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < CONFIG.workstation.BROWSER_LIGHTS.length; index += 1) {
    const controlX = firstControlX + index * (controlRadius * 2 + controlGap);
    const distance = Math.abs(pointerX - controlX);

    if (distance < closestDistance) {
      closestIndex = index;
      closestDistance = distance;
    }
  }

  if (
    closestIndex < 0 ||
    closestDistance > hitRadius ||
    Math.abs(pointerY - controlY) > hitRadius
  ) {
    return null;
  }

  return closestIndex === 0 ? "close" : "minimize";
}

export function easeInOutQuint(value: number) {
  return value < 0.5
    ? 16 * value ** 5
    : 1 - (-2 * value + 2) ** 5 / 2;
}

export function configureGenieGeometry(
  genie: GenieUniforms,
  browserLayout: ReturnType<typeof getBrowserLayout>,
  dockRenderer: DockRenderer,
  planeWidth: number,
  planeHeight: number,
  dockIndex: number,
) {
  const { canvas } = dockRenderer;
  const windowCenterX = browserLayout.x + browserLayout.width / 2;
  const windowCenterY = browserLayout.y + browserLayout.height / 2;
  const safari = getDockItemBounds(
    dockRenderer.layout,
    dockRenderer.scales,
    dockRenderer.x,
    dockIndex,
  );
  const targetCenterX = safari.x + safari.width / 2;
  const targetCenterY = safari.y + safari.height / 2;
  const toLocalX = (value: number) => (value / canvas.width - 0.5) * planeWidth;
  const toLocalY = (value: number) => (0.5 - value / canvas.height) * planeHeight;

  genie.window.value.set(
    toLocalX(windowCenterX),
    toLocalY(windowCenterY),
    (browserLayout.width / canvas.width) * planeWidth,
    (browserLayout.height / canvas.height) * planeHeight,
  );
  genie.target.value.set(
    toLocalX(targetCenterX),
    toLocalY(targetCenterY),
    (safari.width / browserLayout.width) *
      CONFIG.workstation.GENIE_TARGET_SCALE_MULT,
  );
}

export function setGeniePresentation(
  genie: GenieUniforms,
  amount: number,
  prefersReducedMotion: boolean,
) {
  genie.progress.value = prefersReducedMotion ? 0 : amount;
  genie.opacity.value = prefersReducedMotion ? 1 - amount : 1;
}

export function getDockItemBounds(
  layout: ReturnType<typeof getDockLayout>,
  scales: number[],
  x: number,
  index: number,
) {
  const itemSize = layout.itemSize * scales[index];
  const itemX =
    x +
    layout.height * 0.16 +
    scales
      .slice(0, index)
      .reduce((offset, scale) => offset + layout.itemSize * scale + layout.itemGap, 0);

  return {
    x: itemX,
    y: layout.y + layout.height - layout.height * 0.16 - itemSize,
    width: itemSize,
    height: itemSize,
  };
}

export function getDockHoveredIndex(
  layout: ReturnType<typeof getDockLayout>,
  scales: number[],
  x: number,
  pointerX: number,
) {
  let hoveredIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < DOCK_APPS.length; index += 1) {
    const item = getDockItemBounds(layout, scales, x, index);
    const distance = Math.abs(pointerX - (item.x + item.width / 2));

    if (distance < closestDistance) {
      hoveredIndex = index;
      closestDistance = distance;
    }
  }

  return hoveredIndex;
}

function drawDockTooltip(
  context: CanvasRenderingContext2D,
  layout: ReturnType<typeof getDockLayout>,
  scales: number[],
  x: number,
  index: number,
  activeScale: number,
) {
  const item = getDockItemBounds(layout, scales, x, index);
  const label = DOCK_APPS[index].label;
  const fontSize = Math.max(12, layout.itemSize * 0.45);
  const paddingX = fontSize * 0.55;
  const paddingY = fontSize * 0.32;
  const arrowWidth = fontSize * 0.58;
  const arrowHeight = fontSize * 0.35;

  context.save();
  context.font = `400 ${fontSize}px Arial`;
  const width = context.measureText(label).width + paddingX * 2;
  const height = fontSize + paddingY * 2;
  const centerX = item.x + item.width / 2;
  const tooltipX = THREE.MathUtils.clamp(
    centerX - width / 2,
    2,
    context.canvas.width - width - 2,
  );
  const tooltipY =
    layout.y +
    layout.height -
    layout.height * 0.16 -
    layout.itemSize * activeScale -
    layout.itemSize * 0.24 -
    arrowHeight -
    height;
  const radius = height * 0.2;

  context.fillStyle = "#2d2d2f";
  context.strokeStyle = "#080808";
  context.lineWidth = Math.max(1, height * 0.045);
  context.beginPath();
  context.moveTo(centerX - arrowWidth / 2, tooltipY + height - radius / 3);
  context.lineTo(centerX, tooltipY + height + arrowHeight);
  context.lineTo(centerX + arrowWidth / 2, tooltipY + height - radius / 3);
  context.closePath();
  context.fill();
  context.stroke();

  context.beginPath();
  context.roundRect(tooltipX, tooltipY, width, height, radius);
  context.fill();
  context.stroke();

  context.fillStyle = "#f5f5f7";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label, tooltipX + width / 2, tooltipY + height / 2 + fontSize * 0.03);
  context.restore();
}

function drawDockAppIcon(
  context: CanvasRenderingContext2D,
  app: DockApp,
  item: { x: number; y: number; width: number; height: number },
) {
  const radius = item.width * 0.24;
  const centerX = item.x + item.width / 2;
  const centerY = item.y + item.height / 2;

  context.save();
  context.beginPath();
  context.roundRect(item.x, item.y, item.width, item.height, radius);
  context.clip();

  if (app.icon === "finder") {
    const gradient = context.createLinearGradient(item.x, item.y, item.x, item.y + item.height);
    gradient.addColorStop(0, "#70d7ff");
    gradient.addColorStop(1, "#2189e9");
    context.fillStyle = gradient;
    context.fillRect(item.x, item.y, item.width, item.height);
    context.fillStyle = "rgba(9, 74, 166, 0.48)";
    context.fillRect(item.x, item.y, item.width * 0.5, item.height);
    context.strokeStyle = "rgba(5, 30, 79, 0.92)";
    context.lineWidth = item.width * 0.055;
    context.beginPath();
    context.moveTo(centerX, item.y + item.height * 0.16);
    context.lineTo(centerX, item.y + item.height * 0.73);
    context.moveTo(item.x + item.width * 0.23, item.y + item.height * 0.36);
    context.lineTo(item.x + item.width * 0.23, item.y + item.height * 0.48);
    context.moveTo(item.x + item.width * 0.73, item.y + item.height * 0.36);
    context.lineTo(item.x + item.width * 0.73, item.y + item.height * 0.48);
    context.moveTo(item.x + item.width * 0.23, item.y + item.height * 0.64);
    context.quadraticCurveTo(centerX, item.y + item.height * 0.81, item.x + item.width * 0.77, item.y + item.height * 0.64);
    context.stroke();
  }

  if (app.icon === "safari") {
    const gradient = context.createLinearGradient(item.x, item.y, item.x, item.y + item.height);
    gradient.addColorStop(0, "#f8fbfe");
    gradient.addColorStop(1, "#d5e4ef");
    context.fillStyle = gradient;
    context.fillRect(item.x, item.y, item.width, item.height);
    context.fillStyle = "#45a7e9";
    context.beginPath();
    context.arc(centerX, centerY, item.width * 0.37, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(255, 255, 255, 0.96)";
    context.lineWidth = item.width * 0.038;
    context.stroke();
    context.fillStyle = "#ee4e5f";
    context.beginPath();
    context.moveTo(centerX, centerY - item.height * 0.27);
    context.lineTo(centerX + item.width * 0.12, centerY + item.height * 0.04);
    context.lineTo(centerX, centerY);
    context.fill();
    context.fillStyle = "#f7fbff";
    context.beginPath();
    context.moveTo(centerX, centerY + item.height * 0.27);
    context.lineTo(centerX - item.width * 0.12, centerY - item.height * 0.04);
    context.lineTo(centerX, centerY);
    context.fill();
  }

  if (app.icon === "vscode") {
    const gradient = context.createLinearGradient(item.x, item.y, item.x + item.width, item.y + item.height);
    gradient.addColorStop(0, "#1594e8");
    gradient.addColorStop(1, "#0574d1");
    context.fillStyle = gradient;
    context.fillRect(item.x, item.y, item.width, item.height);
    context.fillStyle = "#d9f4ff";
    context.beginPath();
    context.moveTo(item.x + item.width * 0.24, centerY);
    context.lineTo(item.x + item.width * 0.46, item.y + item.height * 0.25);
    context.lineTo(item.x + item.width * 0.77, item.y + item.height * 0.12);
    context.lineTo(item.x + item.width * 0.77, item.y + item.height * 0.88);
    context.lineTo(item.x + item.width * 0.46, item.y + item.height * 0.75);
    context.closePath();
    context.fill();
    context.fillStyle = "#0879d6";
    context.beginPath();
    context.moveTo(item.x + item.width * 0.37, centerY);
    context.lineTo(item.x + item.width * 0.54, item.y + item.height * 0.36);
    context.lineTo(item.x + item.width * 0.54, item.y + item.height * 0.64);
    context.closePath();
    context.fill();
  }

  if (app.icon === "codex") {
    const gradient = context.createLinearGradient(item.x, item.y, item.x + item.width, item.y + item.height);
    gradient.addColorStop(0, "#261c67");
    gradient.addColorStop(1, "#6255cd");
    context.fillStyle = gradient;
    context.fillRect(item.x, item.y, item.width, item.height);
    context.strokeStyle = "#f7f6ff";
    context.lineWidth = item.width * 0.09;
    for (let index = 0; index < 6; index += 1) {
      context.beginPath();
      context.arc(
        centerX + Math.cos((Math.PI * 2 * index) / 6) * item.width * 0.15,
        centerY + Math.sin((Math.PI * 2 * index) / 6) * item.height * 0.15,
        item.width * 0.19,
        ((Math.PI * 2 * index) / 6) + Math.PI * 0.15,
        ((Math.PI * 2 * index) / 6) + Math.PI * 0.85,
      );
      context.stroke();
    }
  }

  if (app.icon === "gaming") {
    const gradient = context.createLinearGradient(item.x, item.y, item.x, item.y + item.height);
    gradient.addColorStop(0, "#f9fbff");
    gradient.addColorStop(1, "#e4eaf1");
    context.fillStyle = gradient;
    context.fillRect(item.x, item.y, item.width, item.height);
    const circles = [
      [0.38, 0.37, "#4fc6fc"],
      [0.62, 0.37, "#ffd24e"],
      [0.38, 0.62, "#f15baf"],
      [0.62, 0.62, "#7567e5"],
    ] as const;
    context.globalAlpha = 0.86;
    for (const [x, y, color] of circles) {
      context.fillStyle = color;
      context.beginPath();
      context.arc(item.x + item.width * x, item.y + item.height * y, item.width * 0.22, 0, Math.PI * 2);
      context.fill();
    }
  }

  if (app.icon === "notes") {
    context.fillStyle = "#fcfcfb";
    context.fillRect(item.x, item.y, item.width, item.height);
    context.fillStyle = "#f6c744";
    context.fillRect(item.x, item.y, item.width, item.height * 0.24);
    context.strokeStyle = "#c8cdd2";
    context.lineWidth = item.width * 0.03;
    for (let index = 0; index < 4; index += 1) {
      const y = item.y + item.height * (0.43 + index * 0.13);
      context.beginPath();
      context.moveTo(item.x + item.width * 0.18, y);
      context.lineTo(item.x + item.width * 0.82, y);
      context.stroke();
    }
  }

  if (app.icon === "music") {
    const gradient = context.createLinearGradient(item.x, item.y, item.x + item.width, item.y + item.height);
    gradient.addColorStop(0, "#fd6f8b");
    gradient.addColorStop(1, "#e62f57");
    context.fillStyle = gradient;
    context.fillRect(item.x, item.y, item.width, item.height);
    context.fillStyle = "#ffffff";
    context.beginPath();
    context.arc(item.x + item.width * 0.38, item.y + item.height * 0.7, item.width * 0.13, 0, Math.PI * 2);
    context.arc(item.x + item.width * 0.66, item.y + item.height * 0.61, item.width * 0.13, 0, Math.PI * 2);
    context.fill();
    context.fillRect(item.x + item.width * 0.5, item.y + item.height * 0.23, item.width * 0.09, item.height * 0.42);
    context.fillRect(item.x + item.width * 0.58, item.y + item.height * 0.23, item.width * 0.2, item.height * 0.08);
    context.fillRect(item.x + item.width * 0.69, item.y + item.height * 0.3, item.width * 0.09, item.height * 0.26);
  }

  if (app.icon === "mail") {
    const gradient = context.createLinearGradient(item.x, item.y, item.x, item.y + item.height);
    gradient.addColorStop(0, "#59c5ff");
    gradient.addColorStop(1, "#167ee0");
    context.fillStyle = gradient;
    context.fillRect(item.x, item.y, item.width, item.height);
    context.fillStyle = "#f8fcff";
    context.beginPath();
    context.moveTo(item.x + item.width * 0.16, item.y + item.height * 0.27);
    context.lineTo(item.x + item.width * 0.84, item.y + item.height * 0.27);
    context.lineTo(item.x + item.width * 0.84, item.y + item.height * 0.74);
    context.lineTo(item.x + item.width * 0.16, item.y + item.height * 0.74);
    context.closePath();
    context.fill();
    context.strokeStyle = "#5ea6e7";
    context.lineWidth = item.width * 0.035;
    context.beginPath();
    context.moveTo(item.x + item.width * 0.16, item.y + item.height * 0.3);
    context.lineTo(centerX, item.y + item.height * 0.58);
    context.lineTo(item.x + item.width * 0.84, item.y + item.height * 0.3);
    context.stroke();
  }

  context.restore();
  context.strokeStyle = "rgba(255, 255, 255, 0.34)";
  context.lineWidth = Math.max(1, item.width * 0.032);
  context.beginPath();
  context.roundRect(item.x, item.y, item.width, item.height, radius);
  context.stroke();
}

function drawDockRunningIndicator(
  context: CanvasRenderingContext2D,
  layout: ReturnType<typeof getDockLayout>,
  item: ReturnType<typeof getDockItemBounds>,
) {
  context.save();
  context.fillStyle = "rgba(232, 232, 234, 0.88)";
  context.beginPath();
  context.arc(
    item.x + item.width / 2,
    layout.y + layout.height * (1 - CONFIG.workstation.DOCK_RUNNING_DOT_BOTTOM_MULT),
    layout.height * CONFIG.workstation.DOCK_RUNNING_DOT_RADIUS_MULT,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.restore();
}

function drawDock(
  context: CanvasRenderingContext2D,
  layout: ReturnType<typeof getDockLayout>,
  scales: number[],
  x: number,
  width: number,
  hoveredIndex: number | null,
  activeScale: number,
) {
  const { y, height } = layout;
  const radius = height * 0.27;

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

  for (let index = 0; index < DOCK_APPS.length; index += 1) {
    const item = getDockItemBounds(layout, scales, x, index);
    drawDockAppIcon(context, DOCK_APPS[index], item);

    if (DOCK_APPS[index].isRunning) {
      drawDockRunningIndicator(context, layout, item);
    }
  }

  context.restore();

  if (hoveredIndex !== null) {
    drawDockTooltip(context, layout, scales, x, hoveredIndex, activeScale);
  }
}

export type DockRenderer = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  layout: ReturnType<typeof getDockLayout>;
  scales: number[];
  x: number;
  width: number;
  anchor: "left" | "right" | null;
  leftAnchor: number;
  rightAnchor: number;
  isHovering: boolean;
  entrySettled: boolean;
  smoothedPointerX: number | null;
  hoveredIndex: number | null;
};

function redrawDockRenderer(renderer: DockRenderer, activeScale: number) {
  const { canvas, context, layout } = renderer;
  context.clearRect(0, 0, canvas.width, canvas.height);
  drawDock(
    context,
    layout,
    renderer.scales,
    renderer.x,
    renderer.width,
    renderer.hoveredIndex,
    activeScale,
  );
  renderer.texture.needsUpdate = true;
}

export function setDockAppRunning(
  renderer: DockRenderer,
  appId: string,
  activeScale: number,
) {
  const app = DOCK_APPS.find((candidate) => candidate.id === appId);
  if (!app || app.isRunning) return;
  app.isRunning = true;
  redrawDockRenderer(renderer, activeScale);
}

function getDockTarget(
  layout: ReturnType<typeof getDockLayout>,
  magnification: number,
  pointerX: number | null,
  anchor: DockRenderer["anchor"],
  leftAnchor: number,
  rightAnchor: number,
) {
  const { itemGap, itemSize } = layout;
  const count = DOCK_APPS.length;
  const radius = itemSize * CONFIG.workstation.DOCK_MAGNIFICATION_RADIUS_MULT;

  if (pointerX === null || magnification === 0) {
    return {
      scales: Array.from({ length: count }, () => 1),
      x: layout.x,
      width: layout.width,
    };
  }

  const influence = (index: number) => {
    const center = layout.itemX + index * (itemSize + itemGap) + itemSize / 2;
    return THREE.MathUtils.clamp(1 - Math.abs(pointerX - center) / radius, 0, 1) ** 2;
  };
  const activeIndex = THREE.MathUtils.clamp(
    Math.round((pointerX - layout.itemX - itemSize / 2) / (itemSize + itemGap)),
    0,
    count - 1,
  );
  const virtualRange = Math.ceil(radius / (itemSize + itemGap)) + 1;
  let neighborInfluence = 0;

  for (let index = -virtualRange; index < count + virtualRange; index += 1) {
    if (index !== activeIndex) {
      neighborInfluence += influence(index);
    }
  }

  const activeExtraScale = magnification;
  const neighborExtraScale =
    (magnification * CONFIG.workstation.DOCK_MAGNIFICATION_TOTAL_MULT -
      activeExtraScale) /
    Math.max(neighborInfluence, 0.0001);
  const scales = Array.from(
    { length: count },
    (_, index) =>
      index === activeIndex
        ? 1 + activeExtraScale
        : 1 + influence(index) * neighborExtraScale,
  );
  const width =
    scales.reduce((total, scale) => total + itemSize * scale, 0) +
    itemGap * (count - 1) +
    layout.height * 0.32;
  const x =
    anchor === "right"
      ? rightAnchor - width
      : anchor === "left"
        ? leftAnchor
        : layout.centerX - width / 2;

  return { scales, x, width };
}

export function updateDockRenderer(
  renderer: DockRenderer,
  magnification: number,
  pointerX: number | null,
  showTooltip: boolean,
  delta: number,
) {
  let changed = false;

  if (pointerX === null) {
    changed = renderer.hoveredIndex !== null;
    renderer.anchor = null;
    renderer.leftAnchor = renderer.layout.x;
    renderer.rightAnchor = renderer.layout.x + renderer.layout.width;
    renderer.isHovering = false;
    renderer.entrySettled = false;
    renderer.smoothedPointerX = null;
    renderer.hoveredIndex = null;
  } else {
    renderer.isHovering = true;
    if (renderer.smoothedPointerX === null) {
      renderer.smoothedPointerX = pointerX;
    }

    const pointerAmount = 1 - Math.exp(-delta / 0.045);
    renderer.smoothedPointerX = THREE.MathUtils.lerp(
      renderer.smoothedPointerX,
      pointerX,
      pointerAmount,
    );

    if (renderer.entrySettled) {
      const nextAnchor =
        renderer.smoothedPointerX < renderer.layout.centerX ? "right" : "left";

      if (nextAnchor !== renderer.anchor) {
        if (nextAnchor === "right") {
          renderer.rightAnchor = renderer.x + renderer.width;
        } else {
          renderer.leftAnchor = renderer.x;
        }
        renderer.anchor = nextAnchor;
      }
    }
  }

  const scalePointerX =
    pointerX === null
      ? null
      : renderer.entrySettled
        ? renderer.smoothedPointerX
        : pointerX;
  const pointerTarget = getDockTarget(
    renderer.layout,
    magnification,
    scalePointerX,
    renderer.anchor,
    renderer.leftAnchor,
    renderer.rightAnchor,
  );
  const target = pointerTarget;
  const amount = 1 - Math.exp(-CONFIG.workstation.DOCK_MAGNIFICATION_RESPONSE * delta);

  for (let index = 0; index < renderer.scales.length; index += 1) {
    const next = THREE.MathUtils.lerp(
      renderer.scales[index],
      target.scales[index],
      amount,
    );
    changed ||= Math.abs(next - renderer.scales[index]) > 0.0001;
    renderer.scales[index] = next;
  }

  const nextX = THREE.MathUtils.lerp(renderer.x, target.x, amount);
  const nextWidth = THREE.MathUtils.lerp(renderer.width, target.width, amount);
  changed ||=
    Math.abs(nextX - renderer.x) > 0.01 ||
    Math.abs(nextWidth - renderer.width) > 0.01;
  renderer.x = nextX;
  renderer.width = nextWidth;

  if (
    pointerX !== null &&
    !renderer.entrySettled &&
    Math.abs(renderer.width - target.width) < 0.5
  ) {
    const nextAnchor =
      pointerX < renderer.layout.centerX ? "right" : "left";

    if (nextAnchor === "right") {
      renderer.rightAnchor = renderer.x + renderer.width;
    } else {
      renderer.leftAnchor = renderer.x;
    }
    renderer.anchor = nextAnchor;
    renderer.entrySettled = true;
  }

  const hoveredIndex =
    showTooltip && pointerX !== null
      ? getDockHoveredIndex(renderer.layout, renderer.scales, renderer.x, pointerX)
      : null;
  changed ||= hoveredIndex !== renderer.hoveredIndex;
  renderer.hoveredIndex = hoveredIndex;

  if (!changed) return;

  redrawDockRenderer(renderer, 1 + magnification);
}

export function createBrowserChromeTexture({
  sourceWidth,
  sourceHeight,
  tuning,
}: {
  sourceWidth: number;
  sourceHeight: number;
  tuning: DesktopTuning;
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

  const layout = getBrowserLayout(
    textureWidth,
    textureHeight,
    sourceWidth,
    sourceHeight,
    tuning,
  );
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

  textureContext.fillStyle = CONFIG.workstation.BROWSER_BAR_COLOR;
  textureContext.fillRect(browserX, browserY, browserWidth, chromeHeight);
  textureContext.clearRect(
    browserX,
    browserY + chromeHeight,
    browserWidth,
    contentHeight,
  );

  const controlRadius =
    chromeHeight *
    CONFIG.workstation.BROWSER_CONTROL_RADIUS_MULT *
    tuning.safariControlsScale;
  const sidePadding =
    chromeHeight * CONFIG.workstation.BROWSER_SIDE_PADDING_MULT;
  const controlGap =
    chromeHeight *
    CONFIG.workstation.BROWSER_CONTROL_GAP_MULT *
    tuning.safariControlsScale;
  const controlY = browserY + chromeHeight / 2;
  const firstControlX = browserX + sidePadding;

  CONFIG.workstation.BROWSER_LIGHTS.forEach((color, index) => {
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
    CONFIG.workstation.BROWSER_ADDRESS_HEIGHT_MULT *
    tuning.safariAddressScale;
  const addressWidth =
    browserWidth *
    CONFIG.workstation.BROWSER_ADDRESS_WIDTH_MULT *
    tuning.safariAddressScale;
  textureContext.fillStyle = CONFIG.workstation.BROWSER_ADDRESS_COLOR;
  textureContext.fillRect(
    browserX + (browserWidth - addressWidth) / 2,
    controlY - addressHeight / 2,
    addressWidth,
    addressHeight,
  );
  textureContext.fillStyle = CONFIG.workstation.BROWSER_ICON_COLOR;
  textureContext.font = `400 ${
    chromeHeight * CONFIG.workstation.BROWSER_ADDRESS_FONT_MULT
      * tuning.safariAddressScale
  }px Arial`;
  textureContext.textAlign = "center";
  textureContext.textBaseline = "middle";
  textureContext.fillText("folio-2026", browserX + browserWidth / 2, controlY);
  textureContext.restore();

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

export function createDockRenderer({
  sourceWidth,
  sourceHeight,
  tuning,
}: {
  sourceWidth: number;
  sourceHeight: number;
  tuning: DesktopTuning;
}) {
  const { width, height } = getTextureDimensions(sourceWidth, sourceHeight);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) return null;

  canvas.width = width;
  canvas.height = height;
  const layout = getDockLayout(width, height, tuning);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  const renderer: DockRenderer = {
    canvas,
    context,
    texture,
    layout,
    scales: Array.from({ length: DOCK_APPS.length }, () => 1),
    x: layout.x,
    width: layout.width,
    anchor: null,
    leftAnchor: layout.x,
    rightAnchor: layout.x + layout.width,
    isHovering: false,
    entrySettled: false,
    smoothedPointerX: null,
    hoveredIndex: null,
  };

  drawDock(context, layout, renderer.scales, renderer.x, renderer.width, null, 1);
  return renderer;
}

export type ToolbarRenderer = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  layout: ReturnType<typeof getToolbarLayout>;
  menuType: "actions" | "go" | null;
  hoveredMenuItem: number | null;
  timestamp: string;
};

function formatToolbarTimestamp(date: Date) {
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  return `${weekdays[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${String(
    date.getHours(),
  ).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function getToolbarLayout(
  textureWidth: number,
  context: CanvasRenderingContext2D,
) {
  const height = textureWidth * 0.0167;
  const fontSize = height * 0.62;
  const leftPadding = height * 0.78;
  const itemGap = height * 0.72;
  context.font = `300 ${fontSize}px Arial`;
  const brandWidth = context.measureText("NM").width;
  const appX = leftPadding + brandWidth + itemGap;
  context.font = `600 ${fontSize}px Arial`;
  const appWidth = context.measureText("Folio-2026").width;
  const actionsX = appX + appWidth + itemGap;
  context.font = `400 ${fontSize}px Arial`;
  const actionsWidth = context.measureText("Actions").width + height * 0.58;
  const goX = actionsX + actionsWidth + itemGap;
  const goWidth = context.measureText("Go").width + height * 0.58;
  const menuY = height + height * 0.16;
  const menuWidth = height * 7.4;
  const menuPadding = height * 0.28;
  const menuItemHeight = height * 1.08;

  return {
    height,
    fontSize,
    leftPadding,
    itemGap,
    appX,
    actionsX,
    actionsWidth,
    goX,
    goWidth,
    menuY,
    menuWidth,
    menuPadding,
    menuItemHeight,
  };
}

function getToolbarMenuItems(menuType: "actions" | "go") {
  return menuType === "actions"
    ? ["Go to Top", "Toggle Theme", "Close Folio-2026"]
    : DOCK_APPS.map((app) => app.label);
}

function getToolbarMenuBounds(
  layout: ReturnType<typeof getToolbarLayout>,
  menuType: "actions" | "go",
) {
  const menuX =
    (menuType === "actions" ? layout.actionsX : layout.goX) -
    layout.height * 0.34;
  const itemCount = getToolbarMenuItems(menuType).length;

  return {
    x: menuX,
    y: layout.menuY,
    width: layout.menuWidth,
    height: layout.menuPadding * 2 + layout.menuItemHeight * itemCount,
  };
}

export function getToolbarHit(
  layout: ReturnType<typeof getToolbarLayout>,
  menuType: ToolbarRenderer["menuType"],
  x: number,
  y: number,
) {
  if (
    x >= layout.actionsX - layout.height * 0.18 &&
    x <= layout.actionsX + layout.actionsWidth + layout.height * 0.18 &&
    y >= 0 &&
    y <= layout.height * 1.5
  ) {
    return { type: "actions" as const };
  }

  if (
    x >= layout.goX - layout.height * 0.18 &&
    x <= layout.goX + layout.goWidth + layout.height * 0.18 &&
    y >= 0 &&
    y <= layout.height * 1.5
  ) {
    return { type: "go" as const };
  }

  if (!menuType) return null;

  const menu = getToolbarMenuBounds(layout, menuType);
  const menuItemCount = getToolbarMenuItems(menuType).length;

  if (
    x < menu.x ||
    x > menu.x + menu.width ||
    y < menu.y + layout.menuPadding ||
    y > menu.y + menu.height - layout.menuPadding
  ) {
    return null;
  }

  const itemIndex = Math.floor(
    (y - menu.y - layout.menuPadding) / layout.menuItemHeight,
  );

  return itemIndex >= 0 && itemIndex < menuItemCount
    ? { type: "menu-item" as const, index: itemIndex }
    : null;
}

function drawToolbarMenu(
  context: CanvasRenderingContext2D,
  renderer: ToolbarRenderer,
) {
  const { layout, menuType } = renderer;
  if (!menuType) return;

  const menu = getToolbarMenuBounds(layout, menuType);
  const labels = getToolbarMenuItems(menuType);
  const radius = layout.height * 0.22;

  context.save();
  context.shadowColor = "rgba(0, 0, 0, 0.5)";
  context.shadowBlur = layout.height * 0.22;
  context.shadowOffsetY = layout.height * 0.1;
  context.fillStyle = "rgba(65, 67, 62, 0.96)";
  context.strokeStyle = "rgba(0, 0, 0, 0.9)";
  context.lineWidth = Math.max(1, layout.height * 0.035);
  context.beginPath();
  context.roundRect(
    menu.x,
    menu.y,
    menu.width,
    menu.height,
    radius,
  );
  context.fill();
  context.stroke();
  context.shadowColor = "transparent";

  context.font = `400 ${layout.fontSize}px Arial`;
  context.textAlign = "left";
  context.textBaseline = "middle";

  for (let index = 0; index < labels.length; index += 1) {
    const itemY = menu.y + layout.menuPadding + index * layout.menuItemHeight;

    if (renderer.hoveredMenuItem === index) {
      context.fillStyle = "rgba(255, 255, 255, 0.14)";
      context.beginPath();
      context.roundRect(
        menu.x + layout.height * 0.12,
        itemY,
        menu.width - layout.height * 0.24,
        layout.menuItemHeight,
        layout.height * 0.12,
      );
      context.fill();
    }

    context.fillStyle = "#f4f4f6";
    const iconSize = layout.menuItemHeight * 0.58;
    const labelX =
      menu.x + layout.height * 0.46 + (menuType === "go" ? iconSize + layout.height * 0.26 : 0);

    if (menuType === "go") {
      drawDockAppIcon(context, DOCK_APPS[index], {
        x: menu.x + layout.height * 0.34,
        y: itemY + (layout.menuItemHeight - iconSize) / 2,
        width: iconSize,
        height: iconSize,
      });
    }

    context.fillText(
      labels[index],
      labelX,
      itemY + layout.menuItemHeight / 2,
    );
  }

  context.restore();
}

export function drawToolbar(renderer: ToolbarRenderer) {
  const { canvas, context, layout } = renderer;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#3d4038";
  context.fillRect(0, 0, canvas.width, layout.height);
  context.fillStyle = "rgba(255, 255, 255, 0.11)";
  context.fillRect(0, layout.height - Math.max(1, layout.height * 0.045), canvas.width, 1);

  context.textBaseline = "middle";
  context.fillStyle = "#f4f4f5";
  context.font = `300 ${layout.fontSize}px Arial`;
  context.textAlign = "left";
  context.fillText("NM", layout.leftPadding, layout.height / 2 + layout.fontSize * 0.03);
  context.font = `600 ${layout.fontSize}px Arial`;
  context.fillText("Folio-2026", layout.appX, layout.height / 2 + layout.fontSize * 0.03);
  context.font = `400 ${layout.fontSize}px Arial`;
  context.fillText("Actions", layout.actionsX, layout.height / 2 + layout.fontSize * 0.03);
  context.fillText("Go", layout.goX, layout.height / 2 + layout.fontSize * 0.03);

  const batteryWidth = layout.height * 0.72;
  const batteryHeight = layout.height * 0.4;
  const dateX = canvas.width - layout.leftPadding;
  context.textAlign = "right";
  context.fillText(renderer.timestamp, dateX, layout.height / 2 + layout.fontSize * 0.03);
  const batteryX =
    dateX - context.measureText(renderer.timestamp).width - layout.itemGap - batteryWidth;
  const batteryY = (layout.height - batteryHeight) / 2;
  const batteryRadius = batteryHeight * 0.22;
  context.fillStyle = "rgba(34, 37, 34, 0.92)";
  context.beginPath();
  context.roundRect(batteryX, batteryY, batteryWidth, batteryHeight, batteryRadius);
  context.fill();
  context.strokeStyle = "rgba(236, 239, 238, 0.72)";
  context.lineWidth = Math.max(1, layout.height * 0.045);
  context.stroke();
  context.fillStyle = "#f4f4f5";
  context.fillRect(
    batteryX + batteryWidth,
    (layout.height - batteryHeight * 0.4) / 2,
    batteryWidth * 0.13,
    batteryHeight * 0.4,
  );
  context.beginPath();
  context.roundRect(
    batteryX + layout.height * 0.09,
    batteryY + layout.height * 0.09,
    batteryWidth * 0.23,
    batteryHeight - layout.height * 0.18,
    batteryHeight * 0.1,
  );
  context.fill();

  if (renderer.menuType) {
    drawToolbarMenu(context, renderer);
  }

  renderer.texture.needsUpdate = true;
}

export function updateToolbarRenderer(
  renderer: ToolbarRenderer,
  pointerX: number | null,
  pointerY: number | null,
) {
  const timestamp = formatToolbarTimestamp(new Date());
  const hit =
    renderer.menuType && pointerX !== null && pointerY !== null
      ? getToolbarHit(renderer.layout, renderer.menuType, pointerX, pointerY)
      : null;
  const hoveredMenuItem = hit?.type === "menu-item" ? hit.index : null;

  if (
    renderer.timestamp === timestamp &&
    renderer.hoveredMenuItem === hoveredMenuItem
  ) {
    return;
  }

  renderer.timestamp = timestamp;
  renderer.hoveredMenuItem = hoveredMenuItem;
  drawToolbar(renderer);
}

export function createToolbarRenderer({
  sourceWidth,
  sourceHeight,
}: {
  sourceWidth: number;
  sourceHeight: number;
}) {
  const { width, height } = getTextureDimensions(sourceWidth, sourceHeight);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) return null;

  canvas.width = width;
  canvas.height = height;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  const renderer: ToolbarRenderer = {
    canvas,
    context,
    texture,
    layout: getToolbarLayout(width, context),
    menuType: null,
    hoveredMenuItem: null,
    timestamp: formatToolbarTimestamp(new Date()),
  };

  drawToolbar(renderer);
  return renderer;
}

export function createPageMask(
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
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export function setHtmlOverlayVisibility(
  container: HTMLElement | null,
  canvas: HTMLCanvasElement,
  hidden: boolean,
) {
  if (!container) return;

  for (const child of container.children) {
    if (child instanceof HTMLElement && !child.contains(canvas)) {
      child.classList.toggle("workstation-html-overlay-hidden", hidden);
    }
  }
}

export function affordableAberrationTaps(width: number, height: number) {
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

const GENIE_VERTEX_DEFORMATION = `
uniform float u_genieProgress;
uniform vec4 u_genieWindow;
uniform vec3 u_genieTarget;

vec3 applyGenie(vec3 sourcePosition) {
  float windowY = clamp(
    (sourcePosition.y - (u_genieWindow.y - u_genieWindow.w * 0.5)) /
      u_genieWindow.w,
    0.0,
    1.0
  );
  float pull = smoothstep(
    0.0,
    1.0,
    clamp(
      u_genieProgress * (1.0 + ${CONFIG.workstation.GENIE_ROW_STAGGER.toFixed(2)}) -
        windowY * ${CONFIG.workstation.GENIE_ROW_STAGGER.toFixed(2)},
      0.0,
      1.0
    )
  );
  vec2 relativePosition = sourcePosition.xy - u_genieWindow.xy;
  vec2 minimizedPosition = u_genieTarget.xy + relativePosition * u_genieTarget.z;
  float waist = 1.0 - sin(pull * 3.14159265) * (1.0 - windowY) * 0.16;
  vec3 result = sourcePosition;
  result.x = mix(sourcePosition.x, minimizedPosition.x, pull);
  result.x = u_genieTarget.x + (result.x - u_genieTarget.x) * waist;
  result.y = mix(sourcePosition.y, minimizedPosition.y, pull);
  return result;
}
`;

const PAGE_ABERRATION_VERTEX_SHADER = `
varying vec2 vUv;
${GENIE_VERTEX_DEFORMATION}

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(applyGenie(position), 1.0);
}
`;

export function createPageAberrationMaterial(taps: number, genie: GenieUniforms) {
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
      u_genieProgress: genie.progress,
      u_genieWindow: genie.window,
      u_genieTarget: genie.target,
      u_windowOpacity: genie.opacity,
    },
    vertexShader: PAGE_ABERRATION_VERTEX_SHADER,
    fragmentShader: `
uniform sampler2D u_pageTexture;
uniform sampler2D u_pageMask;
uniform vec4 u_pageBounds;
uniform float u_windowOpacity;
varying vec2 vUv;

${buildCustomAberrationProgram(taps)}

vec4 inputSample(vec2 uv) {
  return texture2D(u_pageTexture, clamp(uv, vec2(0.002), vec2(0.998)));
}

void main() {
  if (texture2D(u_pageMask, vUv).r < 0.5) discard;
  vec2 pageUv = (vUv - u_pageBounds.xy) / u_pageBounds.zw;
  gl_FragColor = applyCustomAberration(pageUv);
  gl_FragColor.a *= u_windowOpacity;
}
`,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
}

export function createWindowChromeMaterial(genie: GenieUniforms) {
  return new THREE.ShaderMaterial({
    uniforms: {
      u_texture: { value: null },
      u_genieProgress: genie.progress,
      u_genieWindow: genie.window,
      u_genieTarget: genie.target,
      u_windowOpacity: genie.opacity,
    },
    vertexShader: `
varying vec2 vUv;
${GENIE_VERTEX_DEFORMATION}

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(applyGenie(position), 1.0);
}
`,
    fragmentShader: `
uniform sampler2D u_texture;
uniform float u_windowOpacity;
varying vec2 vUv;

void main() {
  vec4 color = texture2D(u_texture, vUv);
  if (color.a < 0.001) discard;
  gl_FragColor = vec4(color.rgb, color.a * u_windowOpacity);
}
`,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
}

export type PageUvBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function configurePageAberrationMaterial(
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

export function isThemeToggleHit({
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
