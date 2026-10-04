import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkPortfolioBrowser } from "./check-portfolio-browser.mjs";
import { checkScrollbarBrowser } from "./check-scrollbar-browser.mjs";
import { checkRecoveryBrowser } from "./check-recovery-browser.mjs";
import { checkDesktopBrowser } from "./check-desktop-browser.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const timeout = 120_000;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const binaries = process.platform === "win32"
  ? ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"]
  : process.platform === "darwin"
    ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]
    : ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"];
const binary = process.env.BROWSER_BINARY ?? binaries.find(existsSync);
if (!binary || !existsSync(binary)) throw new Error("Chrome or Edge is required. Set BROWSER_BINARY to an installed Chromium executable.");

function stop(child) {
  if (!child || child.exitCode !== null) return Promise.resolve();
  if (process.platform !== "win32") {
    child.kill("SIGTERM");
    return Promise.resolve();
  }
  return new Promise(resolve => {
    const killer = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
    killer.once("error", resolve);
    killer.once("exit", resolve);
  });
}

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

async function waitForServer(url, child) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (child?.exitCode !== null && child?.exitCode !== undefined) throw new Error(`Development server exited with ${child.exitCode}`);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (response.ok) return;
      if (response.status === 404) throw new Error("Regression route is unavailable. Use a development server.");
    } catch (error) {
      if (error.message.includes("Regression route")) throw error;
    }
    await delay(250);
  }
  throw new Error(`Server did not become ready: ${url}`);
}

class DevTools {
  pending = new Map();
  nextId = 0;

  constructor(socket) {
    this.socket = socket;
    socket.addEventListener("message", event => {
      const message = JSON.parse(event.data);
      const request = this.pending.get(message.id);
      if (!request) return;
      clearTimeout(request.timer);
      this.pending.delete(message.id);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
    });
    socket.addEventListener("close", () => {
      for (const request of this.pending.values()) {
        clearTimeout(request.timer);
        request.reject(new Error("Browser disconnected"));
      }
      this.pending.clear();
    });
  }

  send(method, params = {}, sessionId) {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`DevTools timed out: ${method}`));
      }, timeout);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }

  async evaluate(expression, sessionId) {
    const result = await this.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, sessionId);
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result.result.value;
  }
}

let server;
let browser;
let socket;
let serverOutput = "";
const profileRoot = path.resolve(tmpdir());
const profile = await mkdtemp(path.join(profileRoot, "folio-browser-check-"));
try {
  const urlIndex = process.argv.indexOf("--url");
  const portfolio = process.argv.includes("--portfolio");
  const scrollbar = process.argv.includes("--scrollbar");
  const recovery = process.argv.includes("--recovery");
  const desktop = process.argv.includes("--desktop");
  let base = urlIndex < 0 ? process.argv.slice(2).find(argument => !argument.startsWith("--")) : process.argv[urlIndex + 1];
  if (urlIndex >= 0 && !base) throw new Error("--url requires the development server URL");
  if (!base) {
    const port = await freePort();
    base = `http://127.0.0.1:${port}`;
    server = spawn(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "dev", "-p", String(port)], {
      cwd: root, windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
    });
    const record = chunk => { serverOutput = (serverOutput + chunk).slice(-8000); };
    server.stdout.on("data", record);
    server.stderr.on("data", record);
  }
  const url = new URL("/lab/regression", base).href;
  await waitForServer(url, server);
  browser = spawn(binary, [
    "--headless=new", "--no-first-run", "--no-default-browser-check",
    "--remote-debugging-port=0", `--user-data-dir=${profile}`,
    "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "about:blank",
  ], { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
  const endpoint = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Browser did not expose a DevTools endpoint")), timeout);
    browser.once("error", error => { clearTimeout(timer); reject(error); });
    browser.once("exit", code => { clearTimeout(timer); reject(new Error(`Browser exited with ${code}`)); });
    let output = "";
    browser.stderr.on("data", chunk => {
      output = (output + chunk).slice(-8000);
      const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) { clearTimeout(timer); resolve(match[1]); }
    });
  });
  socket = new WebSocket(endpoint);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  const devtools = new DevTools(socket);
  const { targetId } = await devtools.send("Target.createTarget", { url: portfolio || scrollbar || recovery || desktop ? "about:blank" : url });
  const { sessionId } = await devtools.send("Target.attachToTarget", { targetId, flatten: true });
  if (desktop) {
    console.log(await checkDesktopBrowser(devtools, sessionId, base));
  } else if (recovery) {
    console.log(await checkRecoveryBrowser(devtools, sessionId, base, path.join(root, "plans/browser-regressions")));
  } else if (scrollbar) {
    console.log(await checkScrollbarBrowser(devtools, sessionId, base));
  } else if (portfolio) {
    const results = await checkPortfolioBrowser(devtools, sessionId, base, path.join(root, "plans/browser-regressions"));
    console.log(results.join("\n"));
    console.log("PASS: mounted production scene keyboard and reflow checks. Screenshots saved in plans/browser-regressions.");
  } else {
  const deadline = Date.now() + timeout;
  let result;
  while (Date.now() < deadline) {
    result = await devtools.evaluate(`(() => {
      const output = document.querySelector('[data-regression-result]');
      return output ? { status: output.dataset.status, text: output.textContent } : null;
    })()`, sessionId);
    if (result && result.status !== "running") break;
    await delay(250);
  }
  if (result?.status !== "passed") throw new Error(result?.text ?? "Browser regression checks did not finish");
  console.log(result.text);
  console.log("PASS: browser GPU correctness checks completed with Chromium SwiftShader. This is not a hardware performance measurement.");
  }
} catch (error) {
  if (serverOutput) console.error(serverOutput);
  throw error;
} finally {
  socket?.close();
  await stop(browser);
  await stop(server);
  const resolved = path.resolve(profile);
  if (path.dirname(resolved) !== profileRoot || !path.basename(resolved).startsWith("folio-browser-check-")) {
    throw new Error("Refusing to remove an unexpected browser profile path");
  }
  await rm(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
