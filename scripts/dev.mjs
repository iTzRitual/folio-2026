import { spawn } from "node:child_process";
import { watch } from "node:fs";
import path from "node:path";

const root = process.cwd();
const generator = path.join(root, "scripts", "generate-source-manifest.mjs");
const nextCli = path.join(root, "node_modules", "next", "dist", "bin", "next");
const ignoredPrefixes = [
  ".agents/",
  ".claude/",
  ".git/",
  ".next/",
  "node_modules/",
  "out/",
  "plans/",
  "public/source-manifest.",
  "raw/",
];
const ignoredFiles = new Set([
  ".DS_Store",
  "AGENTS.md",
  "next-env.d.ts",
  "package-lock.json",
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
let debounce;
let generating = false;
let queued = false;

function runGenerator() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [generator], {
      cwd: root,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Source manifest exited with code ${code}`));
    });
  });
}

async function regenerate() {
  if (generating) {
    queued = true;
    return;
  }

  generating = true;
  try {
    do {
      queued = false;
      await runGenerator();
    } while (queued);
  } finally {
    generating = false;
  }
}

function shouldRegenerate(filename) {
  const normalized = filename.split(path.sep).join("/");
  if (ignoredPrefixes.some((prefix) => normalized.startsWith(prefix))) {
    return false;
  }
  if (ignoredFiles.has(path.basename(normalized))) return false;
  if (normalized === ".gitignore") return true;
  return textExtensions.has(path.extname(normalized).toLowerCase());
}

await regenerate();

const next = spawn(process.execPath, [nextCli, "dev", ...process.argv.slice(2)], {
  cwd: root,
  env: process.env,
  stdio: "inherit",
});
const watcher = watch(root, { recursive: true }, (_, filename) => {
  if (!filename || !shouldRegenerate(filename)) return;
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    regenerate().catch((error) => console.error(error));
  }, 140);
});

next.once("exit", (code) => {
  watcher.close();
  process.exit(code ?? 0);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    watcher.close();
    next.kill(signal);
  });
}
