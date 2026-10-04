import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export async function checkRecoveryBrowser(devtools, sessionId, base, artifactRoot) {
  const send = (method, params) => devtools.send(method, params, sessionId);
  const evaluate = expression => devtools.evaluate(expression, sessionId);
  const wait = async (expression, description) => {
    const deadline = Date.now() + 45_000;
    while (Date.now() < deadline) {
      try {
        if (await evaluate(expression)) return;
      } catch (error) {
        if (!error.message.includes("Execution context was destroyed") && !error.message.includes("Cannot find context")) throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    const state = await evaluate(`(() => {
      const content = document.querySelector('.no-js-fallback');
      return { status: document.querySelector('[data-renderer-status]')?.dataset.rendererStatus, fallback: content?.getAttribute('data-renderer-fallback'), display: content && getComputedStyle(content).display, styles: [...document.styleSheets].flatMap(sheet => { try { return [...sheet.cssRules].filter(rule => rule.cssText.includes('no-js-fallback')).map(rule => rule.cssText); } catch { return []; } }), htmlOverflow: document.documentElement.style.overflow, bodyOverflow: document.body.style.overflow, canvases: document.querySelectorAll('canvas').length, text: content?.textContent.slice(0, 160) };
    })()`);
    throw new Error(`Recovery check timed out: ${description}: ${JSON.stringify(state)}`);
  };
  const navigate = url => send("Page.navigate", { url: new URL(url, base).href });
  const fallback = async name => {
    await wait(`(() => {
      const content = document.querySelector('.no-js-fallback');
      return content && getComputedStyle(content).display === 'flex' && !document.querySelector('.js-only-app canvas') && document.documentElement.style.overflow !== 'hidden' && document.body.style.overflow !== 'hidden';
    })()`, `${name} content and scroll release`);
    assert.equal(await evaluate("document.querySelector('.no-js-fallback h1').textContent"), "Natan Mokrzycki");
    assert.ok(await evaluate("document.querySelector('.no-js-fallback').textContent.includes('Featured Projects')"));
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
    assert.equal(await evaluate("document.activeElement?.getAttribute('href')"), "mailto:hello@natanmokrzycki.com", `${name}: contact must remain keyboard-accessible`);
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    await writeFile(path.join(artifactRoot, `${name}.png`), Buffer.from(data, "base64"));
    await send("Input.dispatchMouseEvent", { type: "mouseWheel", x: 720, y: 720, deltaX: 0, deltaY: 700 });
    await wait("scrollY > 0", `${name} native scrolling`);
  };
  await mkdir(artifactRoot, { recursive: true });
  await send("Page.enable");
  await send("Network.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  const script = await send("Page.addScriptToEvaluateOnNewDocument", { source: `(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...options) {
      return type.startsWith('webgl') || type === 'experimental-webgl' ? null : original.call(this, type, ...options);
    };
  })();` });
  await navigate("/");
  await wait("document.querySelector('[data-renderer-status]')?.dataset.rendererStatus === 'failed'", "WebGL initialization failure");
  await fallback("recovery-no-webgl");
  await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: script.identifier });
  await send("Network.setBlockedURLs", { urls: ["*czaszka2draco.glb*"] });
  await navigate("/");
  await wait("document.querySelector('[data-renderer-status]')?.dataset.rendererStatus === 'failed'", "critical model load failure");
  await fallback("recovery-critical-asset");
  await send("Network.setBlockedURLs", { urls: [] });
  await navigate("/lab/regression?fixture=portfolio");
  await wait("document.querySelector('[data-portfolio-fixture]')?.dataset.rendererStatus === 'ready'", "complete scene readiness");
  await evaluate("window.scrollTo(0, innerHeight * 0.875)");
  await wait(`(() => {
    const button = [...document.querySelectorAll('button[aria-label^="Open case study:"]')].find(button => {
      const rect = button.getBoundingClientRect();
      return rect.y > 250 && rect.y < 650 && getComputedStyle(button).visibility !== 'hidden' && !button.closest('[inert]');
    });
    if (!button) return false;
    button.click();
    return true;
  })()`, "active study");
  await wait("document.documentElement.style.overflow === 'hidden'", "owned study scroll lock");
  await evaluate("document.querySelector('canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()");
  await wait("document.querySelector('[data-portfolio-fixture]')?.dataset.rendererStatus === 'failed'", "native context loss recovery");
  assert.equal(await evaluate("document.querySelector('[data-portfolio-fixture] canvas')"), null);
  assert.equal(await evaluate("scrollY"), 0);
  await fallback("recovery-context-loss");
  await send("Emulation.setScriptExecutionDisabled", { value: true });
  await navigate("/");
  await wait("document.documentElement.classList.contains('no-js') && !!document.querySelector('.no-js-fallback h1')", "server-rendered no-JS content");
  await fallback("recovery-no-javascript");
  await send("Emulation.setScriptExecutionDisabled", { value: false });
  await send("Emulation.clearDeviceMetricsOverride");
  return "PASS: missing WebGL, critical asset failure, native context loss during a locked study and disabled JavaScript preserve complete HTML content, keyboard contact and native scrolling.";
}
