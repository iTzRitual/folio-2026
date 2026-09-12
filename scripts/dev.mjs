import { spawn } from "node:child_process";
import { watch } from "node:fs";
import path from "node:path";
import { isPublishedSourcePath } from "./source-publication-policy.mjs";

const root = process.cwd();
const generator = path.join(root, "scripts", "generate-source-manifest.mjs");
const nextCli = path.join(root, "node_modules", "next", "dist", "bin", "next");
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
  return isPublishedSourcePath(filename);
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
