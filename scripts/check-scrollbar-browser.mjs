import assert from "node:assert/strict";

export async function checkScrollbarBrowser(devtools, sessionId, base) {
  const send = (method, params) => devtools.send(method, params, sessionId);
  const evaluate = expression => devtools.evaluate(expression, sessionId);
  const state = () => evaluate("(() => { const output = document.querySelector('[data-scrollbar-fixture]'); return output?.dataset.ready === 'true' ? {...output.dataset, point:JSON.parse(output.dataset.point)} : null; })()");
  const wait = async predicate => {
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      try {
        const value = await state();
        if (value && predicate(value)) return value;
      } catch (error) {
        if (!error.message.includes("Execution context was destroyed") && !error.message.includes("Cannot find context")) throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Scrollbar browser check timed out: ${JSON.stringify(await state())}`);
  };
  const mouse = (type, x, y, button = "none", buttons = 0) => send("Input.dispatchMouseEvent", { type, x, y, button, buttons, clickCount: button === "none" ? 0 : 1 });
  const begin = async () => {
    const { point } = await state();
    await mouse("mouseMoved", point.x, point.y);
    await mouse("mousePressed", point.x, point.y, "left", 1);
    return wait(value => value.active === "editor-y" && value.pointer !== "null");
  };
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: new URL("/lab/regression?fixture=scrollbar", base).href });
  await wait(() => true);
  await begin();
  await mouse("mouseMoved", 1500, 960, "left", 1);
  await wait(value => Number(value.scroll) > 100);
  await mouse("mouseReleased", 1500, 960, "left");
  await wait(value => value.pointer === "null" && value.active === "null");
  await mouse("mousePressed", 720, 450, "left", 1);
  await mouse("mouseReleased", 720, 450, "left");
  await wait(value => Number(value.clicks) === 1);
  const captured = await begin();
  assert.equal(await evaluate(`document.querySelector('canvas').hasPointerCapture(${Number(captured.pointer)})`), true);
  await evaluate(`document.querySelector('canvas').releasePointerCapture(${Number(captured.pointer)})`);
  await wait(value => value.pointer === "null" && value.active === "null");
  await mouse("mouseReleased", captured.point.x, captured.point.y, "left");
  await begin();
  await send("Emulation.setDeviceMetricsOverride", { width: 1200, height: 800, deviceScaleFactor: 1, mobile: false });
  await wait(value => value.pointer === "null" && value.active === "null");
  await mouse("mouseReleased", 1190, 790, "left");
  await begin();
  await evaluate("document.querySelector('button').focus()");
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", text: "\r", windowsVirtualKeyCode: 13 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  await wait(value => value.enabled === "false" && value.pointer === "null" && value.active === "null");
  await mouse("mouseReleased", 1190, 790, "left");
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", text: "\r", windowsVirtualKeyCode: 13 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  await wait(value => value.enabled === "true");
  await mouse("mousePressed", 600, 400, "left", 1);
  await mouse("mouseReleased", 600, 400, "left");
  await wait(value => Number(value.clicks) >= 2);
  await send("Emulation.clearDeviceMetricsOverride");
  return "PASS: real R3F capture routes off-mesh drag; outside release, native capture loss, resize and signal cancellation clear the gesture and preserve the next click.";
}
