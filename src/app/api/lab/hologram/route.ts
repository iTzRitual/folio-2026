import { writeFile } from "node:fs/promises";
import path from "node:path";
import { parseOrbitSignalConfig } from "@/config/orbitSignal";

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return new Response(null, { status: 404 });
  if (request.headers.get("origin") !== new URL(request.url).origin) return new Response(null, { status: 403 });
  const body = await request.text();
  if (body.length > 4096) return new Response(null, { status: 413 });
  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    return new Response(null, { status: 400 });
  }
  const config = parseOrbitSignalConfig(value);
  if (!config) return new Response(null, { status: 400 });
  await writeFile(path.join(process.cwd(), "src/config/orbitSignal.json"), `${JSON.stringify(config, null, 2)}\n`);
  return Response.json({ saved: true });
}
