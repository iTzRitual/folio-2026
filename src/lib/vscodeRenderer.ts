import * as THREE from "three";
import { CONFIG } from "@/config/constants";

export type SourceFile = {
  path: string;
  content: string;
};

export type SourceManifest = {
  files: SourceFile[];
};

export type EditorWindowLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
  chromeHeight: number;
};

type TreeNode = {
  name: string;
  path: string;
  type: "folder" | "file";
  children: TreeNode[];
  file: SourceFile | null;
};

type TreeRow = {
  node: TreeNode;
  depth: number;
};

type EditorMetrics = {
  contentTop: number;
  contentBottom: number;
  sidebarX: number;
  sidebarWidth: number;
  panelHeaderHeight: number;
  treeTop: number;
  treeBottom: number;
  treePadding: number;
  treeFontSize: number;
  treeRowHeight: number;
  editorX: number;
  editorWidth: number;
  tabHeight: number;
  breadcrumbHeight: number;
  codeTop: number;
  codeBottom: number;
  codeFontSize: number;
  codeLineHeight: number;
  lineNumberWidth: number;
  codePadding: number;
};

export type VSCodeRenderer = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  layout: EditorWindowLayout;
  controlsScale: number;
  root: TreeNode;
  expanded: Set<string>;
  rows: TreeRow[];
  selectedPath: string | null;
  hoveredPath: string | null;
  treeScroll: number;
  editorScrollY: number;
  editorScrollX: number;
  loadState: "loading" | "ready" | "error";
};

const keywordPattern = /^(?:as|async|await|break|case|catch|class|const|continue|default|delete|do|else|export|extends|false|finally|for|from|function|if|implements|import|in|instanceof|interface|let|new|null|of|private|protected|public|return|static|super|switch|throw|true|try|type|typeof|undefined|var|void|while|with|yield)$/;
const typePattern = /^(?:Array|Record|Promise|ReactNode|string|number|boolean|unknown|never|void|HTMLElement|HTMLCanvasElement|CanvasRenderingContext2D)$/;
const tokenPattern = /(\/\/.*$|\/\*.*?\*\/|<!--.*?-->|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b[A-Za-z_$][\w$]*\b|\b\d+(?:\.\d+)?\b)/g;
const sourceManifestUrl = "/source-manifest.json";
let sourceManifestPromise: Promise<SourceManifest> | null = null;

function createRoot(): TreeNode {
  return {
    name: "folio-2026",
    path: "",
    type: "folder",
    children: [],
    file: null,
  };
}

function sortTree(node: TreeNode) {
  node.children.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  node.children.forEach(sortTree);
}

function buildTree(files: SourceFile[]) {
  const root = createRoot();

  for (const file of files) {
    const parts = file.path.split("/");
    let current = root;

    for (let index = 0; index < parts.length; index += 1) {
      const name = parts[index];
      const nodePath = parts.slice(0, index + 1).join("/");
      const isFile = index === parts.length - 1;
      let child = current.children.find((node) => node.name === name);

      if (!child) {
        child = {
          name,
          path: nodePath,
          type: isFile ? "file" : "folder",
          children: [],
          file: isFile ? file : null,
        };
        current.children.push(child);
      }

      current = child;
    }
  }

  sortTree(root);
  return root;
}

function flattenTree(root: TreeNode, expanded: Set<string>) {
  const rows: TreeRow[] = [];

  const visit = (node: TreeNode, depth: number) => {
    rows.push({ node, depth });

    if (node.type === "folder" && expanded.has(node.path)) {
      node.children.forEach((child) => visit(child, depth + 1));
    }
  };

  root.children.forEach((child) => visit(child, 0));
  return rows;
}

function findFile(root: TreeNode, path: string): TreeNode | null {
  for (const child of root.children) {
    if (child.path === path) return child;
    const match = findFile(child, path);
    if (match) return match;
  }

  return null;
}

