import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const output = path.join(root, "public", "source-manifest.json");
const ignoredDirectories = new Set([
  ".agents",
  ".claude",
  ".git",
  ".next",
  "node_modules",
  "out",
  "plans",
  "raw",
]);
const ignoredFiles = new Set([
  ".DS_Store",
  "AGENTS.md",
  "next-env.d.ts",
  "package-lock.json",
  "source-manifest.json",
  "tsconfig.tsbuildinfo",
]);
const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".svg",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);
const extensionlessFiles = new Set([".gitignore"]);
const maxFileSize = 250_000;

async function collect(directory, files) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    if (ignoredFiles.has(entry.name)) continue;

    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      await collect(absolutePath, files);
      continue;
    }

    if (!entry.isFile()) continue;

    const extension = path.extname(entry.name).toLowerCase();
    if (!textExtensions.has(extension) && !extensionlessFiles.has(entry.name)) {
      continue;
    }

    const metadata = await stat(absolutePath);
    if (metadata.size > maxFileSize) continue;

    files.push({
      path: path.relative(root, absolutePath).split(path.sep).join("/"),
      content: await readFile(absolutePath, "utf8"),
    });
  }
}

const files = [];
await collect(root, files);
files.sort((a, b) => a.path.localeCompare(b.path));
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, JSON.stringify({ files }), "utf8");
