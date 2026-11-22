import assert from "node:assert/strict";

function observeLoader() {
  const sample = window.loadingSample = { values: [], exit: 0 };
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
    await send("Page.navigate", { url: new URL("/", base).href });
    await wait("window.loadingSample?.exit > 0");
    const { values, exit } = await evaluate("window.loadingSample");
    assert.equal(values.at(-1), 100, "Loader finishes at 100");
    assert(values.length > 1 && values.every((value, i) => !i || value > values[i - 1]), `Counter reversed: ${values}`);
    await evaluate("window.scrollTo(0, document.documentElement.scrollHeight)");
    await wait(`document.querySelector('button[aria-label="Desk lamp"]')?.hidden === false`);
    const assets = await evaluate(`performance.getEntriesByType("resource").filter(r => new URL(r.name).pathname.startsWith("/glbs/")).map(r => ({name: r.name, end: r.responseEnd}))`);
    assert(assets.some(r => r.name.includes("/qck-hard.glb")), "Room accessories loaded");
    assert(assets.every(r => r.end <= exit), "All scene models finished loading before the first reveal");
  }
  return "PASS: cold and repeat loaders advance to 100 and support immediate workstation entry with normal and reduced motion.";
}