function getMetrics(renderer: VSCodeRenderer): EditorMetrics {
  const { layout } = renderer;
  const contentTop = layout.y + layout.chromeHeight;
  const contentBottom = layout.y + layout.height;
  const sidebarWidth = THREE.MathUtils.clamp(
    layout.width * 0.29,
    layout.chromeHeight * 6.8,
    layout.width * 0.36,
  );
  const panelHeaderHeight = layout.chromeHeight * 1.28;
  const treeFontSize = Math.max(12, layout.chromeHeight * 0.245);
  const treeRowHeight = Math.max(treeFontSize * 1.72, layout.chromeHeight * 0.46);
  const editorX = layout.x + sidebarWidth;
  const tabHeight = layout.chromeHeight * 0.76;
  const breadcrumbHeight = layout.chromeHeight * 0.58;
  const codeFontSize = Math.max(11, layout.chromeHeight * 0.225);
  const codeLineHeight = codeFontSize * 1.55;

  return {
    contentTop,
    contentBottom,
    sidebarX: layout.x,
    sidebarWidth,
    panelHeaderHeight,
    treeTop: contentTop + panelHeaderHeight,
    treeBottom: contentBottom,
    treePadding: layout.chromeHeight * 0.28,
    treeFontSize,
    treeRowHeight,
    editorX,
    editorWidth: layout.width - sidebarWidth,
    tabHeight,
    breadcrumbHeight,
    codeTop: contentTop + tabHeight + breadcrumbHeight,
    codeBottom: contentBottom,
    codeFontSize,
    codeLineHeight,
    lineNumberWidth: layout.chromeHeight * 1.2,
    codePadding: layout.chromeHeight * 0.32,
  };
}

function markTexture(renderer: VSCodeRenderer) {
  renderer.texture.needsUpdate = true;
}

function fitText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  if (context.measureText(text).width <= maxWidth) return text;

  let low = 0;
  let high = text.length;

  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    const candidate = `${text.slice(0, middle)}…`;

    if (context.measureText(candidate).width <= maxWidth) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }

  return `${text.slice(0, low)}…`;
}

function fileColor(name: string) {
  const extension = name.split(".").pop()?.toLowerCase();

  if (extension === "tsx") return "#4ec9b0";
  if (extension === "ts") return "#519aba";
  if (extension === "css") return "#c586c0";
  if (extension === "json") return "#dcdcaa";
  if (extension === "md") return "#75beff";
  if (extension === "svg") return "#d7ba7d";
  if (extension === "mjs" || extension === "js") return "#e8d44d";
  return "#9da2a6";
}

function drawTrafficLights(renderer: VSCodeRenderer) {
  const { context, layout, controlsScale } = renderer;
  const radius =
    layout.chromeHeight *
    CONFIG.phase2.BROWSER_CONTROL_RADIUS_MULT *
    controlsScale;
  const sidePadding =
    layout.chromeHeight * CONFIG.phase2.BROWSER_SIDE_PADDING_MULT;
  const gap =
    layout.chromeHeight *
    CONFIG.phase2.BROWSER_CONTROL_GAP_MULT *
    controlsScale;
  const centerY = layout.y + layout.chromeHeight / 2;

  CONFIG.phase2.BROWSER_LIGHTS.forEach((color, index) => {
    context.fillStyle = color;
    context.beginPath();
    context.arc(
      layout.x + sidePadding + index * (radius * 2 + gap),
      centerY,
      radius,
      0,
      Math.PI * 2,
    );
    context.fill();
  });
}

function drawChrome(renderer: VSCodeRenderer) {
  const { context, layout } = renderer;
  context.fillStyle = "#181818";
  context.fillRect(layout.x, layout.y, layout.width, layout.chromeHeight);
  context.fillStyle = "#2a2a2a";
  context.fillRect(
    layout.x,
    layout.y + layout.chromeHeight - Math.max(1, layout.chromeHeight * 0.018),
    layout.width,
    Math.max(1, layout.chromeHeight * 0.018),
  );
  drawTrafficLights(renderer);

  const fontSize = layout.chromeHeight * 0.27;
  context.font = `500 ${fontSize}px Arial`;
  context.fillStyle = "#a6a6a6";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(
    "folio-2026 — Visual Studio Code",
    layout.x + layout.width / 2,
    layout.y + layout.chromeHeight / 2,
  );
}

