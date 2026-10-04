import assert from "node:assert/strict";

const viewports = [[320, 568], [568, 320], [390, 844], [430, 932], [600, 900], [768, 1024], [900, 500], [1024, 768], [1440, 900], [1920, 1080]];

export async function checkLayoutBrowser(devtools, sessionId, base) {
  const send = (method, params) => devtools.send(method, params, sessionId);
  const evaluate = expression => devtools.evaluate(expression, sessionId);
  const wait = async (expression, label) => {
    const deadline = Date.now() + 45_000;
    while (Date.now() < deadline) {
      try { if (await evaluate(expression)) return; }
      catch (error) {
        if (!error.message.includes("Execution context was destroyed") && !error.message.includes("Cannot find context")) throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw new Error(`Layout check timed out: ${label}`);
  };
  const contract = () => evaluate("JSON.parse(document.querySelector('[data-layout-contract]').dataset.layoutContract)");
  const findLine = line => `(() => {
    const line = ${JSON.stringify(line)};
    const element = [...document.querySelectorAll('[data-portfolio-fixture] p')].find(p => !p.closest('.no-js-fallback') && p.textContent.replaceAll('\\u200b','').trim() === line.trim());
    if (!element) return null;
    const r = element.getBoundingClientRect();
    return {x:r.x,y:r.y,width:r.width,height:r.height,visibility:getComputedStyle(element).visibility};
  })()`;
  const frame = () => send("Page.captureScreenshot", { format: "png" });
  const scroll = async y => {
    await evaluate(`window.scrollTo(0, ${y})`);
    await frame();
    await frame();
  };
  await send("Page.enable");
  let scenarios = 0;
  for (const input of ["fine", "coarse"]) {
    for (const bio of ["narrative", "manifesto", "facts"]) {
      await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
      await send("Page.navigate", { url: new URL(`/lab/regression?fixture=portfolio&input=${input}&bio=${bio}`, base).href });
      await wait("document.querySelector('[data-portfolio-fixture]')?.dataset.rendererStatus === 'ready' && document.querySelector('[data-portfolio-fixture]')?.dataset.fontsReady === 'true' && document.fonts.status === 'loaded'", `${input}/${bio} ready`);
      for (const [width, height] of viewports) {
        const label = `${width}x${height}/${input}/${bio}`;
        await scroll(0);
        await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
        await wait(`(() => { const c = JSON.parse(document.querySelector('[data-layout-contract]')?.dataset.layoutContract ?? 'null'); return c?.width === ${width} && c?.height === ${height}; })()`, `${label} viewport`);
        const { layout, restY, transitionDistance, depthScale, scrollHeight } = await contract();
        await wait(`Math.abs(document.querySelector('[data-portfolio-fixture] > main.pointer-events-none').getBoundingClientRect().height - ${scrollHeight}) < 2`, `${label} spacer reflow`);
        for (const [section, lines] of Object.entries(layout.sectionLines)) {
          const first = lines[0];
          const target = Math.max(transitionDistance, Math.min(transitionDistance + layout.overflow, transitionDistance + layout.sections[section].bodyY + (restY - height * 0.45) / depthScale));
          await scroll(target);
          await wait(`${findLine(first)} !== null`, `${label}/${section} line mount`);
          for (const line of lines) {
            const row = await evaluate(findLine(line));
            assert.ok(row, `${label}/${section}: every measured line is rendered (${line})`);
            assert.ok(row.x >= -2 && row.x + row.width <= width + 2, `${label}/${section}: row leaves the viewport (${row.x}, ${row.width})`);
          }
          const rect = await evaluate(findLine(first));
          assert.ok(Object.values(rect).slice(0, 4).every(Number.isFinite), `${label}/${section}: finite DOM geometry`);
          const actualScroll = await evaluate("scrollY");
          const expectedY = restY + (layout.sections[section].bodyY - (actualScroll - transitionDistance)) * depthScale;
          assert.ok(Math.abs(rect.y - expectedY) < 3, `${label}/${section}: body projection ${rect.y} differs from ${expectedY}`);
          assert.ok(rect.x >= -2 && rect.x + rect.width <= width + 2, `${label}/${section}: text leaves the viewport (${rect.x}, ${rect.width})`);
          if (lines.length > 1) {
            const next = await evaluate(findLine(lines[1]));
            assert.ok(next, `${label}/${section}: second line exists`);
            const pitch = section === "projects" ? layout.projectLineHeight : layout.bodyLineHeight;
            assert.ok(Math.abs(next.y - rect.y - pitch * depthScale) < 2, `${label}/${section}: DOM row pitch differs from layout`);
          }
        }
        await scroll(transitionDistance + layout.overflow);
        const lastBio = layout.bioLines.filter(Boolean).at(-1);
        await wait(`${findLine(lastBio)} !== null`, `${label} Bio mount`);
        const lastRect = await evaluate(findLine(lastBio));
        assert.ok(lastRect.y >= 0 && lastRect.y + lastRect.height <= height + 2, `${label}: final Bio line must be reachable before workstation reveal`);
        scenarios++;
        console.log(`PASS: layout ${label}`);
      }
    }
  }
  await send("Emulation.clearDeviceMetricsOverride");
  return `PASS: ${scenarios} mounted production-scene viewport/Bio/input scenarios retain font-ready DOM projections, row pitches, horizontal clearance, scroll extents and a reachable final Bio line.`;
}
