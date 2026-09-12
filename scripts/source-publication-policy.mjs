import path from "node:path";

export const publishedSourceDirectories = [
  "assets",
  "docs",
  "public",
  "scripts",
  "src",
];

export const publishedSourceRootFiles = [
  ".gitignore",
  "README.md",
  "eslint.config.mjs",
  "next.config.ts",
  "package.json",
  "postcss.config.mjs",
  "tsconfig.json",
];

export const publishedSourceMaxFileSize = 250_000;

const generatedFiles = new Set([
  "public/source-manifest.json",
  "public/source-manifest.version",
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

export function normalizeSourcePath(file) {
  return file.split(path.sep).join("/").replace(/^\.\//, "");
}

export function isPublishedSourcePath(file) {
  const normalized = normalizeSourcePath(file);
  if (generatedFiles.has(normalized)) return false;
  if (publishedSourceRootFiles.includes(normalized)) return true;
  if (
    !publishedSourceDirectories.some(
      (directory) =>
        normalized.startsWith(`${directory}/`) &&
        normalized.length > directory.length + 1,
    )
  ) {
    return false;
  }
  return textExtensions.has(path.extname(normalized).toLowerCase());
}

