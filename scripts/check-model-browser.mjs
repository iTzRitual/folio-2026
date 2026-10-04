import assert from "node:assert/strict";

export async function checkModelBrowser(devtools, sessionId, base) {
  const send = (method, params) => devtools.send(method, params, sessionId);
  const evaluate = expression => devtools.evaluate(expression, sessionId);
  const state = () => evaluate("(() => { const output = document.querySelector('[data-model-state]'); return output ? { ...JSON.parse(output.dataset.modelState), quality:output.dataset.quality, samples:Number(output.dataset.samples), started:output.dataset.started, media:(window.__modelVideos ?? []).map(video => ({ src:video.getAttribute('src'), paused:video.paused, ready:video.readyState, error:video.error?.message, width:video.videoWidth, height:video.videoHeight })) } : null; })()");
  const wait = async (predicate, label) => {
    const deadline = Date.now() + 45_000;
    while (Date.now() < deadline) {
      try {
        const value = await state();
        if (value && predicate(value)) return value;
      } catch (error) {
        if (!error.message.includes("Execution context was destroyed") && !error.message.includes("Cannot find context")) throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    throw new Error(`Model check timed out: ${label}: ${JSON.stringify(await state())}`);
  };
  const click = async command => {
    const point = await evaluate(`(() => { const r = document.querySelector('[data-command="${command}"]').getBoundingClientRect(); return {x:r.x+r.width/2, y:r.y+r.height/2}; })()`);
    await send("Input.dispatchMouseEvent", { type: "mousePressed", ...point, button: "left", buttons: 1, clickCount: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", ...point, button: "left", buttons: 0, clickCount: 1 });
  };
  const keyboardClick = async command => {
    await evaluate(`document.querySelector('[data-command="${command}"]').focus({preventScroll:true})`);
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r" });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  };
  const paused = async label => {
    const before = await state();
    const after = await wait(value => value.frame >= before.frame + 12, label);
    assert.equal(after.computePasses, before.computePasses, `${label} must issue zero compute passes: ${JSON.stringify(after)}`);
  };
  await send("Page.enable");
  await send("Page.addScriptToEvaluateOnNewDocument", { source: `(() => {
    window.__modelVideos = [];
    const create = document.createElement;
    document.createElement = function(type, ...options) {
      const element = create.call(this, type, ...options);
      if (type.toLowerCase() === 'video') window.__modelVideos.push(element);
      return element;
    };
  })();` });
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: new URL("/lab/regression?fixture=model", base).href });
  await wait(value => value.fragment && value.frame > 5, "model mount");
  await paused("before entrance");
  await click("start");
  const active = await wait(value => value.fragment?.rest && value.computePasses > 20 && value.orbit?.video, "active entrance and loaded media");
  const topology = active.fragment;
  let previousMedia = active.orbit.map;
  let previousQuality = active.quality;
  for (const phase of ["hero", "scatter", "hero"]) {
    await click(phase);
    for (const quality of ["high", "low", "balanced", "high"]) {
      await click(`quality-${quality}`);
      const changed = await wait(value => value.quality === quality && value.fragment?.rest && value.orbit && (quality === "low" ? !value.orbit.video : value.orbit.video), `${phase} ${quality}`);
      assert.equal(changed.fragment.geometry, topology.geometry, "Quality changes must retain fragment geometry");
      assert.equal(changed.fragment.vertices, topology.vertices, "Quality changes must retain vertex count");
      assert.equal(changed.fragment.rest, topology.rest, "Quality changes must retain simulation rest state");
      assert.equal(changed.fragment.samples, changed.samples, "The compiled transmission shader must respect the current quality budget");
      assert.ok(changed.orbit.cover.every(value => Number.isFinite(value) && value >= 1), "Every media variant must retain a valid cover");
      if (previousQuality !== "low" && quality !== "low") assert.equal(changed.orbit.map, previousMedia, "Balanced/high changes must preserve the current video");
      if (quality === "low") assert.ok(changed.media.every(video => video.paused && video.src === null), "Low tier must tear down every previous video");
      previousMedia = changed.orbit.map;
      previousQuality = quality;
    }
  }
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: 720, y: 450, button: "left", buttons: 1, clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 840, y: 500, button: "left", buttons: 1 });
  await keyboardClick("quality-low");
  await wait(value => value.quality === "low" && value.fragment?.rest === topology.rest, "low during held pointer");
  await keyboardClick("quality-high");
  await wait(value => value.quality === "high" && value.fragment?.rest === topology.rest, "high during held pointer");
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: 840, y: 500, button: "left", buttons: 0, clickCount: 1 });
  assert.equal((await state()).fragment.geometry, topology.geometry, "Pointer movement and quality changes must retain topology");
  for (const command of ["hide", "details", "reveal"]) {
    await click(command);
    const started = await state();
    await wait(value => value.frame > started.frame + 5, command);
    await paused(command);
    await click("show");
    await click("hero");
    const before = await state();
    await wait(value => value.computePasses > before.computePasses && value.fragment?.rest === topology.rest, `${command} resume`);
  }
  await evaluate("Object.defineProperty(document, 'hidden', {configurable:true, value:true}); document.dispatchEvent(new Event('visibilitychange'))");
  const hidden = await wait(value => value.hidden && value.videos.every(video => video.paused), "visibility pause");
  await wait(value => value.frame > hidden.frame + 3, "visibility settling");
  await paused("simulated document visibility");
  await evaluate("delete document.hidden; document.dispatchEvent(new Event('visibilitychange'))");
  await wait(value => !value.hidden && value.orbit.video && value.videos.some(video => !video.paused), "visibility resume");
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  const reduced = await wait(value => value.orbit && !value.orbit.video && value.videos.every(video => video.paused && video.src === null), "reduced motion media teardown");
  await wait(value => value.frame > reduced.frame + 5, "reduced motion settling");
  await paused("reduced motion");
  await send("Emulation.setEmulatedMedia", { features: [] });
  await wait(value => value.orbit.video && value.fragment?.rest === topology.rest, "motion resume");
  await send("Page.navigate", { url: new URL("/lab/regression?fixture=model&quality=low", base).href });
  await wait(value => value.quality === "low" && value.fragment && value.frame > 5, "initial low topology");
  await paused("initial low entrance");
  await click("start");
  const low = await wait(value => value.fragment?.rest && value.computePasses > 20, "initial low simulation");
  assert.ok(low.fragment.vertices < topology.vertices, "An initial low session must prepare its smaller topology once");
  assert.equal(low.media.length, 0, "An initial low session must not create video");
  await click("quality-high");
  const upgraded = await wait(value => value.quality === "high" && value.fragment?.rest && value.orbit.video, "initial low upgrade");
  assert.equal(upgraded.fragment.geometry, low.fragment.geometry);
  assert.equal(upgraded.fragment.rest, low.fragment.rest);
  assert.equal(upgraded.fragment.samples, upgraded.samples);
  await send("Emulation.clearDeviceMetricsOverride");
  return "PASS: mounted production Model retains topology/rest textures across hero/scatter/pointer input and quality changes; low/reduced motion tear down video and preserve cover; entrance, hidden ancestor, details, reveal and simulated document visibility issue zero compute passes, with coherent resumes.";
}
