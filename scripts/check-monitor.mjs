import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const directory = mkdtempSync(path.join(tmpdir(), "folio-monitor-check-"));
const files = ["src/config/constants.ts", "src/lib/monitorState.ts", "src/lib/monitorControls.ts", "src/lib/monitorScreen.ts", "scripts/check-monitor.ts"];
try {
  for (const file of files) {
    const compiled = ts.transpileModule(readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    }).outputText.replace(/require\("([^\"]+)"\)/g, (_, specifier) => {
      if (specifier === "three") return `require(${JSON.stringify(require.resolve("three"))})`;
      if (specifier.startsWith(".") || specifier.startsWith("@/")) return `require(${JSON.stringify(`./${path.basename(specifier)}.cjs`)})`;
      return `require(${JSON.stringify(specifier)})`;
    });
    writeFileSync(path.join(directory, path.basename(file, ".ts") + ".cjs"), compiled);
  }
  require(path.join(directory, "check-monitor.cjs"));
} finally {
  if (path.dirname(directory) !== path.resolve(tmpdir()) || !path.basename(directory).startsWith("folio-monitor-check-")) throw new Error("Unexpected monitor test directory");
  rmSync(directory, { recursive: true, force: true });
}
