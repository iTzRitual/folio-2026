import { CONFIG } from "@/config/constants";
import { easeInOutQuint } from "@/lib/virtualDesktop";

export type WindowAppId = "safari" | "vscode";

type WindowAnimation = {
  from: number;
  to: number;
  elapsed: number;
  duration: number;
};

type WindowRuntime = {
  state: "open" | "closed" | "minimized" | "animating";
  amount: number;
  animation: WindowAnimation | null;
};

export interface DesktopPresentation {
  canPresent: (app: WindowAppId) => boolean;
  isVisible: (app: WindowAppId) => boolean;
  prepareAnimation: (app: WindowAppId) => void;
  present: (app: WindowAppId, amount: number, visible: boolean, reducedMotion: boolean) => void;
}

type RuntimeView = Readonly<Omit<WindowRuntime, "animation">> & {
  readonly animation: Readonly<WindowAnimation> | null;
};

export type DesktopSnapshot = {
  readonly windows: Readonly<Record<WindowAppId, RuntimeView>>;
  readonly visible: Readonly<Record<WindowAppId, boolean>>;
  readonly activeApp: WindowAppId | null;
  readonly pendingApp: WindowAppId | null;
};

export type DesktopReturn = {
  readonly snapshot: DesktopSnapshot;
  readonly sourceApp: Exclude<WindowAppId, "safari"> | null;
  readonly sourceAmount: number;
  readonly safariStartAmount: number;
};

const APPS = ["safari", "vscode"] as const;
const cloneRuntime = (runtime: RuntimeView): WindowRuntime => ({
  ...runtime,
  animation: runtime.animation ? { ...runtime.animation } : null,
});

export class WorkstationDesktop {
  private windows: Record<WindowAppId, WindowRuntime> = {
    safari: { state: "open", amount: 0, animation: null },
    vscode: { state: "closed", amount: 0, animation: null },
  };
  private active: WindowAppId | null = "safari";
  private pending: WindowAppId | null = null;

  get runtimes(): Readonly<Record<WindowAppId, RuntimeView>> {
    return this.windows;
  }

  get activeApp() {
    return this.active;
  }

  get pendingApp() {
    return this.pending;
  }

  private show(app: WindowAppId, reducedMotion: boolean, presentation: DesktopPresentation) {
    if (!presentation.canPresent(app)) return;
    const runtime = this.windows[app];
    this.active = app;
    if (runtime.state === "minimized" || runtime.animation?.to === 1) {
      this.animateTo(app, 0, reducedMotion, presentation);
      return;
    }
    runtime.animation = null;
    runtime.amount = 0;
    runtime.state = "open";
    presentation.present(app, 0, true, false);
  }

  animateTo(app: WindowAppId, target: 0 | 1, reducedMotion: boolean, presentation: DesktopPresentation) {
    if (!presentation.canPresent(app)) return;
    const runtime = this.windows[app];
    presentation.prepareAnimation(app);
    const baseDuration = reducedMotion
      ? CONFIG.workstation.GENIE_REDUCED_DURATION
      : target === 1
        ? CONFIG.workstation.GENIE_DURATION
        : CONFIG.workstation.GENIE_RESTORE_DURATION;
    runtime.state = "animating";
    runtime.animation = {
      from: runtime.amount,
      to: target,
      elapsed: 0,
      duration: Math.max(CONFIG.workstation.GENIE_MIN_DURATION, baseDuration * Math.abs(target - runtime.amount)),
    };
    presentation.present(app, runtime.amount, true, reducedMotion);
  }

  switchTo(app: WindowAppId, reducedMotion: boolean, presentation: DesktopPresentation) {
    if (!presentation.canPresent(app)) return;
    if (this.active === app) {
      if (this.windows[app].animation?.to === 1) {
        this.pending = null;
        this.animateTo(app, 0, reducedMotion, presentation);
      }
      return;
    }
    if (this.active) {
      const runtime = this.windows[this.active];
      if (presentation.isVisible(this.active) && runtime.state !== "closed" && runtime.state !== "minimized") {
        this.pending = app;
        this.animateTo(this.active, 1, reducedMotion, presentation);
        return;
      }
    }
    this.pending = null;
    this.show(app, reducedMotion, presentation);
  }

