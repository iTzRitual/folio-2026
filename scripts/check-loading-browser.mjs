import assert from "node:assert/strict";

function observeLoader() {
  const sample = window.loadingSample = { values: [], exit: 0, revealShaders: 0 };
  const webgl = WebGL2RenderingContext.prototype;
  const shaderSource = webgl.shaderSource;
  webgl.shaderSource = function(shader, source) {
    if (source.includes("uniform vec2 uBlockRadiusUv;")) sample.revealShaders++;
    shaderSource.call(this, shader, source);
  };
  function frame(now) {
    const strip = document.querySelector("[data-loader-count]");
    if (strip) {
      const height = strip.firstElementChild.getBoundingClientRect().height;
      const value = Math.round(-new DOMMatrixReadOnly(getComputedStyle(strip).transform).m42 / height);
      if (Number.isFinite(value) && sample.values.at(-1) !== value) sample.values.push(value);
    } else if (sample.values.length) {
      sample.exit = now;
      return;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function holdRoomModel() {
  const fetchResource = window.fetch;
  window.fetch = async (...args) => {
    const resource = args[0];
    const url = new URL(resource instanceof Request ? resource.url : resource, location.href);
    if (url.pathname.endsWith("/qck-hard.glb")) {
      await new Promise(resolve => { window.releaseRoomModel = resolve; });
    }
    return fetchResource(...args);
  };
}

export async function checkLoadingBrowser(devtools, sessionId, base) {
  const send = (method, params) => devtools.send(method, params, sessionId);
  const evaluate = expression => devtools.evaluate(expression, sessionId);
  const wait = async expression => {
    const deadline = Date.now() + 120_000;
    while (Date.now() < deadline) {
      if (await evaluate(expression)) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Timed out waiting for ${expression}`);
  };
  await send("Page.enable");
  await send("Page.addScriptToEvaluateOnNewDocument", { source: `(${observeLoader.toString()})()` });
  for (const reduced of [false, true]) {
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: reduced ? "reduce" : "no-preference" }] });
    if (reduced) {
      await send("Page.addScriptToEvaluateOnNewDocument", { source: `(${holdRoomModel.toString()})()` });
    }
    await send("Page.navigate", { url: new URL("/", base).href });
    if (reduced) {
      await wait(`typeof window.releaseRoomModel === 'function' && !!document.querySelector('[data-renderer-status="ready"]')`);
      await wait("window.loadingSample.values.some(value => value >= 60)");
      await evaluate("new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
      assert(await evaluate("window.loadingSample.values.at(-1) < 100"), "A held model keeps progress below 100");
      assert.equal(await evaluate("window.loadingSample.exit"), 0, "A pending room model keeps the repeat loader open");
      await evaluate("window.releaseRoomModel()");
    }
    await wait("window.loadingSample?.exit > 0");
    const { values, exit, revealShaders } = await evaluate("window.loadingSample");
    assert.equal(values.at(-1), 100, `Loader finishes at 100 (reduced motion: ${reduced})`);
    assert(values.length > 1 && values.every((value, i) => !i || value > values[i - 1]), `Counter reversed: ${values}`);
    await evaluate("window.scrollTo(0, document.documentElement.scrollHeight)");
    const lampVisible = `document.querySelector('button[aria-label="Desk lamp"]')?.hidden === false`;
    await wait(lampVisible);
    const assets = await evaluate(`performance.getEntriesByType("resource").filter(r => new URL(r.name).pathname.startsWith("/glbs/")).map(r => ({name: r.name, end: r.responseEnd}))`);
    assert(assets.some(r => r.name.includes("/qck-hard.glb")), "Room accessories loaded");
    assert(assets.every(r => r.end <= exit), "Every visit prepares all models before exit");
    if (!reduced) {
      assert(revealShaders > 0, "Bio reveal shader prepared");
      await evaluate("new Promise(resolve => setTimeout(resolve, 750))");
      assert.equal(await evaluate("window.loadingSample.revealShaders"), revealShaders, "Entering the room reuses the prepared bio shader");
    }
  }
  return "PASS: cold and repeat loaders advance to 100 and support immediate workstation entry with normal and reduced motion.";
}