function drawChevron(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  expanded: boolean,
) {
  context.strokeStyle = "#a7a7a7";
  context.lineWidth = Math.max(1, size * 0.14);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();

  if (expanded) {
    context.moveTo(x - size * 0.38, y - size * 0.18);
    context.lineTo(x, y + size * 0.2);
    context.lineTo(x + size * 0.38, y - size * 0.18);
  } else {
    context.moveTo(x - size * 0.18, y - size * 0.38);
    context.lineTo(x + size * 0.2, y);
    context.lineTo(x - size * 0.18, y + size * 0.38);
  }

  context.stroke();
}

function drawFolder(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) {
  context.strokeStyle = "#c4c4c4";
  context.lineWidth = Math.max(1, size * 0.09);
  context.beginPath();
  context.roundRect(x, y - size * 0.32, size * 0.9, size * 0.64, size * 0.1);
  context.stroke();
}

function drawFileBadge(
  context: CanvasRenderingContext2D,
  node: TreeNode,
  x: number,
  y: number,
  size: number,
) {
  const extension = node.name.includes(".")
    ? node.name.split(".").pop()?.slice(0, 2).toUpperCase()
    : "•";
  context.fillStyle = fileColor(node.name);
  context.font = `700 ${size * 0.58}px Arial`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(extension ?? "•", x + size * 0.42, y);
}

function drawScrollbar(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  height: number,
  visibleAmount: number,
  totalAmount: number,
  scroll: number,
) {
  if (totalAmount <= visibleAmount || totalAmount <= 0) return;

  const thumbHeight = Math.max(height * (visibleAmount / totalAmount), 18);
  const maxScroll = totalAmount - visibleAmount;
  const thumbY = y + (height - thumbHeight) * (scroll / maxScroll);
  context.fillStyle = "rgba(121, 121, 121, 0.38)";
  context.fillRect(x - 3, thumbY, 3, thumbHeight);
}

function clampTreeScroll(renderer: VSCodeRenderer, metrics: EditorMetrics) {
  const visibleRows = (metrics.treeBottom - metrics.treeTop) / metrics.treeRowHeight;
  renderer.treeScroll = THREE.MathUtils.clamp(
    renderer.treeScroll,
    0,
    Math.max(0, renderer.rows.length - visibleRows),
  );
}

