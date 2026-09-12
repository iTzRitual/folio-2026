export type SourceFile = {
  path: string;
  content: string;
};

export type SourceManifest = {
  version?: string;
  files: SourceFile[];
};

const manifestUrl = "/source-manifest.json";
const versionUrl = "/source-manifest.version";
let cachedManifest: SourceManifest | null = null;
let manifestRequest: Promise<SourceManifest> | null = null;

function isSourceFile(value: unknown): value is SourceFile {
  if (!value || typeof value !== "object") return false;
  const file = value as Partial<SourceFile>;
  return typeof file.path === "string" && typeof file.content === "string";
}

function isSourceManifest(value: unknown): value is SourceManifest {
  if (!value || typeof value !== "object") return false;
  const manifest = value as Partial<SourceManifest>;
  return (
    (manifest.version === undefined || typeof manifest.version === "string") &&
    Array.isArray(manifest.files) &&
    manifest.files.every(isSourceFile)
  );
}

export function loadSourceManifest({ refresh = false } = {}) {
  if (!refresh && cachedManifest) return Promise.resolve(cachedManifest);
  if (manifestRequest) return manifestRequest;

  const request = fetch(manifestUrl, { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) throw new Error("Source manifest unavailable");
      const manifest: unknown = await response.json();
      if (!isSourceManifest(manifest)) {
        throw new Error("Invalid source manifest");
      }
      cachedManifest = manifest;
      return manifest;
    })
    .finally(() => {
      if (manifestRequest === request) manifestRequest = null;
    });

  manifestRequest = request;
  return request;
}

export async function loadSourceManifestVersion() {
  const response = await fetch(versionUrl, { cache: "no-store" });
  if (!response.ok) throw new Error("Source manifest version unavailable");
  return (await response.text()).trim();
}

export async function refreshSourceManifest(currentVersion: string | null) {
  const version = await loadSourceManifestVersion();
  if (currentVersion === version) return null;
  return loadSourceManifest({ refresh: true });
}
