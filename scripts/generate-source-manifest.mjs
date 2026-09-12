import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  isPublishedSourcePath,
  publishedSourceDirectories,
  publishedSourceMaxFileSize,
  publishedSourceRootFiles,
} from "./source-publication-policy.mjs";

const root = process.cwd();
const output = path.join(root, "public", "source-manifest.json");
const versionOutput = path.join(root, "public", "source-manifest.version");
async function collect(directory, files) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      await collect(absolutePath, files);
      continue;
    }

    if (!entry.isFile()) continue;

    const relativePath = path.relative(root, absolutePath);
    if (!isPublishedSourcePath(relativePath)) continue;

    const metadata = await stat(absolutePath);
    if (metadata.size > publishedSourceMaxFileSize) continue;

    files.push({
      path: relativePath.split(path.sep).join("/"),
      content: await readFile(absolutePath, "utf8"),
    });
  }
}

const files = [];
for (const directory of publishedSourceDirectories) {
  await collect(path.join(root, directory), files);
}
for (const file of publishedSourceRootFiles) {
  const absolutePath = path.join(root, file);
  const metadata = await stat(absolutePath);
  if (metadata.size > publishedSourceMaxFileSize) continue;
  files.push({ path: file, content: await readFile(absolutePath, "utf8") });
}
files.sort((a, b) => a.path.localeCompare(b.path));
const hash = createHash("sha256");
for (const file of files) {
  hash.update(file.path);
  hash.update("\0");
  hash.update(file.content);
  hash.update("\0");
}
const version = hash.digest("hex").slice(0, 16);
await mkdir(path.dirname(output), { recursive: true });
await Promise.all([
  writeFile(output, JSON.stringify({ version, files }), "utf8"),
  writeFile(versionOutput, version, "utf8"),
]);