function drawSidebar(renderer: VSCodeRenderer, metrics: EditorMetrics) {
  const { context } = renderer;
  const sidebarRight = metrics.sidebarX + metrics.sidebarWidth;
  context.fillStyle = "#181818";
  context.fillRect(
    metrics.sidebarX,
    metrics.contentTop,
    metrics.sidebarWidth,
    metrics.contentBottom - metrics.contentTop,
  );
  context.fillStyle = "#2b2b2b";
  context.fillRect(sidebarRight - 1, metrics.contentTop, 1, metrics.contentBottom - metrics.contentTop);

  const labelX = metrics.sidebarX + metrics.treePadding;
  const labelY = metrics.contentTop + metrics.panelHeaderHeight * 0.32;
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillStyle = "#bbbbbb";
  context.font = `500 ${metrics.treeFontSize * 0.82}px Arial`;
  context.fillText("FILES", labelX, labelY);
  context.fillStyle = "#d7d7d7";
  context.font = `700 ${metrics.treeFontSize * 0.9}px Arial`;
  context.fillText("FOLIO-2026", labelX, labelY + metrics.treeFontSize * 1.55);

  context.save();
  context.beginPath();
  context.rect(
    metrics.sidebarX,
    metrics.treeTop,
    metrics.sidebarWidth,
    metrics.treeBottom - metrics.treeTop,
  );
  context.clip();
  clampTreeScroll(renderer, metrics);
  const firstRow = Math.floor(renderer.treeScroll);
  const rowOffset = (renderer.treeScroll - firstRow) * metrics.treeRowHeight;
  const visibleRows = Math.ceil(
    (metrics.treeBottom - metrics.treeTop) / metrics.treeRowHeight,
  ) + 1;

  for (
    let rowIndex = firstRow;
    rowIndex < Math.min(renderer.rows.length, firstRow + visibleRows);
    rowIndex += 1
  ) {
    const row = renderer.rows[rowIndex];
    const y =
      metrics.treeTop +
      (rowIndex - firstRow) * metrics.treeRowHeight -
      rowOffset;
    const centerY = y + metrics.treeRowHeight / 2;
    const selected = row.node.path === renderer.selectedPath;
    const hovered = row.node.path === renderer.hoveredPath;

    if (selected || hovered) {
      context.fillStyle = selected ? "#37373d" : "#2a2d2e";
      context.fillRect(
        metrics.sidebarX,
        y,
        metrics.sidebarWidth,
        metrics.treeRowHeight,
      );
    }

    const indent = metrics.treePadding + row.depth * metrics.treeFontSize * 1.18;
    const iconSize = metrics.treeFontSize * 0.85;
    const iconX = metrics.sidebarX + indent;

    if (row.node.type === "folder") {
      drawChevron(
        context,
        iconX + iconSize * 0.35,
        centerY,
        iconSize * 0.72,
        renderer.expanded.has(row.node.path),
      );
      drawFolder(
        context,
        iconX + iconSize * 1.05,
        centerY,
        iconSize,
      );
    } else {
      drawFileBadge(context, row.node, iconX + iconSize * 1.02, centerY, iconSize);
    }

    const labelX = iconX + iconSize * 2.15;
    const maxLabelWidth = sidebarRight - labelX - metrics.treePadding;
    context.fillStyle = selected ? "#ffffff" : "#cccccc";
    context.font = `400 ${metrics.treeFontSize}px Arial`;
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.fillText(
      fitText(context, row.node.name, maxLabelWidth),
      labelX,
      centerY,
    );
  }

  context.restore();
  drawScrollbar(
    context,
    sidebarRight,
    metrics.treeTop,
    metrics.treeBottom - metrics.treeTop,
    (metrics.treeBottom - metrics.treeTop) / metrics.treeRowHeight,
    renderer.rows.length,
    renderer.treeScroll,
  );

  if (renderer.loadState !== "ready") {
    context.fillStyle = "#9d9d9d";
    context.font = `400 ${metrics.treeFontSize}px Arial`;
    context.textAlign = "left";
    context.fillText(
      renderer.loadState === "loading"
        ? "Loading project…"
        : "Project files unavailable",
      labelX,
      metrics.treeTop + metrics.treeRowHeight,
    );
  }
}

function tokenColor(token: string) {
  if (token.startsWith("//") || token.startsWith("/*") || token.startsWith("<!--")) {
    return "#6a9955";
  }
  if (token.startsWith('"') || token.startsWith("'") || token.startsWith("`")) {
    return "#ce9178";
  }
  if (/^\d/.test(token)) return "#b5cea8";
  if (keywordPattern.test(token)) return "#c586c0";
  if (typePattern.test(token) || /^[A-Z][A-Za-z0-9_$]*$/.test(token)) {
    return "#4ec9b0";
  }
  return "#d4d4d4";
}

