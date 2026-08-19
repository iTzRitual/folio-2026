"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { CONFIG } from "@/config/constants";
import { useHeroLayout } from "@/context/HeroLayoutContext";
import { useHeroTransition } from "@/context/HeroTransitionContext";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { caseStudyStage } from "@/lib/caseStudyStage";
import { HEADER_LAYER } from "./Effects/HeaderExclusionEffect";

function createPlaneGeometry(width: number, height: number): THREE.PlaneGeometry {
  return new THREE.PlaneGeometry(
    width,
    height,
    CONFIG.phase2.PLANE_SEGMENTS_X,
    CONFIG.phase2.PLANE_SEGMENTS_Y,
  );
}

function updatePlaneCurve(
  geometry: THREE.PlaneGeometry,
  width: number,
  height: number,
  curveDepth: number,
) {
  const positions = geometry.attributes.position;

  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index) / (width / 2);
    const y = positions.getY(index) / (height / 2);
    positions.setZ(index, curveDepth * (1 - x * x) * (1 - y * y));
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
}

function getTextureDimensions(sourceWidth: number, sourceHeight: number) {
  const rawWidth = Math.max(
    sourceWidth,
    sourceHeight * CONFIG.phase2.PLANE_ASPECT,
  );
  const scale = Math.min(
    1,
    CONFIG.phase2.TEXTURE_MAX_DIMENSION / rawWidth,
  );
  const width = Math.round(rawWidth * scale);

  return {
    width,
    height: Math.round(width / CONFIG.phase2.PLANE_ASPECT),
  };
}

function getBrowserLayout(
  textureWidth: number,
  textureHeight: number,
  sourceWidth: number,
  sourceHeight: number,
) {
  const margin =
    Math.min(textureWidth, textureHeight) *
    CONFIG.phase2.BROWSER_SAFE_MARGIN_MULT;
  const availableWidth = textureWidth - margin * 2;
  const availableHeight = textureHeight - margin * 2;
  const browserAspect =
    sourceWidth /
    (sourceHeight * (1 + CONFIG.phase2.BROWSER_CHROME_HEIGHT_MULT));
  let width = availableWidth;
  let height = width / browserAspect;

  if (height > availableHeight) {
    height = availableHeight;
    width = height * browserAspect;
  }

  const x = (textureWidth - width) / 2;
  const y = (textureHeight - height) / 2;
  const contentHeight =
    height / (1 + CONFIG.phase2.BROWSER_CHROME_HEIGHT_MULT);

  return {
    x,
    y,
    width,
    height,
    contentHeight,
    chromeHeight: height - contentHeight,
  };
}

