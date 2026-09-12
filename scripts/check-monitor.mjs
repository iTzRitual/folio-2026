import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();
const directory = mkdtempSync(path.join(tmpdir(), "folio-monitor-check-"));

function resolveLocalModule(sourceFile, specifier) {
  const candidate = specifier.startsWith("@/")
    ? path.join(root, "src", specifier.slice(2))
    : path.resolve(path.dirname(sourceFile), specifier);
  return path.extname(candidate) ? candidate : `${candidate}.ts`;
}

function outputPath(sourceFile) {
  const relative = path.relative(root, sourceFile);
  return path.join(directory, relative.replace(/\.tsx?$/, ".cjs"));
}

const compiledFiles = new Set();

function compile(sourceFile) {
  const absoluteSource = path.resolve(sourceFile);
  if (compiledFiles.has(absoluteSource)) return outputPath(absoluteSource);
  compiledFiles.add(absoluteSource);

  const compiled = ts.transpileModule(readFileSync(absoluteSource, "utf8"), {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText.replace(/require\("([^\"]+)"\)/g, (_, specifier) => {
    if (specifier.startsWith(".") || specifier.startsWith("@/")) {
      return `require(${JSON.stringify(compile(resolveLocalModule(absoluteSource, specifier)))})`;
    }
    return `require(${JSON.stringify(require.resolve(specifier))})`;
  });

  const destination = outputPath(absoluteSource);
  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, compiled);
  return destination;
}

try {
  require(compile(path.join(root, "scripts", "check-monitor.ts")));
} finally {
  if (path.dirname(directory) !== path.resolve(tmpdir()) || !path.basename(directory).startsWith("folio-monitor-check-")) throw new Error("Unexpected monitor test directory");
  rmSync(directory, { recursive: true, force: true });
}
