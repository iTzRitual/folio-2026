import fs from "node:fs";
import path from "node:path";

const sourceRoot = path.resolve("src");
const sourceFiles = [];

function collectSourceFiles(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) collectSourceFiles(filePath);
    else if (/\.(ts|tsx)$/.test(entry.name)) sourceFiles.push(filePath);
  }
}

collectSourceFiles(sourceRoot);

const sourceFileByPath = new Map(
  sourceFiles.map((filePath) => [filePath.replaceAll("\\", "/"), filePath]),
);

function resolveSourceImport(sourceFile, specifier) {
  if (!specifier.startsWith(".") && !specifier.startsWith("@/")) return null;

  const basePath = specifier.startsWith("@/")
    ? path.join(sourceRoot, specifier.slice(2))
    : path.resolve(path.dirname(sourceFile), specifier);
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    path.join(basePath, "index.ts"),
    path.join(basePath, "index.tsx"),
  ];

  for (const candidate of candidates) {
    const sourcePath = sourceFileByPath.get(candidate.replaceAll("\\", "/"));
    if (sourcePath) return sourcePath;
  }

  return null;
}

const importsByFile = new Map(
  sourceFiles.map((filePath) => [filePath, new Set()]),
);
const importPattern =
  /(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)["']([^"']+)["']/g;

for (const sourceFile of sourceFiles) {
  const source = fs.readFileSync(sourceFile, "utf8");
  for (const match of source.matchAll(importPattern)) {
    const target = resolveSourceImport(sourceFile, match[1]);
    if (target) importsByFile.get(sourceFile).add(target);
  }
}

const relative = (filePath) => path.relative(process.cwd(), filePath);
const lowerLayers = new Set(["config", "data", "lib"]);
const reactLayers = new Set(["app", "components", "context", "hooks"]);
const layerViolations = [];

for (const [sourceFile, targets] of importsByFile) {
  const sourceLayer = path.relative(sourceRoot, sourceFile).split(path.sep)[0];
  if (!lowerLayers.has(sourceLayer)) continue;

  for (const target of targets) {
    const targetLayer = path.relative(sourceRoot, target).split(path.sep)[0];
    if (reactLayers.has(targetLayer)) {
      layerViolations.push(`${relative(sourceFile)} -> ${relative(target)}`);
    }
  }
}

const visited = new Set();
const visiting = new Set();
const stack = [];
let cycle = null;

function visit(filePath) {
  if (cycle || visited.has(filePath)) return;
  if (visiting.has(filePath)) {
    const cycleStart = stack.indexOf(filePath);
    cycle = [...stack.slice(cycleStart), filePath].map(relative);
    return;
  }

  visiting.add(filePath);
  stack.push(filePath);
  for (const target of importsByFile.get(filePath)) visit(target);
  stack.pop();
  visiting.delete(filePath);
  visited.add(filePath);
}

for (const sourceFile of sourceFiles) visit(sourceFile);

if (cycle || layerViolations.length > 0) {
  if (cycle) console.error(`Import cycle: ${cycle.join(" -> ")}`);
  for (const violation of layerViolations) {
    console.error(`Layer violation: ${violation}`);
  }
  process.exit(1);
}

const edgeCount = [...importsByFile.values()].reduce(
  (total, imports) => total + imports.size,
  0,
);
console.log(
  `PASS: ${sourceFiles.length} source files and ${edgeCount} internal imports respect architecture boundaries.`,
);
