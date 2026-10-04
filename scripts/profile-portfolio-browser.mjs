import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const percentile = (values, fraction) => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(values.length * fraction))] ?? null;

export async function profilePortfolioBrowser(devtools, sessionId, base, artifactRoot, root) {
  const { CONFIG, DEBUG_DEFAULTS, dockCount, editorIndex } = JSON.parse(execFileSync(process.execPath, [path.join(root, "scripts/check-monitor.mjs"), "scripts/profile-config.ts"], { cwd: root, encoding: "utf8" }));
  const send = (method, params) => devtools.send(method, params, sessionId);
  const evaluate = expression => devtools.evaluate(expression, sessionId);
  const wait = async (expression, label) => {
    const deadline = Date.now() + 90_000;
    while (Date.now() < deadline) {
      try { const value = await evaluate(expression); if (value) return value; }
      catch (error) {
        if (!error.message.includes("Execution context was destroyed") && !error.message.includes("Cannot find context")) throw error;
      }
      await delay(100);
    }
    throw new Error(`Production profile timed out: ${label}`);
  };
  const report = { revision: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(), date: new Date().toISOString(), base, instrumented: true, phases: [] };
  const save = () => {
    const json = JSON.stringify(report, null, 2);
    return Promise.all([
      writeFile(path.join(artifactRoot, "production-profile.json"), json),
      writeFile(path.join(artifactRoot, `production-profile-${report.date.replaceAll(":", "-")}.json`), json),
    ]);
  };
  const finish = async () => {
    const phase = await evaluate("window.__folioProfile.end()");
    assert.ok(phase.frames.length > 10, `${phase.name}: measurable animation frames`);
    report.phases.push({ ...phase, summary: {
      samples: phase.frames.length,
      frameMs: { p50: percentile(phase.frames.map(frame => frame.interval), 0.5), p95: percentile(phase.frames.map(frame => frame.interval), 0.95), max: Math.max(...phase.frames.map(frame => frame.interval)) },
      meanDraws: phase.frames.reduce((sum, frame) => sum + frame.draws, 0) / phase.frames.length,
      computeDraws: phase.frames.reduce((sum, frame) => sum + frame.compute, 0),
      editorDraws: phase.frames.reduce((sum, frame) => sum + frame.editor, 0),
      longTaskCount: phase.longTasks.length,
      longTaskMs: phase.longTasks.reduce((sum, task) => sum + task.duration, 0),
    } });
    await save();
    assert.equal(phase.errors.length, 0, `${phase.name}: uncaught runtime errors`);
    console.log(`PROFILE: ${phase.name}, p95 ${report.phases.at(-1).summary.frameMs.p95.toFixed(1)}ms, ${phase.longTasks.length} long tasks`);
    return report.phases.at(-1);
  };
  const measure = async (name, action, duration = 4000) => {
    await evaluate(`window.__folioProfile.begin(${JSON.stringify(name)})`);
    await action?.();
    await delay(duration);
    return finish();
  };
  const screenshot = async name => {
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    await writeFile(path.join(artifactRoot, `${name}.png`), Buffer.from(data, "base64"));
  };
  const mouse = (type, x, y, pressed = false) => send("Input.dispatchMouseEvent", { type, x, y, button: type === "mouseMoved" ? "none" : "left", buttons: pressed ? 1 : 0, clickCount: type === "mouseMoved" ? 0 : 1 });
  const key = async (key, code, windowsVirtualKeyCode) => {
    await send("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode, text: key === "Enter" ? "\r" : undefined });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode });
  };
  const scroll = async y => {
    await evaluate(`window.scrollTo(0, ${y})`);
    await delay(200);
  };
  await mkdir(artifactRoot, { recursive: true });
  const lab = await fetch(new URL("/lab/regression", base));
  assert.equal(lab.status, 404, "Profile must use the production build with development fixtures disabled");
  await send("Page.enable");
  await send("Network.enable");
  await send("Network.setCacheDisabled", { cacheDisabled: true });
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  const source = await readFile(new URL("./portfolio-profile-probe.js", import.meta.url), "utf8");
  await send("Page.addScriptToEvaluateOnNewDocument", { source: `${source}\nwindow.__folioProfile.begin('cold-start');` });
  await send("Page.navigate", { url: new URL("/", base).href });
  try {
    await wait("document.querySelector('.js-only-app')?.dataset.rendererStatus === 'ready' && document.fonts.status === 'loaded' && !document.querySelector('.js-only-app .z-50') && getComputedStyle(document.documentElement).overflow !== 'hidden'", "actual loader completion and font-ready scene");
    await finish();
    await delay(2500);
    report.environment = await evaluate("window.__folioProfile.environment()");
    await measure("hero-idle");
    await screenshot("profile-hero");
    const point = await evaluate("window.__folioProfile.modelPoint()");
    assert.ok(point && point.x > 0 && point.x < 1440 && point.y > 0 && point.y < 900, "Model has a projected native drag point");
    let dragPoint = null;
    for (const dy of [100, 0, -100, 150, -150]) {
      for (const dx of [-200, -100, 0, 100, 200, -300, 300]) {
        const candidate = { x: point.x + dx, y: point.y + dy };
        if (candidate.x < 0 || candidate.x >= 1440 || candidate.y < 0 || candidate.y >= 900) continue;
        await mouse("mouseMoved", candidate.x, candidate.y);
        if (await evaluate("document.body.style.cursor === 'grab'")) { dragPoint = candidate; break; }
      }
      if (dragPoint) break;
    }
    assert.ok(dragPoint, "Native hit testing locates a draggable orbit card");
    await measure("hero-drag", async () => {
      await mouse("mouseMoved", dragPoint.x, dragPoint.y);
      await mouse("mousePressed", dragPoint.x, dragPoint.y, true);
      assert.equal(await evaluate("document.body.style.cursor"), "grabbing", "Orbit owns the native pointer gesture");
      for (let i = 1; i <= 15; i++) {
        await mouse("mouseMoved", dragPoint.x + i * 4, dragPoint.y - i * 2, true);
        await delay(16);
      }
      await mouse("mouseReleased", dragPoint.x + 60, dragPoint.y - 30);
      assert.notEqual(await evaluate("document.body.style.cursor"), "grabbing", "Orbit releases the native gesture");
    });
    report.dragPoint = dragPoint;
    await measure("hero-to-details", async () => {
      const end = 900 * (CONFIG.scrollTimeline.VIEWPORTS - 1);
      for (let i = 1; i <= 30; i++) { await scroll(end * i / 30); await delay(16); }
    });
    const details = await measure("details-idle");
    assert.equal(details.summary.computeDraws, 0, "Details at rest must not spend fragment simulation passes");
    const project = await wait(`(() => {
      return [...document.querySelectorAll('button[aria-label^="Open case study:"]')].find(button => { const r = button.getBoundingClientRect(); return r.y > 100 && r.y < 780 && getComputedStyle(button).visibility !== 'hidden' && !button.closest('[inert]'); })?.getAttribute('aria-label');
    })()`, "project action in details");
    await measure("case-study", async () => {
      await evaluate(`document.querySelector('button[aria-label=${JSON.stringify(project)}]').focus({preventScroll:true})`);
      await key("Enter", "Enter", 13);
      await wait("document.querySelector('[data-case-study-copy] p') && document.activeElement?.getAttribute('aria-label') === 'Natan Mokrzycki, back to projects'", "case-study entry");
    });
    await screenshot("profile-study");
    await key("Escape", "Escape", 27);
    await wait(`document.activeElement?.getAttribute('aria-label') === ${JSON.stringify(project)} && getComputedStyle(document.documentElement).overflow !== 'hidden'`, "case-study return");
    const maximum = await evaluate("document.documentElement.scrollHeight - innerHeight");
    await measure("workstation-reveal", async () => {
      const start = await evaluate("scrollY");
      for (let i = 1; i <= 30; i++) { await scroll(start + (maximum - start) * i / 30); await delay(16); }
    });
    await screenshot("profile-workstation");
    const workstation = await measure("workstation-idle");
    assert.equal(workstation.summary.computeDraws, 0, "Workstation must not advance hidden skull fragments");
    const tuning = DEBUG_DEFAULTS.desktop;
    const W = CONFIG.workstation;
    const height = W.DOCK_HEIGHT_MULT * tuning.dockScale;
    const size = height * 0.68;
    const gap = height * W.DOCK_ITEM_GAP_MULT;
    const aspect = W.PLANE_ASPECT;
    const width = size * dockCount + gap * (dockCount - 1) + height * 0.32;
    const u = 0.5 - width / aspect / 2 + tuning.dockOffsetX / aspect + height * 0.16 / aspect + (size + gap) * editorIndex / aspect + size / aspect / 2;
    const v = W.BROWSER_SAFE_MARGIN_MULT + height / 2 - tuning.dockOffsetY;
    const dock = await evaluate(`window.__folioProfile.rasterPoint(${u}, ${v})`);
    assert.ok(dock && Number.isFinite(dock.x) && Number.isFinite(dock.y), "CRT raster projects the editor icon");
    const editor = await measure("editor-open", async () => {
      await mouse("mouseMoved", dock.x, dock.y);
      await delay(200);
      await mouse("mousePressed", dock.x, dock.y, true);
      await mouse("mouseReleased", dock.x, dock.y);
    });
    assert.ok(editor.summary.editorDraws > 0, "Native dock click draws the actual editor texture");
    report.editorClick = dock;
    await screenshot("profile-editor");
    await delay(4000);
    const restingEditor = await measure("editor-idle");
    assert.ok(restingEditor.summary.editorDraws > 0, "Editor remains visible after its window transition");
    await measure("reverse-reveal", async () => {
      for (let i = 1; i <= 30; i++) { await scroll(maximum * (1 - i / 30)); await delay(16); }
    });
    report.finalEnvironment = await evaluate("window.__folioProfile.environment()");
    report.status = "passed";
    await save();
    return `PASS: production interaction profile saved in ${artifactRoot}. Renderer: ${report.environment.contexts[0]?.renderer}. Instrumented local baseline; physical-phone performance remains unmeasured.`;
  } catch (error) {
    report.status = "failed";
    report.error = error.message;
    await screenshot("profile-failure");
    await save();
    throw error;
  } finally {
    await send("Emulation.clearDeviceMetricsOverride");
  }
}