function drawCodeLine(
  context: CanvasRenderingContext2D,
  line: string,
  x: number,
  y: number,
) {
  const expandedLine = line.replaceAll("\t", "  ");
  let cursor = 0;
  let drawX = x;

  for (const match of expandedLine.matchAll(tokenPattern)) {
    const plain = expandedLine.slice(cursor, match.index);
    context.fillStyle = "#d4d4d4";
    context.fillText(plain, drawX, y);
    drawX += context.measureText(plain).width;

    const token = match[0];
    context.fillStyle = tokenColor(token);
    context.fillText(token, drawX, y);
    drawX += context.measureText(token).width;
    cursor = (match.index ?? 0) + token.length;
  }

  const tail = expandedLine.slice(cursor);
  context.fillStyle = "#d4d4d4";
  context.fillText(tail, drawX, y);
}

function clampEditorScroll(
  renderer: VSCodeRenderer,
  metrics: EditorMetrics,
  lines: string[],
) {
  const visibleLines = (metrics.codeBottom - metrics.codeTop) / metrics.codeLineHeight;
  renderer.editorScrollY = THREE.MathUtils.clamp(
    renderer.editorScrollY,
    0,
    Math.max(0, lines.length - visibleLines),
  );
  const longestLine = lines.reduce((longest, line) => Math.max(longest, line.length), 0);
  const estimatedWidth = longestLine * metrics.codeFontSize * 0.61;
  const availableWidth =
    metrics.editorWidth - metrics.lineNumberWidth - metrics.codePadding * 2;
  renderer.editorScrollX = THREE.MathUtils.clamp(
    renderer.editorScrollX,
    0,
    Math.max(0, estimatedWidth - availableWidth),
  );
}

