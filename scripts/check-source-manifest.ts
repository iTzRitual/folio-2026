import assert from "node:assert/strict";
import {
  loadSourceManifest,
  refreshSourceManifest,
} from "../src/lib/sourceManifest";

let version = "v1";
let manifestFetches = 0;
let invalidManifest = false;

globalThis.fetch = async (input) => {
  const url = String(input);
  if (url.endsWith(".version")) return new Response(version);
  manifestFetches += 1;
  return Response.json(
    invalidManifest
      ? { version, files: [{ path: 1, content: null }] }
      : {
          version,
          files: [{ path: "src/app/page.tsx", content: `version ${version}` }],
        },
  );
};

async function main() {
  const [first, duplicate] = await Promise.all([
    loadSourceManifest(),
    loadSourceManifest(),
  ]);
  assert.equal(manifestFetches, 1);
  assert.equal(first, duplicate);
  assert.equal(await refreshSourceManifest("v1"), null);

  version = "v2";
  const refreshed = await refreshSourceManifest("v1");
  assert.equal(manifestFetches, 2);
  assert.equal(refreshed?.version, "v2");
  assert.equal(await loadSourceManifest(), refreshed);

  version = "v3";
  invalidManifest = true;
  await assert.rejects(refreshSourceManifest("v2"), /Invalid source manifest/);
  assert.equal(await loadSourceManifest(), refreshed);

  console.log(
    "PASS: source manifests deduplicate requests, refresh by version, validate payloads, and retain the last valid cache.",
  );
}

void main();
