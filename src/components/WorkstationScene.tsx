"use client";

import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Suspense, useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { CONFIG } from "@/config/constants";
import { useHeroLayout } from "@/context/HeroLayoutContext";
import { useHeroTransition } from "@/context/HeroTransitionContext";
import { useDebugSettings } from "@/context/DebugSettingsContext";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { caseStudyStage } from "@/lib/caseStudyStage";
import {
  acquireRootScrollLock,
  type RootScrollLockLease,
} from "@/lib/rootScrollLock";
import { useSceneCapabilities } from "@/context/SceneCapabilitiesContext";
import { useSceneMotion } from "@/context/SceneMotionContext";
import { useTheme } from "@/context/ThemeContext";
import {
  beginVSCodeScrollbarDrag,
  captureVSCodeSession,
  createVSCodeRenderer,
  endVSCodeScrollbarDrag,
  handleVSCodeClick,
  handleVSCodeWheel,
  restoreVSCodeSession,
  setVSCodeLoadError,
  setVSCodeSources,
  updateVSCodeHover,
  updateVSCodeScrollbarDrag,
  type VSCodeScrollbarDrag,
  type VSCodeRenderer,
  type VSCodeSessionSnapshot,
} from "@/lib/vscodeRenderer";
import {
  loadSourceManifest,
  refreshSourceManifest,
  type SourceManifest,
} from "@/lib/sourceManifest";
import { HEADER_LAYER } from "./Effects/HeaderExclusionEffect";
import { THEME_SWEEP_LAYER } from "./ThemeSweep";
import { createMonitorState, monitorHasSignal } from "@/lib/monitorState";
import { CRTMonitor } from "./CRTMonitor";
import { WorkstationEnvironment } from "./WorkstationEnvironment";
import {
  CRTDisplay,
  type CRTDisplayHandle,
} from "./CRTDisplay";
import {
  PlayStationSignal,
  type PlayStationSignalHandle,
} from "./PlayStationSignal";
import { createCRTGeometry, crtMorph, getCRTReferenceFrame } from "@/lib/crtScreen";
import {
  DOCK_APPS,
  SAFARI_DOCK_INDEX,
  VSCODE_DOCK_INDEX,
  WORKSTATION_WALLPAPER_SRC,
  affordableAberrationTaps,
  configureGenieGeometry,
  configurePageAberrationMaterial,
  createBrowserChromeTexture,
  createDockRenderer,
  createPageAberrationMaterial,
  createPageMask,
  createPlaneGeometry,
  createToolbarRenderer,
  createWindowChromeMaterial,
  drawToolbar,
  easeInOutQuint,
  getBrowserControlHit,
  getBrowserLayout,
  getDockHoveredIndex,
  getDockItemBounds,
  getPageTargetDimensions,
  getTextureDimensions,
  getToolbarHit,
  isThemeToggleHit,
  setDockAppRunning,
  setGeniePresentation,
  setHtmlOverlayVisibility,
  updateDockRenderer,
  updateToolbarRenderer,
  type DockRenderer,
  type GenieUniforms,
  type PageUvBounds,
  type ToolbarRenderer,
} from "@/lib/virtualDesktop";


type WindowAppId = "safari" | "vscode";

type WindowAnimation = {
  from: number;
  to: number;
  elapsed: number;
  duration: number;
};

type WindowState = "open" | "closed" | "minimized" | "animating";

type WindowRuntime = {
  state: WindowState;
  amount: number;
  animation: WindowAnimation | null;
};

type WindowRuntimeSnapshot = WindowRuntime;

type ReturnBridgeAutoScroll = {
  elapsed: number;
  duration: number;
  startY: number;
  targetY: number;
};

type ReturnBridge = {
  sourceApp: Exclude<WindowAppId, "safari"> | null;
  sourceAmount: number;
  safariStartAmount: number;
  safariVisible: boolean;
  vscodeVisible: boolean;
  safariRuntime: WindowRuntimeSnapshot;
  vscodeRuntime: WindowRuntimeSnapshot;
  activeApp: WindowAppId | null;
  pendingApp: WindowAppId | null;
  idleElapsed: number;
  lastScrollY: number;
  autoScroll: ReturnBridgeAutoScroll | null;
};