function drawEditor(renderer: VSCodeRenderer, metrics: EditorMetrics) {
  const { context } = renderer;
  context.fillStyle = "#1e1e1e";
  context.fillRect(
    metrics.editorX,
    metrics.contentTop,
    metrics.editorWidth,
    metrics.contentBottom - metrics.contentTop,
  );
  context.fillStyle = "#181818";
  context.fillRect(metrics.editorX, metrics.contentTop, metrics.editorWidth, metrics.tabHeight);
  context.fillStyle = "#2b2b2b";
  context.fillRect(
    metrics.editorX,
    metrics.contentTop + metrics.tabHeight - 1,
    metrics.editorWidth,
    1,
  );

  const selected = renderer.selectedPath
    ? findFile(renderer.root, renderer.selectedPath)
    : null;

  if (!selected?.file) {
    context.fillStyle = "#252526";
    context.font = `600 ${metrics.codeFontSize * 1.2}px Arial`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(
      renderer.loadState === "loading" ? "Loading source files…" : "Select a file",
      metrics.editorX + metrics.editorWidth / 2,
      metrics.contentTop + (metrics.contentBottom - metrics.contentTop) / 2,
    );
    return;
  }

  const tabWidth = Math.min(
    metrics.editorWidth * 0.34,
    Math.max(metrics.tabHeight * 3.4, selected.name.length * metrics.codeFontSize * 0.72),
  );
  context.fillStyle = "#1e1e1e";
  context.fillRect(metrics.editorX, metrics.contentTop, tabWidth, metrics.tabHeight);
  context.fillStyle = "#007acc";
  context.fillRect(metrics.editorX, metrics.contentTop, tabWidth, Math.max(2, metrics.tabHeight * 0.045));
  context.fillStyle = fileColor(selected.name);
  context.beginPath();
  context.arc(
    metrics.editorX + metrics.codePadding,
    metrics.contentTop + metrics.tabHeight / 2,
    metrics.codeFontSize * 0.24,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.fillStyle = "#d7d7d7";
  context.font = `400 ${metrics.codeFontSize}px Arial`;
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillText(
    fitText(
      context,
      selected.name,
      tabWidth - metrics.codePadding * 2.2,
    ),
    metrics.editorX + metrics.codePadding * 1.6,
    metrics.contentTop + metrics.tabHeight / 2,
  );

  context.fillStyle = "#1e1e1e";
  context.fillRect(
    metrics.editorX,
    metrics.contentTop + metrics.tabHeight,
    metrics.editorWidth,
    metrics.breadcrumbHeight,
  );
  context.fillStyle = "#a5a5a5";
  context.font = `400 ${metrics.codeFontSize * 0.9}px Arial`;
  context.fillText(
    selected.path.split("/").join("  ›  "),
    metrics.editorX + metrics.codePadding,
    metrics.contentTop + metrics.tabHeight + metrics.breadcrumbHeight / 2,
  );

  const lines = selected.file.content.replaceAll("\r\n", "\n").split("\n");
  clampEditorScroll(renderer, metrics, lines);
  context.save();
  context.beginPath();
  context.rect(
    metrics.editorX,
    metrics.codeTop,
    metrics.editorWidth,
    metrics.codeBottom - metrics.codeTop,
  );
  context.clip();
  context.fillStyle = "#1e1e1e";
  context.fillRect(
    metrics.editorX,
    metrics.codeTop,
    metrics.editorWidth,
    metrics.codeBottom - metrics.codeTop,
  );
  context.font = `400 ${metrics.codeFontSize}px SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
  context.textBaseline = "middle";
  const firstLine = Math.floor(renderer.editorScrollY);
  const lineOffset = (renderer.editorScrollY - firstLine) * metrics.codeLineHeight;
  const visibleLines = Math.ceil(
    (metrics.codeBottom - metrics.codeTop) / metrics.codeLineHeight,
  ) + 1;
  const codeX =
    metrics.editorX +
    metrics.lineNumberWidth +
    metrics.codePadding -
    renderer.editorScrollX;

  for (
    let lineIndex = firstLine;
    lineIndex < Math.min(lines.length, firstLine + visibleLines);
    lineIndex += 1
  ) {
    const y =
      metrics.codeTop +
      (lineIndex - firstLine) * metrics.codeLineHeight -
      lineOffset +
      metrics.codeLineHeight / 2;
    context.fillStyle = "#858585";
    context.textAlign = "right";
    context.fillText(
      String(lineIndex + 1),
      metrics.editorX + metrics.lineNumberWidth - metrics.codePadding * 0.35,
      y,
    );
    context.textAlign = "left";
    drawCodeLine(context, lines[lineIndex], codeX, y);
  }

  context.restore();
  drawScrollbar(
    context,
    metrics.editorX + metrics.editorWidth,
    metrics.codeTop,
    metrics.codeBottom - metrics.codeTop,
    (metrics.codeBottom - metrics.codeTop) / metrics.codeLineHeight,
    lines.length,
    renderer.editorScrollY,
  );
}

export function drawVSCodeRenderer(renderer: VSCodeRenderer) {
  const { context, canvas, layout } = renderer;
  context.clearRect(0, 0, canvas.width, canvas.height);
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
  drawChrome(renderer);
  const metrics = getMetrics(renderer);
  drawSidebar(renderer, metrics);
  drawEditor(renderer, metrics);
  context.restore();
  context.strokeStyle = "#303030";
  context.lineWidth = Math.max(1, layout.chromeHeight * 0.024);
  context.beginPath();
  context.roundRect(
    layout.x,
    layout.y,
    layout.width,
    layout.height,
    layout.chromeHeight * 0.34,
  );
  context.stroke();
  markTexture(renderer);
}

export function createVSCodeRenderer({
  width,
  height,
  layout,
  controlsScale,
}: {
  width: number;
  height: number;
  layout: EditorWindowLayout;
  controlsScale: number;
}) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) return null;

  canvas.width = width;
  canvas.height = height;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  const renderer: VSCodeRenderer = {
    canvas,
    context,
    texture,
    layout,
    controlsScale,
    root: createRoot(),
    expanded: new Set(["src", "src/app"]),
    rows: [],
    selectedPath: null,
    hoveredPath: null,
    treeScroll: 0,
    editorScrollY: 0,
    editorScrollX: 0,
    loadState: "loading",
  };
  drawVSCodeRenderer(renderer);
  return renderer;
}

export function setVSCodeSources(
  renderer: VSCodeRenderer,
  manifest: SourceManifest,
) {
  renderer.root = buildTree(manifest.files);
  renderer.loadState = "ready";
  const preferredPath = manifest.files.some((file) => file.path === "src/app/page.tsx")
    ? "src/app/page.tsx"
    : manifest.files[0]?.path ?? null;
  renderer.selectedPath = preferredPath;

  if (preferredPath) {
    const parts = preferredPath.split("/");
    for (let index = 1; index < parts.length; index += 1) {
      renderer.expanded.add(parts.slice(0, index).join("/"));
    }
  }

  renderer.rows = flattenTree(renderer.root, renderer.expanded);
  drawVSCodeRenderer(renderer);
}

export function setVSCodeLoadError(renderer: VSCodeRenderer) {
  renderer.loadState = "error";
  drawVSCodeRenderer(renderer);
}

function getTreeRowAt(
  renderer: VSCodeRenderer,
  metrics: EditorMetrics,
  y: number,
) {
  if (y < metrics.treeTop || y > metrics.treeBottom) return null;
  const index = Math.floor(
    renderer.treeScroll + (y - metrics.treeTop) / metrics.treeRowHeight,
  );
  return renderer.rows[index] ?? null;
}

export function updateVSCodeHover(
  renderer: VSCodeRenderer,
  x: number | null,
  y: number | null,
) {
  const metrics = getMetrics(renderer);
  const row =
    x !== null &&
    y !== null &&
    x >= metrics.sidebarX &&
    x <= metrics.sidebarX + metrics.sidebarWidth
      ? getTreeRowAt(renderer, metrics, y)
      : null;
  const hoveredPath = row?.node.path ?? null;

  if (hoveredPath === renderer.hoveredPath) return;
  renderer.hoveredPath = hoveredPath;
  drawVSCodeRenderer(renderer);
}

export function handleVSCodeClick(
  renderer: VSCodeRenderer,
  x: number,
  y: number,
) {
  const metrics = getMetrics(renderer);
  if (x < metrics.sidebarX || x > metrics.sidebarX + metrics.sidebarWidth) {
    return false;
  }

  const row = getTreeRowAt(renderer, metrics, y);
  if (!row) return false;

  if (row.node.type === "folder") {
    if (renderer.expanded.has(row.node.path)) {
      renderer.expanded.delete(row.node.path);
    } else {
      renderer.expanded.add(row.node.path);
    }
    renderer.rows = flattenTree(renderer.root, renderer.expanded);
    clampTreeScroll(renderer, metrics);
  } else {
    renderer.selectedPath = row.node.path;
    renderer.editorScrollY = 0;
    renderer.editorScrollX = 0;
  }

  drawVSCodeRenderer(renderer);
  return true;
}

export function handleVSCodeWheel(
  renderer: VSCodeRenderer,
  x: number,
  y: number,
  deltaX: number,
  deltaY: number,
) {
  const metrics = getMetrics(renderer);
  const insideWindow =
    x >= renderer.layout.x &&
    x <= renderer.layout.x + renderer.layout.width &&
    y >= metrics.contentTop &&
    y <= metrics.contentBottom;

  if (!insideWindow) return false;

  if (x <= metrics.sidebarX + metrics.sidebarWidth) {
    renderer.treeScroll += deltaY / metrics.treeRowHeight;
    clampTreeScroll(renderer, metrics);
  } else {
    renderer.editorScrollY += deltaY / metrics.codeLineHeight;
    renderer.editorScrollX += deltaX;
  }

  drawVSCodeRenderer(renderer);
  return true;
}

export function loadSourceManifest() {
  if (!sourceManifestPromise) {
    sourceManifestPromise = fetch(sourceManifestUrl).then(async (response) => {
      if (!response.ok) throw new Error("Source manifest unavailable");
      const manifest = (await response.json()) as SourceManifest;
      if (!Array.isArray(manifest.files)) throw new Error("Invalid source manifest");
      return manifest;
    });
  }

  return sourceManifestPromise;
}
