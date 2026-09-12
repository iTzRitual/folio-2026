import assert from "node:assert/strict";
import {
  isPublishedSourcePath,
  normalizeSourcePath,
} from "./source-publication-policy.mjs";

assert.equal(isPublishedSourcePath("README.md"), true);
assert.equal(isPublishedSourcePath("src/components/Scene.tsx"), true);
assert.equal(isPublishedSourcePath("docs/decisions/0001-shared-responsive-webgl-scene.md"), true);
assert.equal(isPublishedSourcePath("assets/crt-monitor/asset-report.json"), true);
assert.equal(isPublishedSourcePath("public/link_arrow.svg"), true);
assert.equal(isPublishedSourcePath("public/source-manifest.json"), false);
assert.equal(isPublishedSourcePath("public/source-manifest.version"), false);
assert.equal(isPublishedSourcePath("notes/private.json"), false);
assert.equal(isPublishedSourcePath(".vercel/project.json"), false);
assert.equal(isPublishedSourcePath("plans/architecture-audit.md"), false);
assert.equal(isPublishedSourcePath("src/private.pem"), false);
assert.equal(normalizeSourcePath("src\\components\\Scene.tsx"), "src/components/Scene.tsx");

console.log("PASS: source publication stays inside approved roots and file types.");