  close(app: WindowAppId, presentation: DesktopPresentation) {
    if (this.active === app || this.pending === app) this.pending = null;
    this.windows[app] = { state: "closed", amount: 0, animation: null };
    if (this.active === app) this.active = null;
    presentation.present(app, 0, false, false);
  }

  update(delta: number, reducedMotion: boolean, presentation: DesktopPresentation) {
    for (const app of APPS) {
      const runtime = this.windows[app];
      const animation = runtime.animation;
      if (!animation) continue;
      animation.elapsed += delta;
      const time = Math.min(1, Math.max(0, animation.elapsed / animation.duration));
      runtime.amount = animation.from + (animation.to - animation.from) * easeInOutQuint(time);
      presentation.present(app, runtime.amount, true, reducedMotion);
      if (time < 1) continue;
      runtime.animation = null;
      if (animation.to === 0) {
        runtime.state = "open";
        this.active = app;
        continue;
      }
      runtime.state = "minimized";
      presentation.present(app, runtime.amount, false, reducedMotion);
      if (this.active === app) this.active = null;
      const pending = this.pending;
      this.pending = null;
      if (pending) this.show(pending, reducedMotion, presentation);
    }
  }

  snapshot(presentation: DesktopPresentation): DesktopSnapshot {
    return {
      windows: { safari: cloneRuntime(this.windows.safari), vscode: cloneRuntime(this.windows.vscode) },
      visible: { safari: presentation.isVisible("safari"), vscode: presentation.isVisible("vscode") },
      activeApp: this.active,
      pendingApp: this.pending,
    };
  }

  beginReturn(reducedMotion: boolean, presentation: DesktopPresentation): DesktopReturn | null {
    const safari = this.windows.safari;
    const vscode = this.windows.vscode;
    const vscodeVisible = presentation.isVisible("vscode") && vscode.state !== "closed" && vscode.state !== "minimized";
    const active = vscodeVisible ? "vscode" : this.active;
    if (active === "safari" && safari.state === "open" && presentation.isVisible("safari")) return null;
    const sourceApp = active === "vscode" ? active : null;
    const result: DesktopReturn = {
      snapshot: this.snapshot(presentation),
      sourceApp,
      sourceAmount: sourceApp ? this.windows[sourceApp].amount : 1,
      safariStartAmount: active === "safari" ? safari.amount : 1,
    };
    safari.animation = null;
    if (sourceApp) {
      this.windows[sourceApp].animation = null;
      this.windows[sourceApp].state = "open";
    }
    presentation.present("safari", result.safariStartAmount, true, reducedMotion);
    return result;
  }

  restore(snapshot: DesktopSnapshot, reducedMotion: boolean, presentation: DesktopPresentation) {
    this.windows = { safari: cloneRuntime(snapshot.windows.safari), vscode: cloneRuntime(snapshot.windows.vscode) };
    this.active = snapshot.activeApp;
    this.pending = snapshot.pendingApp;
    for (const app of APPS) presentation.present(app, this.windows[app].amount, snapshot.visible[app], reducedMotion);
  }

  commitReturn(sourceApp: DesktopReturn["sourceApp"], reducedMotion: boolean, presentation: DesktopPresentation) {
    this.windows.safari = { state: "open", amount: 0, animation: null };
    this.active = "safari";
    this.pending = null;
    presentation.present("safari", 0, true, reducedMotion);
    if (!sourceApp) return;
    this.windows[sourceApp] = { state: "minimized", amount: 1, animation: null };
    presentation.present(sourceApp, 1, false, reducedMotion);
  }
}
