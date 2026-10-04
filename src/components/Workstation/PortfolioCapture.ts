import * as THREE from "three";
import { CONFIG } from "@/config/constants";
import type { DebugSettings } from "@/config/debugSettings";
import type { SceneQualityTier } from "@/lib/responsiveScene";
import type { SourceManifest } from "@/lib/sourceManifest";
import {
  captureVSCodeSession,
  createVSCodeRenderer,
  restoreVSCodeSession,
  setVSCodeSources,
  type VSCodeRenderer,
  type VSCodeSessionSnapshot,
} from "@/lib/vscodeRenderer";
import {
  createBrowserChromeTexture,
  createDockRenderer,
  createPageMask,
  createToolbarRenderer,
  getBrowserLayout,
  getPageTargetDimensions,
  getTextureDimensions,
  type DockRenderer,
  type PageUvBounds,
  type ToolbarRenderer,
} from "@/lib/virtualDesktop";
import { HEADER_LAYER } from "../Effects/HeaderExclusionEffect";
import { THEME_SWEEP_LAYER } from "../ThemeSweep";

type DesktopTextures = {
  chrome: THREE.CanvasTexture;
  dock: DockRenderer;
  toolbar: ToolbarRenderer;
  vscode: VSCodeRenderer;
  mask: THREE.CanvasTexture;
  layout: ReturnType<typeof getBrowserLayout>;
  bounds: PageUvBounds;
  transform: { scale: number; y: number };
};

export class PortfolioCapture {
  private pageTarget: THREE.WebGLRenderTarget | null = null;
  private textures: DesktopTextures | null = null;
  private savedSession: VSCodeSessionSnapshot | null = null;
  private readonly camera = new THREE.PerspectiveCamera();

  get target() {
    return this.pageTarget;
  }

  get desktop() {
    return this.textures;
  }

  get session() {
    return this.savedSession;
  }

  get ready() {
    return this.textures !== null;
  }

  render(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    page: THREE.Group,
    surface: THREE.Group,
    size: { width: number; height: number },
    quality: SceneQualityTier,
  ) {
    const dpr = renderer.getPixelRatio();
    const { width, height } = getPageTargetDimensions(Math.round(size.width * dpr), Math.round(size.height * dpr), quality);
    if (!this.pageTarget) {
      this.pageTarget = new THREE.WebGLRenderTarget(width, height, { depthBuffer: true, stencilBuffer: false });
      this.pageTarget.texture.colorSpace = renderer.outputColorSpace;
    } else if (this.pageTarget.width !== width || this.pageTarget.height !== height) {
      this.pageTarget.setSize(width, height);
    }
    const target = renderer.getRenderTarget();
    const cubeFace = renderer.getActiveCubeFace();
    const mipLevel = renderer.getActiveMipmapLevel();
    const pageVisible = page.visible;
    const surfaceVisible = surface.visible;
    let rendered = false;
    try {
      this.camera.copy(camera);
      this.camera.position.set(0, 0, CONFIG.scene.CAMERA_REST_Z);
      this.camera.rotation.set(0, 0, 0);
      this.camera.fov = CONFIG.scene.CAMERA_FOV;
      this.camera.layers.enable(HEADER_LAYER);
      this.camera.layers.enable(THEME_SWEEP_LAYER);
      this.camera.updateProjectionMatrix();
      this.camera.updateMatrixWorld();
      page.visible = true;
      surface.visible = false;
      renderer.setRenderTarget(this.pageTarget);
      renderer.clear();
      renderer.render(scene, this.camera);
      rendered = true;
    } finally {
      renderer.setRenderTarget(target, cubeFace, mipLevel);
      page.visible = rendered && this.ready ? false : pageVisible;
      surface.visible = surfaceVisible;
    }
    return this.pageTarget;
  }

  createDesktop(tuning: DebugSettings["desktop"], plane: { width: number; height: number }, manifest: SourceManifest | null) {
    if (this.textures) return this.textures;
    if (!this.pageTarget) return null;
    const sourceWidth = this.pageTarget.width;
    const sourceHeight = this.pageTarget.height;
    const { width, height } = getTextureDimensions(sourceWidth, sourceHeight);
    const layout = getBrowserLayout(width, height, sourceWidth, sourceHeight, tuning);
    const pending: THREE.Texture[] = [];
    const own = <T extends THREE.Texture | null>(texture: T): T => {
      if (texture) pending.push(texture);
      return texture;
    };
    try {
      const chrome = own(createBrowserChromeTexture({ sourceWidth, sourceHeight, tuning }));
      const dock = createDockRenderer({ sourceWidth, sourceHeight, tuning });
      own(dock?.texture ?? null);
      const toolbar = createToolbarRenderer({ sourceWidth, sourceHeight });
      own(toolbar?.texture ?? null);
      const vscode = createVSCodeRenderer({ width, height, layout, controlsScale: tuning.safariControlsScale });
      own(vscode?.texture ?? null);
      const mask = own(createPageMask(width, height, layout));
      if (!chrome || !dock || !toolbar || !vscode || !mask) return null;
      if (manifest) setVSCodeSources(vscode, manifest);
      if (this.savedSession) restoreVSCodeSession(vscode, this.savedSession);
      const bounds = {
        x: layout.x / width,
        y: 1 - (layout.y + layout.chromeHeight + layout.contentHeight) / height,
        width: layout.width / width,
        height: layout.contentHeight / height,
      };
      const restDistance = CONFIG.scene.CAMERA_REST_Z - CONFIG.workstation.PLANE_Z;
      const restHeight = 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2) * restDistance;
      const contentWidth = plane.width * layout.width / width;
      const contentCenterY = plane.height * (0.5 - (layout.y + layout.chromeHeight + layout.contentHeight / 2) / height);
      const scale = restHeight * this.camera.aspect / contentWidth;
      this.textures = { chrome, dock, toolbar, vscode, mask, layout, bounds, transform: { scale, y: -contentCenterY * scale } };
      pending.length = 0;
      return this.textures;
    } finally {
      for (const texture of pending) texture.dispose();
    }
  }

  reset() {
    if (this.textures) {
      const { chrome, dock, toolbar, vscode, mask } = this.textures;
      this.savedSession = captureVSCodeSession(vscode);
      this.textures = null;
      for (const texture of [chrome, dock.texture, toolbar.texture, vscode.texture, mask]) texture.dispose();
    }
    this.pageTarget?.dispose();
    this.pageTarget = null;
  }

  dispose() {
    this.reset();
    this.savedSession = null;
  }
}
