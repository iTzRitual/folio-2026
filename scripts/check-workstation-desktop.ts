import assert from "node:assert/strict";
import { WorkstationDesktop, type DesktopPresentation, type WindowAppId } from "@/lib/workstationDesktop";

function fixture() {
  const desktop = new WorkstationDesktop();
  const visible = { safari: true, vscode: false };
  const amounts = { safari: 0, vscode: 0 };
  const prepared: WindowAppId[] = [];
  let available = true;
  const presentation: DesktopPresentation = {
    canPresent: () => available,
    isVisible: app => visible[app],
    prepareAnimation: app => { prepared.push(app); },
    present: (app, amount, shown) => { amounts[app] = amount; visible[app] = shown; },
  };
  const advance = (seconds = 2, fps = 60, reduced = false) => {
    for (let frame = 0; frame < Math.ceil(seconds * fps); frame++) desktop.update(1 / fps, reduced, presentation);
  };
  return { desktop, visible, amounts, prepared, presentation, advance, unavailable: () => { available = false; } };
}

for (const fps of [30, 60, 120]) {
  const f = fixture();
  f.desktop.switchTo("vscode", false, f.presentation);
  assert.equal(f.desktop.pendingApp, "vscode");
  f.advance(0.2, fps);
  assert.ok(f.amounts.safari > 0 && f.amounts.safari < 1);
  f.advance(2, fps);
  assert.equal(f.desktop.activeApp, "vscode");
  assert.equal(f.desktop.pendingApp, null);
  assert.deepEqual(f.visible, { safari: false, vscode: true });
  assert.equal(f.desktop.runtimes.safari.state, "minimized");
  f.desktop.switchTo("safari", false, f.presentation);
  f.advance(2, fps);
  assert.equal(f.desktop.activeApp, "safari");
  assert.deepEqual(f.visible, { safari: true, vscode: false });
  assert.equal(f.amounts.safari, 0);
  assert.equal(f.amounts.vscode, 1);
}

for (const closed of ["safari", "vscode"] as const) {
  const f = fixture();
  f.desktop.switchTo("vscode", false, f.presentation);
  f.advance(0.15);
  f.desktop.close(closed, f.presentation);
  assert.equal(f.desktop.pendingApp, null, `closing ${closed} cancels the switch`);
  f.advance();
  assert.equal(f.desktop.activeApp, null);
  assert.equal(f.visible.vscode, false);
  assert.equal(f.desktop.runtimes[closed].state, "closed");
  f.desktop.switchTo("safari", false, f.presentation);
  f.advance();
  f.desktop.animateTo("safari", 1, false, f.presentation);
  f.advance();
  assert.equal(f.desktop.activeApp, null);
  assert.equal(f.visible.vscode, false, "a later minimize must not execute the cancelled switch");
  f.desktop.switchTo("vscode", false, f.presentation);
  f.advance();
  assert.equal(f.desktop.activeApp, "vscode", "an explicit later command can open the cancelled target");
}

{
  const f = fixture();
  f.desktop.switchTo("vscode", false, f.presentation);
  f.advance(0.2);
  const amount = f.amounts.safari;
  f.desktop.switchTo("safari", false, f.presentation);
  assert.equal(f.amounts.safari, amount, "reversal starts at the current presentation");
  assert.equal(f.desktop.pendingApp, null);
  f.advance();
  assert.equal(f.desktop.activeApp, "safari");
  assert.equal(f.amounts.safari, 0);
  assert.equal(f.visible.vscode, false);
  f.desktop.close("vscode", f.presentation);
  assert.equal(f.desktop.activeApp, "safari", "closing a background app keeps the active window");
}

for (const reduced of [false, true]) {
  const f = fixture();
  assert.equal(f.desktop.beginReturn(reduced, f.presentation), null);
  f.desktop.switchTo("vscode", reduced, f.presentation);
  f.advance(2, 60, reduced);
  f.desktop.switchTo("safari", reduced, f.presentation);
  f.advance(reduced ? 0.05 : 0.2, 60, reduced);
  const before = f.desktop.snapshot(f.presentation);
  const bridge = f.desktop.beginReturn(reduced, f.presentation);
  assert.ok(bridge);
  assert.equal(bridge.sourceApp, "vscode");
  assert.equal(f.desktop.runtimes.vscode.animation, null);
  assert.equal(f.visible.safari, true);
  f.advance(2, 60, reduced);
  assert.deepEqual(bridge.snapshot, before, "paused return does not alter its snapshot");
  f.desktop.restore(bridge.snapshot, reduced, f.presentation);
  assert.deepEqual(f.desktop.snapshot(f.presentation), before);
  f.advance(2, 60, reduced);
  assert.equal(f.desktop.activeApp, "safari");
  assert.deepEqual(bridge.snapshot, before, "restored animation cannot mutate the stored snapshot");
  f.desktop.restore(bridge.snapshot, reduced, f.presentation);
  f.desktop.commitReturn(bridge.sourceApp, reduced, f.presentation);
  assert.equal(f.desktop.activeApp, "safari");
  assert.equal(f.desktop.pendingApp, null);
  assert.deepEqual(f.visible, { safari: true, vscode: false });
  assert.equal(f.desktop.runtimes.vscode.state, "minimized");
  f.advance(2, 60, reduced);
  assert.equal(f.desktop.activeApp, "safari");
  f.desktop.switchTo("vscode", reduced, f.presentation);
  f.advance(2, 60, reduced);
  assert.equal(f.desktop.activeApp, "vscode");
}

{
  const f = fixture();
  f.desktop.close("safari", f.presentation);
  const bridge = f.desktop.beginReturn(false, f.presentation);
  assert.ok(bridge);
  assert.equal(bridge.sourceApp, null);
  assert.equal(bridge.safariStartAmount, 1);
  f.desktop.restore(bridge.snapshot, false, f.presentation);
  assert.equal(f.visible.safari, false);
  assert.equal(f.desktop.activeApp, null);
  f.desktop.commitReturn(null, false, f.presentation);
  assert.equal(f.desktop.activeApp, "safari");
  assert.equal(f.visible.safari, true);
}

{
  const f = fixture();
  const before = f.desktop.snapshot(f.presentation);
  f.unavailable();
  f.desktop.switchTo("vscode", false, f.presentation);
  f.desktop.animateTo("safari", 1, false, f.presentation);
  assert.deepEqual(f.desktop.snapshot(f.presentation), before);
  assert.deepEqual(f.prepared, []);
}

console.log("PASS: desktop commands preserve switch/minimize/restore at 30/60/120 FPS, cancel pending switches on source/target close, reverse continuously, and restore or commit independent return snapshots in both motion modes.");