export function WorkstationScene({ children }: { children: ReactNode }) {
  const monitorState = useMemo(createMonitorState, []);
  const { scene: crtModel } = useGLTF(CONFIG.workstation.CRT_MODEL_URL);
  const crtFrame = useMemo(() => getCRTReferenceFrame(crtModel), [crtModel]);
  const {
    viewport,
    size: layoutSize,
    leftX,
    rightX,
  } = useHeroLayout();
  const { revealProgressRef } = useHeroTransition();
  const { scrollVelocityRef } = useSceneMotion();
  const { camera, events, gl, scene, size } = useThree();
  if (!(camera instanceof THREE.PerspectiveCamera)) {
    throw new Error("The workstation scene requires a perspective camera");
  }
  const prefersReducedMotion = usePrefersReducedMotion();
  const { scrollBlur: scroll, desktop } = useDebugSettings();
  const { inputMode, layoutMode, qualityTier } = useSceneCapabilities();
  const { theme, setTheme } = useTheme();
  const pageGroupRef = useRef<THREE.Group>(null);
  const surfaceGroupRef = useRef<THREE.Group>(null);
  const windowGroupRef = useRef<THREE.Group>(null);
  const vscodeWindowGroupRef = useRef<THREE.Group>(null);
  const wallpaperMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const chromeMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const vscodeMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const dockMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const toolbarMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const interactionMeshRef = useRef<THREE.Mesh>(null);
  const crtScreenRef = useRef<CRTDisplayHandle>(null);
  const pageAberrationMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const targetRef = useRef<THREE.WebGLRenderTarget | null>(null);
  const targetQualityRef = useRef(qualityTier);
  const captureCamera = useMemo(() => new THREE.PerspectiveCamera(), []);
  const chromeTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const vscodeTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const vscodeRendererRef = useRef<VSCodeRenderer | null>(null);
  const vscodeSessionRef = useRef<VSCodeSessionSnapshot | null>(null);
  const sourceManifestRef = useRef<SourceManifest | null>(null);
  const dockTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const dockRendererRef = useRef<DockRenderer | null>(null);
  const toolbarTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const toolbarRendererRef = useRef<ToolbarRenderer | null>(null);
  const desktopSignalGroupRef = useRef<THREE.Group>(null);
  const playStationSignalRef = useRef<PlayStationSignalHandle>(null);
  const syncPlayStationSignal = useCallback(() => {
    playStationSignalRef.current?.syncFromMonitor();
  }, []);
  useFrame(() => {
    if (desktopSignalGroupRef.current) {
      desktopSignalGroupRef.current.visible = monitorHasSignal(monitorState);
    }
  });
  const pageMaskRef = useRef<THREE.CanvasTexture | null>(null);
  const surfaceTransformRef = useRef<{ scale: number; y: number } | null>(
    null,
  );
  const capturedRef = useRef(false);
  const capturePendingRef = useRef(false);
  const htmlOverlayHiddenRef = useRef(false);
  const pageUvBoundsRef = useRef<PageUvBounds | null>(null);
  const browserLayoutRef = useRef<ReturnType<typeof getBrowserLayout> | null>(null);
  const windowRuntimesRef = useRef<Record<WindowAppId, WindowRuntime>>({
    safari: { state: "open", amount: 0, animation: null },
    vscode: { state: "closed", amount: 0, animation: null },
  });
  const activeAppRef = useRef<WindowAppId | null>("safari");
  const pendingAppRef = useRef<WindowAppId | null>(null);
  const returnBridgeRef = useRef<ReturnBridge | null>(null);
  const previousRevealRef = useRef<number | null>(null);
  const sourceLoadStartedRef = useRef(false);
  const sourceRefreshPendingRef = useRef(false);
  const vscodeScrollbarDragRef = useRef<VSCodeScrollbarDrag | null>(null);
  const suppressVSCodeClickRef = useRef(false);
  const returnScrollLeaseRef = useRef<RootScrollLockLease | null>(null);
  const currentMouseRef = useRef(new THREE.Vector2(0.5, 0.5));
  const targetMouseRef = useRef(new THREE.Vector2(0.5, 0.5));
  const prevMouseRef = useRef(new THREE.Vector2(0.5, 0.5));
  const mouseIntensityRef = useRef(0);
  const intersectionsRef = useRef<THREE.Intersection[]>([]);
  const interactionUvRef = useRef(new THREE.Vector2());

  const mapContentUv = useCallback(
    (source: THREE.Vector2 | undefined, target: THREE.Vector2) =>
      source && crtScreenRef.current?.mapContentUv(source, target)
        ? target
        : null,
    [],
  );

  const lockReturnScroll = (y: number) => {
    returnScrollLeaseRef.current ??= acquireRootScrollLock(y);
    returnScrollLeaseRef.current.update(y);
  };

  const releaseReturnScroll = () => {
    returnScrollLeaseRef.current?.release();
    returnScrollLeaseRef.current = null;
  };

  const taps = Math.min(
    scroll.taps,
    affordableAberrationTaps(size.width, size.height),
    inputMode === "coarse" ? 4 : CONFIG.customAberration.SCROLL_TAPS,
  );

  const genieUniforms = useMemo<GenieUniforms>(
    () => ({
      progress: { value: 0 },
      opacity: { value: 1 },
      window: { value: new THREE.Vector4(0, 0, 1, 1) },
      target: { value: new THREE.Vector3(0, 0, 0.05) },
    }),
    [],
  );
  const vscodeGenieUniforms = useMemo<GenieUniforms>(
    () => ({
      progress: { value: 0 },
      opacity: { value: 1 },
      window: { value: new THREE.Vector4(0, 0, 1, 1) },
      target: { value: new THREE.Vector3(0, 0, 0.05) },
    }),
    [],
  );
  const pageAberrationMaterial = useMemo(
    () => createPageAberrationMaterial(taps, genieUniforms),
    [genieUniforms, taps],
  );
  const windowChromeMaterial = useMemo(
    () => createWindowChromeMaterial(genieUniforms),
    [genieUniforms],
  );
  const vscodeWindowMaterial = useMemo(
    () => createWindowChromeMaterial(vscodeGenieUniforms),
    [vscodeGenieUniforms],
  );

  const planeWidth = Math.max(
    viewport.width,
    viewport.height *
      (1 + CONFIG.workstation.BROWSER_CHROME_HEIGHT_MULT) *
      CONFIG.workstation.PLANE_ASPECT,
  );
  const planeHeight = planeWidth / CONFIG.workstation.PLANE_ASPECT;
  const desktopGeometry = useMemo(
    () => createPlaneGeometry(planeWidth, planeHeight),
    [planeWidth, planeHeight],
  );
  useEffect(() => () => desktopGeometry.dispose(), [desktopGeometry]);
  const { surface: planeGeometry, border: borderGeometry, updateSurface } = useMemo(
    () => createCRTGeometry(crtModel, planeWidth),
    [crtModel, planeWidth],
  );

  useEffect(() => {
    return () => {
      planeGeometry.dispose();
      borderGeometry.dispose();
    };
  }, [planeGeometry, borderGeometry]);

  useEffect(() => {
    return () => pageAberrationMaterial.dispose();
  }, [pageAberrationMaterial]);

  useEffect(() => {
    let wallpaperTexture: THREE.Texture | null = null;
    let cancelled = false;

    new THREE.TextureLoader().load(WORKSTATION_WALLPAPER_SRC, (texture) => {
      if (cancelled) {
        texture.dispose();
        return;
      }

      const imageAspect = texture.image.width / texture.image.height;
      const planeAspect = CONFIG.workstation.PLANE_ASPECT;
      const repeatX = Math.min(1, planeAspect / imageAspect);
      const repeatY = Math.min(1, imageAspect / planeAspect);

      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.repeat.set(repeatX, repeatY);
      texture.offset.set((1 - repeatX) / 2, (1 - repeatY) / 2);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      texture.needsUpdate = true;
      wallpaperTexture = texture;

      if (wallpaperMaterialRef.current) {
        wallpaperMaterialRef.current.map = texture;
        wallpaperMaterialRef.current.needsUpdate = true;
      }
    });

    return () => {
      cancelled = true;
      wallpaperTexture?.dispose();
    };
  }, []);

  useEffect(() => {
    chromeMaterialRef.current = windowChromeMaterial;
    return () => {
      if (chromeMaterialRef.current === windowChromeMaterial) {
        chromeMaterialRef.current = null;
      }
      windowChromeMaterial.dispose();
    };
  }, [windowChromeMaterial]);

  useEffect(() => {
    vscodeMaterialRef.current = vscodeWindowMaterial;
    return () => {
      if (vscodeMaterialRef.current === vscodeWindowMaterial) {
        vscodeMaterialRef.current = null;
      }
      vscodeWindowMaterial.dispose();
    };
  }, [vscodeWindowMaterial]);

  useEffect(() => {
    pageAberrationMaterialRef.current = pageAberrationMaterial;
    return () => {
      if (pageAberrationMaterialRef.current === pageAberrationMaterial) {
        pageAberrationMaterialRef.current = null;
      }
    };
  }, [pageAberrationMaterial]);

  useEffect(() => {
    const target = targetRef.current;
    const pageMask = pageMaskRef.current;
    const bounds = pageUvBoundsRef.current;

    if (target && pageMask && bounds) {
      configurePageAberrationMaterial(
        pageAberrationMaterial,
        target,
        pageMask,
        bounds,
      );
    }
  }, [pageAberrationMaterial]);

  useEffect(() => {
    capturedRef.current = false;
    capturePendingRef.current = false;
    targetRef.current?.dispose();
    targetRef.current = null;
    chromeTextureRef.current?.dispose();
    chromeTextureRef.current = null;
    if (vscodeRendererRef.current) {
      endVSCodeScrollbarDrag(vscodeRendererRef.current);
      vscodeSessionRef.current = captureVSCodeSession(vscodeRendererRef.current);
    }
    vscodeTextureRef.current?.dispose();
    vscodeTextureRef.current = null;
    vscodeRendererRef.current = null;
    dockTextureRef.current?.dispose();
    dockTextureRef.current = null;
    dockRendererRef.current = null;
    toolbarTextureRef.current?.dispose();
    toolbarTextureRef.current = null;
    toolbarRendererRef.current = null;
    pageMaskRef.current?.dispose();
    pageMaskRef.current = null;
    surfaceTransformRef.current = null;
    pageUvBoundsRef.current = null;
    browserLayoutRef.current = null;
    vscodeScrollbarDragRef.current = null;
    suppressVSCodeClickRef.current = false;

    if (pageGroupRef.current) pageGroupRef.current.visible = true;
    if (surfaceGroupRef.current) {
      surfaceGroupRef.current.visible = false;
      surfaceGroupRef.current.position.y = 0;
      surfaceGroupRef.current.scale.setScalar(1);
    }
  }, [
    genieUniforms,
    desktop.dockScale,
    desktop.dockOffsetX,
    desktop.dockOffsetY,
    desktop.safariAddressScale,
    desktop.safariBottomSafeArea,
    desktop.safariChromeScale,
    desktop.safariControlsScale,
    size.height,
    size.width,
    vscodeGenieUniforms,
  ]);

  useEffect(() => {
    const prepare = () => {
      if (!capturedRef.current) capturePendingRef.current = true;
    };
    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(prepare, { timeout: 1000 });
      return () => window.cancelIdleCallback(idleId);
    }
    const timeoutId = globalThis.setTimeout(prepare, 200);
    return () => globalThis.clearTimeout(timeoutId);
  }, [size.height, size.width]);

  useEffect(() => {
    return () => {
      releaseReturnScroll();
      targetRef.current?.dispose();
      chromeTextureRef.current?.dispose();
      vscodeTextureRef.current?.dispose();
      vscodeRendererRef.current = null;
      dockTextureRef.current?.dispose();
      dockRendererRef.current = null;
      toolbarTextureRef.current?.dispose();
      toolbarRendererRef.current = null;
      pageMaskRef.current?.dispose();
      setHtmlOverlayVisibility(
        events.connected instanceof HTMLElement ? events.connected : null,
        gl.domElement,
        false,
      );
    };
  }, [events, gl]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const refreshSources = async () => {
      const renderer = vscodeRendererRef.current;
      if (
        !sourceLoadStartedRef.current ||
        !renderer ||
        sourceRefreshPendingRef.current
      ) {
        return;
      }

      sourceRefreshPendingRef.current = true;
      try {
        const manifest = await refreshSourceManifest(renderer.sourceVersion);
        if (manifest) {
          sourceManifestRef.current = manifest;
          setVSCodeSources(renderer, manifest);
        }
      } catch {
        return;
      } finally {
        sourceRefreshPendingRef.current = false;
      }
    };
    const interval = window.setInterval(
      refreshSources,
      CONFIG.workstation.VSCODE_SOURCE_REFRESH_MS,
    );

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const contentUv = new THREE.Vector2();
    const intersections: THREE.Intersection[] = [];
    const onWheel = (event: WheelEvent) => {
      if (!monitorHasSignal(monitorState)) return;
      const bridge = returnBridgeRef.current;
      if (bridge?.autoScroll) {
        bridge.autoScroll = null;
        bridge.idleElapsed = 0;
        releaseReturnScroll();
      }

      const renderer = vscodeRendererRef.current;
      const interactionMesh = interactionMeshRef.current;

      if (
        !renderer ||
        !interactionMesh ||
        !capturedRef.current ||
        returnBridgeRef.current !== null ||
        activeAppRef.current !== "vscode" ||
        windowRuntimesRef.current.vscode.state !== "open"
      ) {
        return;
      }

      const bounds = gl.domElement.getBoundingClientRect();
      if (
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom
      ) {
        return;
      }

      pointer.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      intersections.length = 0;
      raycaster.intersectObject(interactionMesh, false, intersections);
      const pageUv = mapContentUv(intersections[0]?.uv, contentUv);

      if (
        !pageUv ||
        !handleVSCodeWheel(
          renderer,
          pageUv.x * renderer.canvas.width,
          (1 - pageUv.y) * renderer.canvas.height,
          event.deltaX,
          event.deltaY,
        )
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };

    const cancelAutoScroll = () => {
      const bridge = returnBridgeRef.current;
      if (!bridge?.autoScroll) return;
      bridge.autoScroll = null;
      bridge.idleElapsed = 0;
      releaseReturnScroll();
    };

    window.addEventListener("wheel", onWheel, {
      capture: true,
      passive: false,
    });
    window.addEventListener("touchstart", cancelAutoScroll, { capture: true });
    window.addEventListener("pointerdown", cancelAutoScroll, { capture: true });
    window.addEventListener("keydown", cancelAutoScroll, { capture: true });
    return () => {
      window.removeEventListener("wheel", onWheel, { capture: true });
      window.removeEventListener("touchstart", cancelAutoScroll, {
        capture: true,
      });
      window.removeEventListener("pointerdown", cancelAutoScroll, {
        capture: true,
      });
      window.removeEventListener("keydown", cancelAutoScroll, {
        capture: true,
      });
    };
  }, [camera, gl, mapContentUv, monitorState]);

  const getWindowGroup = (appId: WindowAppId) =>
    appId === "safari" ? windowGroupRef.current : vscodeWindowGroupRef.current;

  const getWindowGenie = (appId: WindowAppId) =>
    appId === "safari" ? genieUniforms : vscodeGenieUniforms;

  const getWindowDockIndex = (appId: WindowAppId) =>
    appId === "safari" ? SAFARI_DOCK_INDEX : VSCODE_DOCK_INDEX;

  const startSourceLoad = () => {
    if (sourceLoadStartedRef.current) return;
    sourceLoadStartedRef.current = true;

    loadSourceManifest()
      .then((manifest) => {
        sourceManifestRef.current = manifest;
        if (vscodeRendererRef.current) {
          setVSCodeSources(vscodeRendererRef.current, manifest);
          if (vscodeSessionRef.current) {
            restoreVSCodeSession(
              vscodeRendererRef.current,
              vscodeSessionRef.current,
            );
          }
        }
      })
      .catch(() => {
        if (vscodeRendererRef.current) {
          setVSCodeLoadError(vscodeRendererRef.current);
        }
      });
  };

  const getReturnBridgeTargetY = (scrollReveal: number) =>
    window.scrollY -
    scrollReveal *
      size.height *
      CONFIG.workstation.REVEAL_VIEWPORTS;

  const beginReturnBridge = () => {
    const safariRuntime = windowRuntimesRef.current.safari;
    const vscodeRuntime = windowRuntimesRef.current.vscode;
    const vscodeIsVisible =
      vscodeWindowGroupRef.current?.visible === true &&
      vscodeRuntime.state !== "closed" &&
      vscodeRuntime.state !== "minimized";
    const activeApp = vscodeIsVisible ? "vscode" : activeAppRef.current;
    const safariIsReady =
      activeApp === "safari" &&
      safariRuntime.state === "open" &&
      windowGroupRef.current?.visible === true;

    if (safariIsReady) return false;

    const browserLayout = browserLayoutRef.current;
    const dockRenderer = dockRendererRef.current;
    if (browserLayout && dockRenderer) {
      updateDockRenderer(
        dockRenderer,
        desktop.dockMagnification,
        null,
        false,
        1,
      );
      configureGenieGeometry(
        genieUniforms,
        browserLayout,
        dockRenderer,
        planeWidth,
        planeHeight,
        SAFARI_DOCK_INDEX,
      );
      configureGenieGeometry(
        vscodeGenieUniforms,
        browserLayout,
        dockRenderer,
        planeWidth,
        planeHeight,
        VSCODE_DOCK_INDEX,
      );
    }

    const sourceApp = activeApp === "vscode" ? activeApp : null;
    const sourceAmount = sourceApp
      ? windowRuntimesRef.current[sourceApp].amount
      : 1;
    const safariStartAmount = activeApp === "safari" ? safariRuntime.amount : 1;
    const bridge: ReturnBridge = {
      sourceApp,
      sourceAmount,
      safariStartAmount,
      safariVisible: windowGroupRef.current?.visible === true,
      vscodeVisible: vscodeWindowGroupRef.current?.visible === true,
      safariRuntime: {
        ...safariRuntime,
        animation: safariRuntime.animation
          ? { ...safariRuntime.animation }
          : null,
      },
      vscodeRuntime: {
        ...vscodeRuntime,
        animation: vscodeRuntime.animation
          ? { ...vscodeRuntime.animation }
          : null,
      },
      activeApp: activeAppRef.current,
      pendingApp: pendingAppRef.current,
      idleElapsed: 0,
      lastScrollY: window.scrollY,
      autoScroll: null,
    };
    returnBridgeRef.current = bridge;

    safariRuntime.animation = null;
    if (sourceApp) {
      const sourceRuntime = windowRuntimesRef.current[sourceApp];
      sourceRuntime.animation = null;
      sourceRuntime.state = "open";
    }

    if (windowGroupRef.current) windowGroupRef.current.visible = true;
    setGeniePresentation(genieUniforms, safariStartAmount, prefersReducedMotion);
    return true;
  };

  const restoreReturnBridge = (bridge: ReturnBridge) => {
    windowRuntimesRef.current.safari = {
      ...bridge.safariRuntime,
      animation: bridge.safariRuntime.animation
        ? { ...bridge.safariRuntime.animation }
        : null,
    };
    windowRuntimesRef.current.vscode = {
      ...bridge.vscodeRuntime,
      animation: bridge.vscodeRuntime.animation
        ? { ...bridge.vscodeRuntime.animation }
        : null,
    };
    activeAppRef.current = bridge.activeApp;
    pendingAppRef.current = bridge.pendingApp;

    setGeniePresentation(
      genieUniforms,
      bridge.safariRuntime.amount,
      prefersReducedMotion,
    );
    setGeniePresentation(
      vscodeGenieUniforms,
      bridge.vscodeRuntime.amount,
      prefersReducedMotion,
    );
    if (windowGroupRef.current) {
      windowGroupRef.current.visible = bridge.safariVisible;
    }
    if (vscodeWindowGroupRef.current) {
      vscodeWindowGroupRef.current.visible = bridge.vscodeVisible;
    }
  };

  const commitReturnBridge = (bridge: ReturnBridge) => {
    const safariRuntime = windowRuntimesRef.current.safari;

    safariRuntime.animation = null;
    safariRuntime.amount = 0;
    safariRuntime.state = "open";
    activeAppRef.current = "safari";
    pendingAppRef.current = null;
    setGeniePresentation(genieUniforms, 0, prefersReducedMotion);
    if (windowGroupRef.current) windowGroupRef.current.visible = true;

    if (!bridge.sourceApp) return;

    const sourceRuntime = windowRuntimesRef.current[bridge.sourceApp];
    sourceRuntime.animation = null;
    sourceRuntime.amount = 1;
    sourceRuntime.state = "minimized";
    setGeniePresentation(
      getWindowGenie(bridge.sourceApp),
      1,
      prefersReducedMotion,
    );
    const sourceGroup = getWindowGroup(bridge.sourceApp);
    if (sourceGroup) sourceGroup.visible = false;
  };

  const animateWindowTo = (appId: WindowAppId, target: 0 | 1) => {
    const browserLayout = browserLayoutRef.current;
    const dockRenderer = dockRendererRef.current;
    const group = getWindowGroup(appId);
    const genie = getWindowGenie(appId);
    const runtime = windowRuntimesRef.current[appId];

    if (!browserLayout || !dockRenderer || !group) return;

    configureGenieGeometry(
      genie,
      browserLayout,
      dockRenderer,
      planeWidth,
      planeHeight,
      getWindowDockIndex(appId),
    );
    group.visible = true;
    runtime.state = "animating";
    const distance = Math.abs(target - runtime.amount);
    const baseDuration = prefersReducedMotion
      ? CONFIG.workstation.GENIE_REDUCED_DURATION
      : target === 1
        ? CONFIG.workstation.GENIE_DURATION
        : CONFIG.workstation.GENIE_RESTORE_DURATION;
    runtime.animation = {
      from: runtime.amount,
      to: target,
      elapsed: 0,
      duration: Math.max(0.08, baseDuration * distance),
    };
  };

  const showWindow = (appId: WindowAppId) => {
    const group = getWindowGroup(appId);
    if (!group) return;
    const runtime = windowRuntimesRef.current[appId];
    activeAppRef.current = appId;

    if (appId === "vscode") startSourceLoad();

    if (
      runtime.state === "minimized" ||
      (runtime.state === "animating" && runtime.animation?.to === 1)
    ) {
      animateWindowTo(appId, 0);
      return;
    }

    runtime.animation = null;
    runtime.amount = 0;
    runtime.state = "open";
    setGeniePresentation(getWindowGenie(appId), 0, false);
    group.visible = true;
  };

  const switchToApp = (appId: WindowAppId) => {
    const dockRenderer = dockRendererRef.current;
    if (dockRenderer) {
      setDockAppRunning(
        dockRenderer,
        appId,
        1 + desktop.dockMagnification,
      );
    }
    if (appId === "vscode") startSourceLoad();

    const activeApp = activeAppRef.current;
    if (activeApp === appId) {
      const runtime = windowRuntimesRef.current[appId];
      if (runtime.state === "animating" && runtime.animation?.to === 1) {
        pendingAppRef.current = null;
        animateWindowTo(appId, 0);
      }
      return;
    }

    if (activeApp) {
      const activeRuntime = windowRuntimesRef.current[activeApp];
      const activeGroup = getWindowGroup(activeApp);

      if (
        activeGroup?.visible &&
        activeRuntime.state !== "closed" &&
        activeRuntime.state !== "minimized"
      ) {
        pendingAppRef.current = appId;
        animateWindowTo(activeApp, 1);
        return;
      }
    }

    showWindow(appId);
  };

  const closeWindow = (appId: WindowAppId) => {
    const runtime = windowRuntimesRef.current[appId];
    runtime.animation = null;
    runtime.amount = 0;
    runtime.state = "closed";
    setGeniePresentation(getWindowGenie(appId), 0, false);
    const group = getWindowGroup(appId);
    if (group) group.visible = false;
    if (activeAppRef.current === appId) activeAppRef.current = null;
  };

  useFrame((_, delta) => {
    if (returnBridgeRef.current) return;

    for (const appId of ["safari", "vscode"] as const) {
      const runtime = windowRuntimesRef.current[appId];
      const animation = runtime.animation;

      if (!animation) continue;

      animation.elapsed += delta;
      const time = THREE.MathUtils.clamp(
        animation.elapsed / animation.duration,
        0,
        1,
      );
      const amount = THREE.MathUtils.lerp(
        animation.from,
        animation.to,
        easeInOutQuint(time),
      );
      runtime.amount = amount;
      setGeniePresentation(
        getWindowGenie(appId),
        amount,
        prefersReducedMotion,
      );

      if (time < 1) continue;

      runtime.animation = null;

      if (animation.to === 1) {
        runtime.state = "minimized";
        const group = getWindowGroup(appId);
        if (group) group.visible = false;
        if (activeAppRef.current === appId) activeAppRef.current = null;

        const pendingApp = pendingAppRef.current;
        if (pendingApp) {
          pendingAppRef.current = null;
          showWindow(pendingApp);
        }
      } else {
        runtime.state = "open";
        activeAppRef.current = appId;
      }
    }
  });

  useFrame((_, delta) => {
    const scrollReveal = THREE.MathUtils.clamp(revealProgressRef.current, 0, 1);
    const previousReveal = previousRevealRef.current;
    const breakpoint = CONFIG.workstation.RETURN_BRIDGE_REVEAL_BREAKPOINT;

    if (
      !returnBridgeRef.current &&
      previousReveal !== null &&
      previousReveal > breakpoint &&
      scrollReveal <= breakpoint
    ) {
      beginReturnBridge();
    }

    let bridge = returnBridgeRef.current;
    if (
      bridge &&
      previousReveal !== null &&
      previousReveal < breakpoint &&
      scrollReveal > breakpoint
    ) {
      restoreReturnBridge(bridge);
      releaseReturnScroll();
      returnBridgeRef.current = null;
      bridge = null;
    }

    if (bridge) {
      const returnProgress = THREE.MathUtils.clamp(
        (breakpoint - scrollReveal) / breakpoint,
        0,
        1,
      );
      const currentScrollY = window.scrollY;

      if (bridge.autoScroll) {
        bridge.autoScroll.elapsed += delta;
        const progress = THREE.MathUtils.clamp(
          bridge.autoScroll.elapsed / bridge.autoScroll.duration,
          0,
          1,
        );
        const scrollY = THREE.MathUtils.lerp(
          bridge.autoScroll.startY,
          bridge.autoScroll.targetY,
          easeInOutQuint(progress),
        );
        bridge.lastScrollY = scrollY;
        lockReturnScroll(scrollY);
        window.scrollTo(0, scrollY);

        if (progress >= 1) {
          bridge.autoScroll = null;
          bridge.idleElapsed = 0;
          releaseReturnScroll();
        }
      } else if (returnProgress < 1) {
        const scrollSpeed = Math.abs(currentScrollY - bridge.lastScrollY) / delta;
        bridge.lastScrollY = currentScrollY;
        bridge.idleElapsed =
          scrollSpeed < CONFIG.workstation.RETURN_BRIDGE_AUTO_SCROLL_MIN_SPEED
            ? bridge.idleElapsed + delta
            : 0;

        if (
          bridge.idleElapsed >= CONFIG.workstation.RETURN_BRIDGE_AUTO_SCROLL_DELAY
        ) {
          bridge.autoScroll = {
            elapsed: 0,
            duration: prefersReducedMotion
              ? CONFIG.workstation.RETURN_BRIDGE_AUTO_SCROLL_REDUCED_DURATION
              : CONFIG.workstation.RETURN_BRIDGE_AUTO_SCROLL_DURATION,
            startY: currentScrollY,
            targetY: getReturnBridgeTargetY(scrollReveal),
          };
          lockReturnScroll(currentScrollY);
        }
      }

      const appSpan = bridge.sourceApp
        ? CONFIG.workstation.RETURN_BRIDGE_APP_SCROLL_SPAN
        : 0;
      const safariProgress = THREE.MathUtils.clamp(
        (returnProgress - appSpan) / (1 - appSpan),
        0,
        1,
      );
      const safariAmount = THREE.MathUtils.lerp(
        bridge.safariStartAmount,
        0,
        easeInOutQuint(safariProgress),
      );

      if (bridge.sourceApp) {
        const sourceProgress = THREE.MathUtils.clamp(
          returnProgress / appSpan,
          0,
          1,
        );
        const sourceAmount = THREE.MathUtils.lerp(
          bridge.sourceAmount,
          1,
          easeInOutQuint(sourceProgress),
        );
        const sourceGroup = getWindowGroup(bridge.sourceApp);
        if (sourceGroup) sourceGroup.visible = sourceProgress < 1;
        setGeniePresentation(
          getWindowGenie(bridge.sourceApp),
          sourceAmount,
          prefersReducedMotion,
        );
      }

      if (windowGroupRef.current) windowGroupRef.current.visible = true;
      setGeniePresentation(
        genieUniforms,
        safariAmount,
        prefersReducedMotion,
      );

      if (returnProgress >= 1) {
        commitReturnBridge(bridge);
        releaseReturnScroll();
        returnBridgeRef.current = null;
        bridge = null;
      }
    }

    previousRevealRef.current = scrollReveal;
    const reveal = prefersReducedMotion
      ? scrollReveal > 0
        ? 1
        : 0
      : scrollReveal;
    updateSurface(crtMorph(reveal, prefersReducedMotion));
    const hideHtmlOverlays = reveal >= CONFIG.workstation.BROWSER_REVEAL_START;

    if (htmlOverlayHiddenRef.current !== hideHtmlOverlays) {
      setHtmlOverlayVisibility(
        events.connected instanceof HTMLElement
          ? events.connected
          : gl.domElement.parentElement,
        gl.domElement,
        hideHtmlOverlays,
      );
      htmlOverlayHiddenRef.current = hideHtmlOverlays;
    }
    const planeZ = CONFIG.workstation.PLANE_Z;
    const restZ = CONFIG.scene.CAMERA_REST_Z;
    const restDistance = restZ - planeZ;
    const restHeight =
      2 *
      Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) *
      restDistance;
    const restWidth = restHeight * camera.aspect;
    const fit = Math.max(
      1,
      planeWidth / (restWidth * CONFIG.workstation.REVEAL_CAMERA_FILL),
      planeHeight / (restHeight * CONFIG.workstation.REVEAL_CAMERA_FILL),
    );
    const targetZ = planeZ + restDistance * fit;

    if (!caseStudyStage.open && caseStudyStage.progress < 0.001) {
      const cameraProgress = THREE.MathUtils.clamp(
        (reveal - CONFIG.workstation.CRT_MORPH_END) /
          (1 - CONFIG.workstation.CRT_MORPH_END), 0, 1,
      );
      camera.position.set(
        0,
        CONFIG.workstation.WORKSTATION_CAMERA_Y * planeWidth / crtFrame.screenWidth * cameraProgress,
        THREE.MathUtils.lerp(restZ, targetZ, cameraProgress),
      );
      camera.updateMatrixWorld();
    }

    const surfaceProgress = prefersReducedMotion
      ? reveal
      : THREE.MathUtils.mapLinear(
          reveal,
          CONFIG.workstation.CRT_MORPH_END,
          1,
          0,
          1,
        );
    if (!capturedRef.current && reveal >= CONFIG.workstation.BROWSER_REVEAL_START) {
      if (!capturePendingRef.current) {
        capturePendingRef.current = true;
        return;
      }
    }

    if (capturedRef.current && pageGroupRef.current) {
      pageGroupRef.current.visible =
        reveal < CONFIG.workstation.BROWSER_REVEAL_START;
    }

    if (surfaceGroupRef.current && capturedRef.current) {
      const transform = surfaceTransformRef.current;

      if (transform) {
        const progress = THREE.MathUtils.clamp(surfaceProgress, 0, 1);
        const scale = THREE.MathUtils.lerp(transform.scale, 1, progress);
        surfaceGroupRef.current.scale.setScalar(scale);
        surfaceGroupRef.current.position.y = THREE.MathUtils.lerp(
          transform.y,
          0,
          progress,
        );
      }
      surfaceGroupRef.current.visible =
        reveal >= CONFIG.workstation.BROWSER_REVEAL_START;
    }

  });

  useFrame((state, delta) => {
    if (
      !capturedRef.current ||
      returnBridgeRef.current !== null ||
      revealProgressRef.current < CONFIG.workstation.BROWSER_REVEAL_START ||
      !interactionMeshRef.current ||
      !pageUvBoundsRef.current ||
      !pageAberrationMaterialRef.current
    ) {
      return;
    }

    const intersections = intersectionsRef.current;
    intersections.length = 0;
    state.raycaster.setFromCamera(state.pointer, state.camera);
    state.raycaster.intersectObject(interactionMeshRef.current, false, intersections);
    const pageUv = mapContentUv(
      intersections[0]?.uv,
      interactionUvRef.current,
    );
    const bounds = pageUvBoundsRef.current;
    const mouseX = pageUv ? (pageUv.x - bounds.x) / bounds.width : -1;
    const mouseY = pageUv ? (pageUv.y - bounds.y) / bounds.height : -1;
    const pointerInsidePage =
      mouseX >= 0 && mouseX <= 1 && mouseY >= 0 && mouseY <= 1;
    const dockRenderer = dockRendererRef.current;
    const pointerX =
      pageUv && dockRenderer
        ? pageUv.x * dockRenderer.canvas.width
        : null;
    const pointerY =
      pageUv && dockRenderer
        ? (1 - pageUv.y) * dockRenderer.canvas.height
        : null;
    const toolbarRenderer = toolbarRendererRef.current;
    if (toolbarRenderer) {
      updateToolbarRenderer(toolbarRenderer, pointerX, pointerY);
    }
    const vscodeRenderer = vscodeRendererRef.current;
    if (vscodeRenderer) {
      updateVSCodeHover(
        vscodeRenderer,
        activeAppRef.current === "vscode" ? pointerX : null,
        activeAppRef.current === "vscode" ? pointerY : null,
      );
    }
    const pointerInsideDockContainer =
      dockRenderer !== null &&
      pointerX !== null &&
      pointerY !== null &&
      pointerX >= dockRenderer.layout.x &&
      pointerX <= dockRenderer.layout.x + dockRenderer.layout.width &&
      pointerY >= dockRenderer.layout.y &&
      pointerY <= dockRenderer.layout.y + dockRenderer.layout.height;
    const maxIconScale = dockRenderer
      ? Math.max(...dockRenderer.scales)
      : 1;
    const expandedDockTop = dockRenderer
      ? dockRenderer.layout.y +
        dockRenderer.layout.height -
        dockRenderer.layout.height * 0.16 -
        dockRenderer.layout.itemSize * maxIconScale
      : 0;
    const pointerInsideExpandedDock =
      dockRenderer !== null &&
      dockRenderer.isHovering &&
      pointerX !== null &&
      pointerY !== null &&
      pointerX >= dockRenderer.x &&
      pointerX <= dockRenderer.x + dockRenderer.width &&
      pointerY >= expandedDockTop &&
      pointerY <= dockRenderer.layout.y + dockRenderer.layout.height;
    const pointerInsideDock =
      pointerInsideDockContainer || pointerInsideExpandedDock;

    if (dockRenderer) {
      updateDockRenderer(
        dockRenderer,
        desktop.dockMagnification,
        pointerInsideDock ? pointerX : null,
        inputMode === "fine",
        delta,
      );
    }

    if (pointerInsidePage) {
      const dx = mouseX - targetMouseRef.current.x;
      const dy = mouseY - targetMouseRef.current.y;

      if (
        inputMode === "fine" &&
        (Math.abs(dx) > 0.0001 || Math.abs(dy) > 0.0001)
      ) {
        mouseIntensityRef.current = 1;
      }

      targetMouseRef.current.set(mouseX, mouseY);
    }

    prevMouseRef.current.copy(currentMouseRef.current);
    currentMouseRef.current.lerp(
      targetMouseRef.current,
      1 - Math.exp(-CONFIG.customAberration.LERP_FACTOR_MULT * delta),
    );
    mouseIntensityRef.current = THREE.MathUtils.lerp(
      mouseIntensityRef.current,
      0,
      1 - Math.exp(-CONFIG.customAberration.INTENSITY_LERP_MULT * delta),
    );

    if (mouseIntensityRef.current < CONFIG.customAberration.INTENSITY_MIN) {
      mouseIntensityRef.current = 0;
    }

    const safeDelta = Math.max(delta, CONFIG.customAberration.SAFE_DELTA_MIN);
    const mouseVelocityX =
      mouseIntensityRef.current > 0
        ? ((currentMouseRef.current.x - prevMouseRef.current.x) *
            CONFIG.customAberration.VEL_MULT) /
          safeDelta
        : 0;
    const mouseVelocityY =
      mouseIntensityRef.current > 0
        ? ((currentMouseRef.current.y - prevMouseRef.current.y) *
            CONFIG.customAberration.VEL_MULT) /
          safeDelta
        : 0;
    const uniforms = pageAberrationMaterialRef.current.uniforms;
    uniforms.u_mouse.value.copy(currentMouseRef.current);
    uniforms.u_aberrationIntensity.value =
      inputMode === "fine" && qualityTier !== "low"
        ? mouseIntensityRef.current
        : 0;
    uniforms.u_mouseVelocity.value.set(mouseVelocityX, mouseVelocityY);
    uniforms.u_scrollVelocity.value = scrollVelocityRef.current;
    const mobileIntensity =
      qualityTier === "low" ? 0.25 : inputMode === "coarse" ? 0.55 : 1;
    uniforms.u_scrollBlur.value = scroll.blur * mobileIntensity;
    uniforms.u_scrollSplit.value = scroll.split * mobileIntensity;
    uniforms.u_scrollVignette.value.set(
      scroll.vignetteXWeight,
      scroll.vignetteInner,
      scroll.vignetteOuter,
      scroll.vignetteFloor,
    );
  });

  useFrame(() => {
    if (
      (!capturePendingRef.current && !capturedRef.current) ||
      (capturedRef.current &&
        revealProgressRef.current < CONFIG.workstation.BROWSER_REVEAL_START) ||
      !pageGroupRef.current ||
      !surfaceGroupRef.current
    ) {
      return;
    }

    if (
      capturedRef.current &&
      (!monitorHasSignal(monitorState) ||
        windowGroupRef.current?.visible !== true ||
        windowRuntimesRef.current.safari.state === "minimized")
    ) {
      return;
    }

    const pixelRatio = gl.getPixelRatio();
    const sourceDimensions = getPageTargetDimensions(
      Math.round(size.width * pixelRatio),
      Math.round(size.height * pixelRatio),
      qualityTier,
    );
    const sourceWidth = sourceDimensions.width;
    const sourceHeight = sourceDimensions.height;
    if (!targetRef.current) {
      const target = new THREE.WebGLRenderTarget(sourceWidth, sourceHeight, {
        depthBuffer: true,
        stencilBuffer: false,
      });
      target.texture.colorSpace = gl.outputColorSpace;
      targetRef.current = target;
      targetQualityRef.current = qualityTier;
    }

    const target = targetRef.current;
    if (
      targetQualityRef.current !== qualityTier ||
      target.width !== sourceWidth ||
      target.height !== sourceHeight
    ) {
      target.setSize(sourceWidth, sourceHeight);
      targetQualityRef.current = qualityTier;
    }
    const previousTarget = gl.getRenderTarget();
    const wasSurfaceVisible = surfaceGroupRef.current.visible;
    const wasPageVisible = pageGroupRef.current.visible;
    captureCamera.copy(camera);

    surfaceGroupRef.current.visible = false;
    pageGroupRef.current.visible = true;
    captureCamera.position.set(0, 0, CONFIG.scene.CAMERA_REST_Z);
    captureCamera.layers.enable(HEADER_LAYER);
    captureCamera.layers.enable(THEME_SWEEP_LAYER);
    captureCamera.updateMatrixWorld();
    gl.setRenderTarget(target);
    gl.clear();
    gl.render(scene, captureCamera);
    gl.setRenderTarget(previousTarget);
    pageGroupRef.current.visible = capturedRef.current ? false : wasPageVisible;
    surfaceGroupRef.current.visible = wasSurfaceVisible;

    if (capturedRef.current) return;

    const { width: textureWidth, height: textureHeight } = getTextureDimensions(
      sourceWidth,
      sourceHeight,
    );
    const layout = getBrowserLayout(
      textureWidth,
      textureHeight,
      sourceWidth,
      sourceHeight,
      desktop,
    );
    const chromeTexture = createBrowserChromeTexture({
      sourceWidth,
      sourceHeight,
      tuning: desktop,
    });
    const dockRenderer = createDockRenderer({
      sourceWidth,
      sourceHeight,
      tuning: desktop,
    });
    const toolbarRenderer = createToolbarRenderer({ sourceWidth, sourceHeight });
    const vscodeRenderer = createVSCodeRenderer({
      width: textureWidth,
      height: textureHeight,
      layout,
      controlsScale: desktop.safariControlsScale,
    });
    const pageMask = createPageMask(textureWidth, textureHeight, layout);

    if (
      !chromeTexture ||
      !dockRenderer ||
      !toolbarRenderer ||
      !vscodeRenderer ||
      !pageMask ||
      !chromeMaterialRef.current ||
      !vscodeMaterialRef.current ||
      !dockMaterialRef.current ||
      !toolbarMaterialRef.current
    ) {
      return;
    }

    if (sourceManifestRef.current) {
      setVSCodeSources(vscodeRenderer, sourceManifestRef.current);
    }
    if (vscodeSessionRef.current) {
      restoreVSCodeSession(vscodeRenderer, vscodeSessionRef.current);
    }

    chromeTextureRef.current?.dispose();
    chromeTextureRef.current = chromeTexture;
    vscodeTextureRef.current?.dispose();
    vscodeTextureRef.current = vscodeRenderer.texture;
    vscodeRendererRef.current = vscodeRenderer;
    dockTextureRef.current?.dispose();
    dockTextureRef.current = dockRenderer.texture;
    dockRendererRef.current = dockRenderer;
    browserLayoutRef.current = layout;
    toolbarTextureRef.current?.dispose();
    toolbarTextureRef.current = toolbarRenderer.texture;
    toolbarRendererRef.current = toolbarRenderer;
    pageMaskRef.current?.dispose();
    pageMaskRef.current = pageMask;
    gl.initTexture(chromeTexture);
    gl.initTexture(dockRenderer.texture);
    gl.initTexture(toolbarRenderer.texture);
    gl.initTexture(pageMask);
    chromeMaterialRef.current.uniforms.u_texture.value = chromeTexture;
    vscodeMaterialRef.current.uniforms.u_texture.value = vscodeRenderer.texture;
    dockMaterialRef.current.map = dockRenderer.texture;
    dockMaterialRef.current.needsUpdate = true;
    toolbarMaterialRef.current.map = toolbarRenderer.texture;
    toolbarMaterialRef.current.needsUpdate = true;
    const bounds = {
      x: layout.x / textureWidth,
      y:
        1 -
        (layout.y + layout.chromeHeight + layout.contentHeight) /
          textureHeight,
      width: layout.width / textureWidth,
      height: layout.contentHeight / textureHeight,
    };
    pageUvBoundsRef.current = bounds;
    configureGenieGeometry(
      genieUniforms,
      layout,
      dockRenderer,
      planeWidth,
      planeHeight,
      SAFARI_DOCK_INDEX,
    );
    configureGenieGeometry(
      vscodeGenieUniforms,
      layout,
      dockRenderer,
      planeWidth,
      planeHeight,
      VSCODE_DOCK_INDEX,
    );
    configurePageAberrationMaterial(
      pageAberrationMaterial,
      target,
      pageMask,
      bounds,
    );
    const restDistance = CONFIG.scene.CAMERA_REST_Z - CONFIG.workstation.PLANE_Z;
    const restHeight =
      2 *
      Math.tan(THREE.MathUtils.degToRad(captureCamera.fov) / 2) *
      restDistance;
    const restWidth = restHeight * captureCamera.aspect;
    const contentWidth = planeWidth * (layout.width / textureWidth);
    const contentCenterY =
      planeHeight *
      (0.5 -
        (layout.y + layout.chromeHeight + layout.contentHeight / 2) /
          textureHeight);
    const scale = restWidth / contentWidth;

    surfaceTransformRef.current = {
      scale,
      y: -contentCenterY * scale,
    };
    capturedRef.current = true;
    capturePendingRef.current = false;
    const revealVisible =
      revealProgressRef.current >= CONFIG.workstation.BROWSER_REVEAL_START;
    pageGroupRef.current.visible = !revealVisible;
    surfaceGroupRef.current.scale.setScalar(scale);
    surfaceGroupRef.current.position.y = -contentCenterY * scale;
    surfaceGroupRef.current.visible = revealVisible;
  }, 0.5);

  const handlePageClick = (event: ThreeEvent<MouseEvent>) => {
    if (!monitorHasSignal(monitorState)) return;
    if (returnBridgeRef.current) {
      event.stopPropagation();
      return;
    }

    if (suppressVSCodeClickRef.current) {
      suppressVSCodeClickRef.current = false;
      event.stopPropagation();
      return;
    }

    const pageUv = mapContentUv(event.uv, interactionUvRef.current);
    const bounds = pageUvBoundsRef.current;

    if (!pageUv || !bounds) return;

    const toolbarRenderer = toolbarRendererRef.current;
    const dockRenderer = dockRendererRef.current;
    const textureWidth =
      dockRenderer?.canvas.width ?? toolbarRenderer?.canvas.width;
    const textureHeight =
      dockRenderer?.canvas.height ?? toolbarRenderer?.canvas.height;

    if (!textureWidth || !textureHeight) return;

    const pointerX = pageUv.x * textureWidth;
    const pointerY = (1 - pageUv.y) * textureHeight;

    if (toolbarRenderer) {
      const toolbarHit = getToolbarHit(
        toolbarRenderer.layout,
        toolbarRenderer.menuType,
        pointerX,
        pointerY,
      );

      if (toolbarHit?.type === "actions" || toolbarHit?.type === "go") {
        event.stopPropagation();
        toolbarRenderer.menuType =
          toolbarRenderer.menuType === toolbarHit.type ? null : toolbarHit.type;
        toolbarRenderer.hoveredMenuItem = null;
        drawToolbar(toolbarRenderer);
        return;
      }

      if (toolbarHit?.type === "menu-item") {
        event.stopPropagation();
        const menuType = toolbarRenderer.menuType;
        toolbarRenderer.menuType = null;
        toolbarRenderer.hoveredMenuItem = null;

        if (menuType === "actions" && toolbarHit.index === 0) {
          window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
        }

        if (menuType === "actions" && toolbarHit.index === 1) {
          setTheme(theme === "Light" ? "Dark" : "Light");
        }

        drawToolbar(toolbarRenderer);
        return;
      }

      if (toolbarRenderer.menuType) {
        event.stopPropagation();
        toolbarRenderer.menuType = null;
        toolbarRenderer.hoveredMenuItem = null;
        drawToolbar(toolbarRenderer);
        return;
      }
    }

    if (dockRenderer) {
      const dockIndex = getDockHoveredIndex(
        dockRenderer.layout,
        dockRenderer.scales,
        dockRenderer.x,
        pointerX,
      );
      const dockItem = getDockItemBounds(
        dockRenderer.layout,
        dockRenderer.scales,
        dockRenderer.x,
        dockIndex,
      );
      const dockItemHit =
        pointerX >= dockItem.x &&
        pointerX <= dockItem.x + dockItem.width &&
        pointerY >= dockItem.y &&
        pointerY <= dockRenderer.layout.y + dockRenderer.layout.height;

      if (dockItemHit) {
        event.stopPropagation();

        const appId = DOCK_APPS[dockIndex].id;
        if (appId === "safari" || appId === "vscode") {
          switchToApp(appId);
        }
        return;
      }
    }

    const browserLayout = browserLayoutRef.current;
    const activeApp = activeAppRef.current;
    const activeGroup = activeApp ? getWindowGroup(activeApp) : null;
    const windowIsVisible = activeGroup?.visible === true;

    if (browserLayout && activeApp && windowIsVisible) {
      const browserControl = getBrowserControlHit(
        browserLayout,
        desktop,
        pointerX,
        pointerY,
        textureWidth / size.width,
      );

      if (browserControl === "close") {
        event.stopPropagation();
        closeWindow(activeApp);
        return;
      }

      if (browserControl === "minimize") {
        event.stopPropagation();

        if (windowRuntimesRef.current[activeApp].animation?.to !== 1) {
          animateWindowTo(activeApp, 1);
        }
        return;
      }
    }

    if (!activeApp || windowRuntimesRef.current[activeApp].state !== "open") {
      return;
    }

    if (
      activeApp === "vscode" &&
      vscodeRendererRef.current &&
      handleVSCodeClick(vscodeRendererRef.current, pointerX, pointerY)
    ) {
      event.stopPropagation();
      return;
    }

    if (activeApp !== "safari") return;

    const pageX = (pageUv.x - bounds.x) / bounds.width;
    const pageY = (pageUv.y - bounds.y) / bounds.height;

    if (
      !isThemeToggleHit({
        pageX,
        pageY,
        viewport,
        size: layoutSize,
        leftX,
        rightX,
        layoutMode,
      })
    ) {
      return;
    }

    event.stopPropagation();
    setTheme(theme === "Light" ? "Dark" : "Light");
  };

  const handlePagePointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (!monitorHasSignal(monitorState)) return;
    const pageUv = mapContentUv(event.uv, interactionUvRef.current);
    const renderer = vscodeRendererRef.current;

    if (
      !pageUv ||
      !renderer ||
      returnBridgeRef.current !== null ||
      activeAppRef.current !== "vscode" ||
      windowRuntimesRef.current.vscode.state !== "open"
    ) {
      return;
    }

    const pointerX = pageUv.x * renderer.canvas.width;
    const pointerY = (1 - pageUv.y) * renderer.canvas.height;
    const drag = beginVSCodeScrollbarDrag(renderer, pointerX, pointerY);

    if (!drag) return;

    vscodeScrollbarDragRef.current = drag;
    suppressVSCodeClickRef.current = true;
    event.stopPropagation();
    event.nativeEvent.preventDefault();
    const target = event.nativeEvent.target;
    if (target instanceof Element) {
      target.setPointerCapture(event.pointerId);
    }
  };

  const handlePagePointerMove = (event: ThreeEvent<PointerEvent>) => {
    const drag = vscodeScrollbarDragRef.current;
    const renderer = vscodeRendererRef.current;
    const pageUv = mapContentUv(event.uv, interactionUvRef.current);

    if (!drag || !renderer || !pageUv) return;

    updateVSCodeScrollbarDrag(
      renderer,
      drag,
      pageUv.x * renderer.canvas.width,
      (1 - pageUv.y) * renderer.canvas.height,
    );
    event.stopPropagation();
    event.nativeEvent.preventDefault();
  };

  const finishVSCodeScrollbarDrag = (event: ThreeEvent<PointerEvent>) => {
    const renderer = vscodeRendererRef.current;

    if (!vscodeScrollbarDragRef.current || !renderer) return;

    vscodeScrollbarDragRef.current = null;
    endVSCodeScrollbarDrag(renderer);
    event.stopPropagation();
    event.nativeEvent.preventDefault();
    const target = event.nativeEvent.target;
    if (target instanceof Element && target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <group>
      <group ref={pageGroupRef}>{children}</group>

      <group
        ref={surfaceGroupRef}
        position={[0, 0, CONFIG.workstation.PLANE_Z]}
        visible={false}
      >
        <Suspense fallback={null}>
          <CRTMonitor
            width={planeWidth}
            monitorState={monitorState}
            onButtonPress={syncPlayStationSignal}
          />
          <WorkstationEnvironment width={planeWidth} />
        </Suspense>
        <CRTDisplay ref={crtScreenRef} monitorState={monitorState} width={planeWidth} height={planeHeight} geometry={planeGeometry} borderGeometry={borderGeometry}>
        <group ref={desktopSignalGroupRef}>
        <mesh
          geometry={desktopGeometry}
          renderOrder={9}
          frustumCulled={false}
          raycast={() => null}
        >
          <meshBasicMaterial
            ref={wallpaperMaterialRef}
            color="#ffffff"
            depthTest={false}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <group ref={windowGroupRef}>
          <mesh
            geometry={desktopGeometry}
            renderOrder={10}
            frustumCulled={false}
            raycast={() => null}
          >
            <primitive object={windowChromeMaterial} attach="material" />
          </mesh>
          <mesh
            geometry={desktopGeometry}
            renderOrder={11}
            frustumCulled={false}
            raycast={() => null}
          >
            <primitive object={pageAberrationMaterial} attach="material" />
          </mesh>
        </group>
        <group ref={vscodeWindowGroupRef} visible={false}>
          <mesh
            geometry={desktopGeometry}
            renderOrder={11}
            frustumCulled={false}
            raycast={() => null}
          >
            <primitive object={vscodeWindowMaterial} attach="material" />
          </mesh>
        </group>
        <mesh
          geometry={desktopGeometry}
          renderOrder={12}
          frustumCulled={false}
          raycast={() => null}
        >
          <meshBasicMaterial
            ref={dockMaterialRef}
            color="#ffffff"
            transparent
            depthTest={false}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <mesh
          geometry={desktopGeometry}
          renderOrder={13}
          frustumCulled={false}
          raycast={() => null}
        >
          <meshBasicMaterial
            ref={toolbarMaterialRef}
            color="#ffffff"
            transparent
            depthTest={false}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        </group>
        <PlayStationSignal
          ref={playStationSignalRef}
          geometry={desktopGeometry}
          monitorState={monitorState}
        />
        </CRTDisplay>
        <mesh
          ref={interactionMeshRef}
          geometry={planeGeometry}
          renderOrder={14}
          frustumCulled={false}
          onClick={handlePageClick}
          onPointerDown={handlePagePointerDown}
          onPointerMove={handlePagePointerMove}
          onPointerUp={finishVSCodeScrollbarDrag}
          onPointerCancel={finishVSCodeScrollbarDrag}
          onLostPointerCapture={finishVSCodeScrollbarDrag}
        >
          <meshBasicMaterial
            colorWrite={false}
            depthTest={false}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
}