function createBrowserChromeTexture({
  sourceWidth,
  sourceHeight,
}: {
  sourceWidth: number;
  sourceHeight: number;
}) {
  const { width: textureWidth, height: textureHeight } = getTextureDimensions(
    sourceWidth,
    sourceHeight,
  );
  const textureCanvas = document.createElement("canvas");
  const textureContext = textureCanvas.getContext("2d");

  if (!textureContext) return null;

  textureCanvas.width = textureWidth;
  textureCanvas.height = textureHeight;
  textureContext.fillStyle = "#000000";
  textureContext.fillRect(0, 0, textureWidth, textureHeight);

  const layout = getBrowserLayout(
    textureWidth,
    textureHeight,
    sourceWidth,
    sourceHeight,
  );
  const {
    x: browserX,
    y: browserY,
    width: browserWidth,
    height: browserHeight,
    contentHeight,
    chromeHeight,
  } = layout;
  const cornerRadius = chromeHeight * 0.34;

  textureContext.save();
  textureContext.beginPath();
  textureContext.roundRect(
    browserX,
    browserY,
    browserWidth,
    browserHeight,
    cornerRadius,
  );
  textureContext.clip();

  textureContext.fillStyle = CONFIG.phase2.BROWSER_BAR_COLOR;
  textureContext.fillRect(browserX, browserY, browserWidth, chromeHeight);
  textureContext.clearRect(
    browserX,
    browserY + chromeHeight,
    browserWidth,
    contentHeight,
  );

  const controlRadius =
    chromeHeight * CONFIG.phase2.BROWSER_CONTROL_RADIUS_MULT;
  const sidePadding =
    chromeHeight * CONFIG.phase2.BROWSER_SIDE_PADDING_MULT;
  const controlGap = chromeHeight * CONFIG.phase2.BROWSER_CONTROL_GAP_MULT;
  const controlY = browserY + chromeHeight / 2;
  const firstControlX = browserX + sidePadding;

  CONFIG.phase2.BROWSER_LIGHTS.forEach((color, index) => {
    textureContext.fillStyle = color;
    textureContext.beginPath();
    textureContext.arc(
      firstControlX + index * (controlRadius * 2 + controlGap),
      controlY,
      controlRadius,
      0,
      Math.PI * 2,
    );
    textureContext.fill();
  });

  const addressHeight =
    chromeHeight * CONFIG.phase2.BROWSER_ADDRESS_HEIGHT_MULT;
  const addressWidth = browserWidth * CONFIG.phase2.BROWSER_ADDRESS_WIDTH_MULT;
  textureContext.fillStyle = CONFIG.phase2.BROWSER_ADDRESS_COLOR;
  textureContext.fillRect(
    browserX + (browserWidth - addressWidth) / 2,
    controlY - addressHeight / 2,
    addressWidth,
    addressHeight,
  );
  textureContext.fillStyle = CONFIG.phase2.BROWSER_ICON_COLOR;
  textureContext.font = `400 ${
    chromeHeight * CONFIG.phase2.BROWSER_ADDRESS_FONT_MULT
  }px Arial`;
  textureContext.textAlign = "center";
  textureContext.textBaseline = "middle";
  textureContext.fillText("folio-2026", browserX + browserWidth / 2, controlY);
  textureContext.restore();

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function createPageMask(
  textureWidth: number,
  textureHeight: number,
  layout: ReturnType<typeof getBrowserLayout>,
) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) return null;

  canvas.width = textureWidth;
  canvas.height = textureHeight;
  context.fillStyle = "#000000";
  context.fillRect(0, 0, textureWidth, textureHeight);
  context.save();
  context.beginPath();
  context.roundRect(
    layout.x,
    layout.y,
    layout.width,
    layout.height,
    layout.chromeHeight * 0.34,
  );
  context.clip();
  context.fillStyle = "#ffffff";
  context.fillRect(
    layout.x,
    layout.y + layout.chromeHeight,
    layout.width,
    layout.contentHeight,
  );
  context.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function Phase2Surface({ children }: { children: ReactNode }) {
  const { viewport } = useHeroLayout();
  const { revealProgressRef } = useHeroTransition();
  const { camera, gl, scene, size } = useThree();
  const prefersReducedMotion = usePrefersReducedMotion();
  const pageGroupRef = useRef<THREE.Group>(null);
  const surfaceGroupRef = useRef<THREE.Group>(null);
  const chromeMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const pageMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const targetRef = useRef<THREE.WebGLRenderTarget | null>(null);
  const chromeTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const pageMaskRef = useRef<THREE.CanvasTexture | null>(null);
  const surfaceTransformRef = useRef<{ scale: number; y: number } | null>(
    null,
  );
  const capturedRef = useRef(false);
  const capturePendingRef = useRef(false);
  const lastCurveDepthRef = useRef(-1);

  const planeWidth = Math.max(
    viewport.width,
    viewport.height *
      (1 + CONFIG.phase2.BROWSER_CHROME_HEIGHT_MULT) *
      CONFIG.phase2.PLANE_ASPECT,
  );
  const planeHeight = planeWidth / CONFIG.phase2.PLANE_ASPECT;
  const maxCurveDepth =
    Math.min(planeWidth, planeHeight) * CONFIG.phase2.PLANE_CURVE_DEPTH_MULT;
  const planeGeometry = useMemo(
    () => createPlaneGeometry(planeWidth, planeHeight),
    [planeHeight, planeWidth],
  );

  useEffect(() => {
    return () => planeGeometry.dispose();
  }, [planeGeometry]);

  useEffect(() => {
    capturedRef.current = false;
    capturePendingRef.current = false;
    lastCurveDepthRef.current = -1;
    targetRef.current?.dispose();
    targetRef.current = null;
    chromeTextureRef.current?.dispose();
    chromeTextureRef.current = null;
    pageMaskRef.current?.dispose();
    pageMaskRef.current = null;
    surfaceTransformRef.current = null;

    if (pageGroupRef.current) pageGroupRef.current.visible = true;
    if (surfaceGroupRef.current) {
      surfaceGroupRef.current.visible = false;
      surfaceGroupRef.current.position.y = 0;
      surfaceGroupRef.current.scale.setScalar(1);
    }
  }, [size.height, size.width]);

  useEffect(() => {
    return () => {
      targetRef.current?.dispose();
      chromeTextureRef.current?.dispose();
      pageMaskRef.current?.dispose();
    };
  }, []);

  useFrame(() => {
    const scrollReveal = THREE.MathUtils.clamp(revealProgressRef.current, 0, 1);
    const reveal = prefersReducedMotion
      ? scrollReveal > 0
        ? 1
        : 0
      : scrollReveal;
    const planeZ = CONFIG.phase2.PLANE_Z;
    const restZ = CONFIG.caseStudy.CAMERA_REST_Z;
    const perspective = camera as THREE.PerspectiveCamera;
    const restDistance = restZ - planeZ;
    const restHeight =
      2 *
      Math.tan(THREE.MathUtils.degToRad(perspective.fov) / 2) *
      restDistance;
    const restWidth = restHeight * perspective.aspect;
    const fit = Math.max(
      1,
      planeWidth / (restWidth * CONFIG.phase2.REVEAL_CAMERA_FILL),
      planeHeight / (restHeight * CONFIG.phase2.REVEAL_CAMERA_FILL),
    );
    const targetZ = planeZ + restDistance * fit;

    if (!caseStudyStage.open && caseStudyStage.progress < 0.001) {
      camera.position.set(0, 0, THREE.MathUtils.lerp(restZ, targetZ, reveal));
      camera.updateMatrixWorld();
    }

    const surfaceProgress = prefersReducedMotion
      ? reveal
      : THREE.MathUtils.mapLinear(
          reveal,
          CONFIG.phase2.BROWSER_REVEAL_START,
          1,
          0,
          1,
        );
    const curveDepth =
      maxCurveDepth *
      THREE.MathUtils.smoothstep(
        reveal,
        CONFIG.phase2.PLANE_CURVE_START,
        CONFIG.phase2.PLANE_CURVE_END,
      );

    if (Math.abs(curveDepth - lastCurveDepthRef.current) > 0.0001) {
      updatePlaneCurve(planeGeometry, planeWidth, planeHeight, curveDepth);
      lastCurveDepthRef.current = curveDepth;
    }

    if (!capturedRef.current && reveal >= CONFIG.phase2.BROWSER_REVEAL_START) {
      if (!capturePendingRef.current) {
        capturePendingRef.current = true;
        return;
      }
    }

    if (capturedRef.current && pageGroupRef.current) {
      pageGroupRef.current.visible =
        reveal < CONFIG.phase2.BROWSER_REVEAL_START;
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
        reveal >= CONFIG.phase2.BROWSER_REVEAL_START;
    }
  });

  useFrame(() => {
    if (
      (!capturePendingRef.current && !capturedRef.current) ||
      revealProgressRef.current < CONFIG.phase2.BROWSER_REVEAL_START ||
      !pageGroupRef.current ||
      !surfaceGroupRef.current
    ) {
      return;
    }

    const pixelRatio = gl.getPixelRatio();
    const sourceWidth = Math.round(size.width * pixelRatio);
    const sourceHeight = Math.round(size.height * pixelRatio);
    if (!targetRef.current) {
      const target = new THREE.WebGLRenderTarget(sourceWidth, sourceHeight, {
        depthBuffer: true,
        stencilBuffer: false,
      });
      target.texture.colorSpace = gl.outputColorSpace;
      targetRef.current = target;
    }

    const target = targetRef.current;
    const previousTarget = gl.getRenderTarget();
    const wasSurfaceVisible = surfaceGroupRef.current.visible;
    const wasPageVisible = pageGroupRef.current.visible;
    const captureCamera = (camera as THREE.PerspectiveCamera).clone();

    surfaceGroupRef.current.visible = false;
    pageGroupRef.current.visible = true;
    captureCamera.position.z = CONFIG.caseStudy.CAMERA_REST_Z;
    captureCamera.layers.enable(HEADER_LAYER);
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
    );
    const chromeTexture = createBrowserChromeTexture({
      sourceWidth,
      sourceHeight,
    });
    const pageMask = createPageMask(textureWidth, textureHeight, layout);

    if (
      !chromeTexture ||
      !pageMask ||
      !chromeMaterialRef.current ||
      !pageMaterialRef.current
    ) {
      return;
    }

    chromeTextureRef.current?.dispose();
    chromeTextureRef.current = chromeTexture;
    pageMaskRef.current?.dispose();
    pageMaskRef.current = pageMask;
    chromeMaterialRef.current.map = chromeTexture;
    chromeMaterialRef.current.needsUpdate = true;
    target.texture.repeat.set(
      textureWidth / layout.width,
      textureHeight / layout.contentHeight,
    );
    target.texture.offset.set(
      -layout.x / layout.width,
      -(
        1 -
        (layout.y + layout.chromeHeight + layout.contentHeight) /
          textureHeight
      ) /
        (layout.contentHeight / textureHeight),
    );
    target.texture.needsUpdate = true;
    pageMaterialRef.current.map = target.texture;
    pageMaterialRef.current.alphaMap = pageMask;
    pageMaterialRef.current.needsUpdate = true;
    const restDistance = CONFIG.caseStudy.CAMERA_REST_Z - CONFIG.phase2.PLANE_Z;
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
    pageGroupRef.current.visible = false;
    surfaceGroupRef.current.scale.setScalar(scale);
    surfaceGroupRef.current.position.y = -contentCenterY * scale;
    surfaceGroupRef.current.visible = true;
  }, 0.5);

  return (
    <group>
      <group ref={pageGroupRef}>{children}</group>

      <group
        ref={surfaceGroupRef}
        position={[0, 0, CONFIG.phase2.PLANE_Z]}
        visible={false}
      >
        <mesh
          geometry={planeGeometry}
          renderOrder={10}
          frustumCulled={false}
          raycast={() => null}
        >
          <meshBasicMaterial
            ref={chromeMaterialRef}
            color="#ffffff"
            transparent
            depthTest={false}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <mesh
          geometry={planeGeometry}
          renderOrder={11}
          frustumCulled={false}
          raycast={() => null}
        >
          <meshBasicMaterial
            ref={pageMaterialRef}
            color="#ffffff"
            transparent
            depthTest={false}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
}
