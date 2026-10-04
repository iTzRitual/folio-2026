import assert from "node:assert/strict";

export async function checkDesktopBrowser(devtools, sessionId, base) {
  const send = (method, params) => devtools.send(method, params, sessionId);
  const evaluate = expression => devtools.evaluate(expression, sessionId);
  const state = () => evaluate("(() => { const value = document.querySelector('[data-desktop-state]')?.dataset.desktopState; return value ? JSON.parse(value) : null; })()");
  const wait = async predicate => {
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      try {
        const value = await state();
        if (value && predicate(value)) return value;
      } catch (error) {
        if (!error.message.includes("Execution context was destroyed") && !error.message.includes("Cannot find context")) throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    throw new Error(`Desktop check timed out: ${JSON.stringify(await state())}`);
  };
  const click = async command => {
    const point = await evaluate(`(() => { const r = document.querySelector('[data-command="${command}"]').getBoundingClientRect(); return {x:r.x+r.width/2, y:r.y+r.height/2}; })()`);
    await send("Input.dispatchMouseEvent", { type: "mousePressed", ...point, button: "left", buttons: 1, clickCount: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", ...point, button: "left", buttons: 0, clickCount: 1 });
  };
  const navigate = async () => {
    await send("Page.navigate", { url: new URL("/lab/regression?fixture=desktop", base).href });
    await wait(value => value.activeApp === "safari" && value.windows.safari.state === "open");
  };
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  for (const closed of ["safari", "vscode"]) {
    await navigate();
    await click("switch-vscode");
    await wait(value => value.pendingApp === "vscode" && value.windows.safari.state === "animating");
    await click(`close-${closed}`);
    await wait(value => value.pendingApp === null && value.windows[closed].state === "closed");
    await click("switch-safari");
    await wait(value => value.activeApp === "safari" && value.windows.safari.state === "open");
    await click("minimize-safari");
    const final = await wait(value => value.windows.safari.state === "minimized");
    assert.equal(final.activeApp, null);
    assert.equal(final.visible.vscode, false);
  }
  await navigate();
  await click("switch-vscode");
  await wait(value => value.windows.safari.state === "animating");
  await click("switch-safari");
  await wait(value => value.windows.safari.state === "open" && value.pendingApp === null);
  assert.equal((await state()).visible.vscode, false);
  await click("switch-vscode");
  await wait(value => value.activeApp === "vscode" && value.windows.vscode.state === "open");
  const before = await state();
  await click("begin-return");
  await wait(value => value.bridge);
  await click("restore-return");
  const restored = await wait(value => !value.bridge);
  assert.deepEqual(restored.visible, before.visible);
  assert.deepEqual(restored.windows, before.windows);
  assert.equal(restored.activeApp, before.activeApp);
  await click("begin-return");
  await wait(value => value.bridge);
  await click("commit-return");
  await wait(value => !value.bridge && value.activeApp === "safari" && value.windows.vscode.state === "minimized");
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await wait(value => value.reducedMotion);
  await click("switch-vscode");
  await wait(value => value.activeApp === "vscode" && value.windows.vscode.state === "open");
  await send("Emulation.setEmulatedMedia", { features: [] });
  await send("Emulation.clearDeviceMetricsOverride");
  return "PASS: native browser commands cancel source/target close, preserve reversal, restore/commit return snapshots and switch with reduced motion using the production desktop controller.";
}
