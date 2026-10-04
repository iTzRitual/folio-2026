import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export async function checkPortfolioBrowser(devtools, sessionId, base, artifactRoot) {
  const evaluate = expression => devtools.evaluate(expression, sessionId);
  const send = (method, params) => devtools.send(method, params, sessionId);
  const waitFor = async (expression, description) => {
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      try {
        const value = await evaluate(expression);
        if (value) return value;
      } catch (error) {
        if (!error.message.includes("Execution context was destroyed") && !error.message.includes("Cannot find context")) throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    await writeFile(path.join(artifactRoot, "failure.png"), Buffer.from(data, "base64"));
    console.error(await evaluate(`JSON.stringify({path:location.pathname,scroll:scrollY,focused:document.activeElement?.outerHTML,buttons:[...document.querySelectorAll('button[aria-label]')].map(button=>({label:button.getAttribute('aria-label'),visibility:getComputedStyle(button).visibility,y:button.getBoundingClientRect().y}))})`));
    throw new Error(`Portfolio check timed out: ${description}`);
  };
  const frames = () => evaluate("new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
  const key = async (key, code, virtualKey) => {
    const text = key === "Enter" ? "\r" : key === " " ? " " : undefined;
    await send("Input.dispatchKeyEvent", { type: "keyDown", key, code, text, windowsVirtualKeyCode: virtualKey });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: virtualKey });
  };
  const resize = async (width, height) => {
    await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
  };
  const screenshot = async name => {
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    await writeFile(path.join(artifactRoot, `${name}.png`), Buffer.from(data, "base64"));
  };
  const returnVisible = `(() => {
    const button = document.querySelector('button[aria-label="Natan Mokrzycki, back to projects"]');
    return button && getComputedStyle(button).visibility !== 'hidden' && button.getBoundingClientRect().height > 0;
  })()`;
  const copyY = () => evaluate("document.querySelector('[data-case-study-copy] p')?.getBoundingClientRect().y");
  const settleCopy = async () => {
    let previous = await copyY();
    assert.ok(Number.isFinite(previous), "Case study copy must have a measurable DOM mirror");
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      await evaluate("new Promise(resolve => setTimeout(resolve, 100))");
      await frames();
      const current = await copyY();
      if (Math.abs(current - previous) < 0.5) return current;
      previous = current;
    }
    throw new Error("Case study reading position did not settle");
  };

  await mkdir(artifactRoot, { recursive: true });
  await send("Page.enable");
  const results = [];
  for (const scenario of [
    { name: "narrow-fine", width: 390, height: 844, input: "fine", reduced: true },
    { name: "narrow-coarse", width: 390, height: 844, input: "coarse", reduced: false },
    { name: "wide-fine", width: 1440, height: 900, input: "fine", reduced: false },
  ]) {
    await resize(scenario.width, scenario.height);
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: scenario.reduced ? "reduce" : "no-preference" }] });
    const url = new URL(`/lab/regression?fixture=portfolio&input=${scenario.input}`, base).href;
    await send("Page.navigate", { url });
    await waitFor("document.querySelector('[data-portfolio-fixture]')?.dataset.fontsReady === 'true' && !!document.querySelector('button[aria-label^=\"Open case study:\"]')", "loaded production scene and fonts");
    await evaluate(`window.scrollTo(0, ${scenario.height * (scenario.input === "coarse" || scenario.width < 600 ? 1.75 : 0.875)})`);
    await frames();
    const project = await waitFor(`(() => {
      return [...document.querySelectorAll('button[aria-label^="Open case study:"]')].find(button => {
        const rect = button.getBoundingClientRect();
        return rect.y > innerHeight * 0.25 && rect.y < innerHeight * 0.75 && getComputedStyle(button).visibility !== 'hidden' && !button.closest('[inert]');
      })?.getAttribute('aria-label');
    })()`, "visible project action");
    const selector = `button[aria-label=${JSON.stringify(project)}]`;
    const offset = await evaluate(`(() => {
      const button = document.querySelector(${JSON.stringify(selector)});
      return button.querySelector('p').getBoundingClientRect().y - button.getBoundingClientRect().y;
    })()`);
    assert.ok(Math.abs(offset) < 0.5, `${scenario.name}: DOM text shifted ${offset}px inside the button`);
    await key("Tab", "Tab", 9);
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus({preventScroll:true})`);
    assert.equal(await evaluate("getComputedStyle(document.activeElement).outlineStyle"), "solid");
    await key("Enter", "Enter", 13);
    await waitFor(returnVisible, "case study return control");
    await waitFor("document.activeElement?.getAttribute('aria-label') === 'Natan Mokrzycki, back to projects'", "entry focus");
    if (scenario.width < 600) {
      await waitFor(`(() => {
        const rect = document.activeElement.getBoundingClientRect();
        return rect.y >= 0 && rect.y < ${scenario.height * 0.1} && rect.height >= 43.5;
      })()`, "mobile return position and touch target");
    }
    const start = await settleCopy();
    await screenshot(`${scenario.name}-start`);
    await key("PageDown", "PageDown", 34);
    await frames();
    const firstReading = await copyY();
    const reading = await settleCopy();
    assert.ok(start - reading > scenario.height * 0.5, `${scenario.name}: PageDown did not move the reading position`);
    if (scenario.reduced) {
      assert.ok(Math.abs(firstReading - reading) < 0.5, `Reduced-motion reading continued to move after the page step: ${firstReading} → ${reading}`);
      await screenshot(`${scenario.name}-reading-reduced`);
      await key("End", "End", 35);
      await settleCopy();
      const narrowFont = await evaluate("getComputedStyle(document.querySelector('[data-case-study-copy] p')).fontSize");
      await resize(1440, 900);
      await waitFor(`getComputedStyle(document.querySelector('[data-case-study-copy] p')).fontSize !== ${JSON.stringify(narrowFont)}`, "wide study reflow");
      const reflow = await settleCopy();
      await key("End", "End", 35);
      const clamped = await settleCopy();
      assert.ok(Math.abs(reflow - clamped) < 2, `Fine-pointer reflow left the reading position outside its limit: ${reflow} → ${clamped}`);
      const wideFont = await evaluate("getComputedStyle(document.querySelector('[data-case-study-copy] p')).fontSize");
      await resize(scenario.width, scenario.height);
      await waitFor(`getComputedStyle(document.querySelector('[data-case-study-copy] p')).fontSize !== ${JSON.stringify(wideFont)}`, "narrow study reflow");
      await settleCopy();
    }
    await key("Escape", "Escape", 27);
    await waitFor(`document.activeElement?.getAttribute('aria-label') === ${JSON.stringify(project)}`, "return focus");
    await key("Tab", "Tab", 9);
    const external = await evaluate(`(() => {
      const link = document.activeElement;
      return { tag: link.tagName, label: link.getAttribute('aria-label'), href: link.getAttribute('href'), clip: getComputedStyle(link).clipPath, outline: getComputedStyle(link).outlineStyle };
    })()`);
    assert.equal(external.tag, "A");
    assert.ok(external.label.startsWith("Visit live site:"));
    assert.ok(external.href.startsWith("https://"));
    assert.equal(external.clip, "none");
    assert.equal(external.outline, "solid");
    await key("Tab", "Tab", 9);
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, modifiers: 8 });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, modifiers: 8 });
    assert.equal(await evaluate("document.activeElement?.getAttribute('aria-label')"), external.label);
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus({preventScroll:true})`);
    await key(" ", "Space", 32);
    await waitFor(returnVisible, "Space activation");
    await key("Escape", "Escape", 27);
    await waitFor(`document.activeElement?.getAttribute('aria-label') === ${JSON.stringify(project)}`, "Space return focus");
    results.push(`PASS: ${scenario.name} native keyboard actions, reading, visible focus and live-site link${scenario.reduced ? "; reduced-motion reading and fine reflow clamp" : ""}`);
  }
  await send("Emulation.clearDeviceMetricsOverride");
  await send("Emulation.setEmulatedMedia", { features: [] });
  return results;
}
