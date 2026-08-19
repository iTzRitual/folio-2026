"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { CONFIG } from "@/config/constants";
import { useHeroLayout } from "@/context/HeroLayoutContext";
import { useHeroTransition } from "@/context/HeroTransitionContext";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { caseStudyStage } from "@/lib/caseStudyStage";

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

function drawBrowserTexture({
  pixels,
  sourceWidth,
  sourceHeight,
}: {
  pixels: Uint8Array;
  sourceWidth: number;
  sourceHeight: number;
}) {
  const { width: textureWidth, height: textureHeight } = getTextureDimensions(
    sourceWidth,
    sourceHeight,
  );
  const sourceCanvas = document.createElement("canvas");
  const sourceContext = sourceCanvas.getContext("2d");
  const textureCanvas = document.createElement("canvas");
  const textureContext = textureCanvas.getContext("2d");

  if (!sourceContext || !textureContext) return null;

  sourceCanvas.width = sourceWidth;
  sourceCanvas.height = sourceHeight;
  const imageData = sourceContext.createImageData(sourceWidth, sourceHeight);
  const rowLength = sourceWidth * 4;

  for (let row = 0; row < sourceHeight; row += 1) {
    const sourceOffset = (sourceHeight - row - 1) * rowLength;
    imageData.data.set(
      pixels.subarray(sourceOffset, sourceOffset + rowLength),
      row * rowLength,
    );
  }

  sourceContext.putImageData(imageData, 0, 0);

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
  textureContext.drawImage(
    sourceCanvas,
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

export function Phase2Surface({ children }: { children: ReactNode }) {
  const { viewport } = useHeroLayout();
  const { revealProgressRef } = useHeroTransition();
  const { camera, gl, scene, size } = useThree();
  const prefersReducedMotion = usePrefersReducedMotion();
  const pageGroupRef = useRef<THREE.Group>(null);
  const planeRef = useRef<THREE.Mesh>(null);
  const planeMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const targetRef = useRef<THREE.WebGLRenderTarget | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
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
    textureRef.current?.dispose();
    textureRef.current = null;
    surfaceTransformRef.current = null;

    if (pageGroupRef.current) pageGroupRef.current.visible = true;
    if (planeRef.current) {
      planeRef.current.visible = false;
      planeRef.current.position.y = 0;
      planeRef.current.scale.setScalar(1);
    }
  }, [size.height, size.width]);

  useEffect(() => {
    return () => {
      targetRef.current?.dispose();
      textureRef.current?.dispose();
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

    if (planeRef.current && capturedRef.current) {
      const transform = surfaceTransformRef.current;

      if (transform) {
        const progress = THREE.MathUtils.clamp(surfaceProgress, 0, 1);
        const scale = THREE.MathUtils.lerp(transform.scale, 1, progress);
        planeRef.current.scale.setScalar(scale);
        planeRef.current.position.y = THREE.MathUtils.lerp(transform.y, 0, progress);
      }
      planeRef.current.visible = reveal >= CONFIG.phase2.BROWSER_REVEAL_START;
    }
  });

  useFrame(() => {
    if (
      !capturePendingRef.current ||
      capturedRef.current ||
      !pageGroupRef.current ||
      !planeRef.current
    ) {
      return;
    }

    const pixelRatio = gl.getPixelRatio();
    const sourceWidth = Math.round(size.width * pixelRatio);
    const sourceHeight = Math.round(size.height * pixelRatio);
    const target = new THREE.WebGLRenderTarget(sourceWidth, sourceHeight, {
      depthBuffer: true,
      stencilBuffer: false,
    });
    const previousTarget = gl.getRenderTarget();
    const wasPlaneVisible = planeRef.current.visible;
    const captureCamera = (camera as THREE.PerspectiveCamera).clone();

    target.texture.colorSpace = gl.outputColorSpace;
    targetRef.current?.dispose();
    targetRef.current = target;
    planeRef.current.visible = false;
    captureCamera.position.z = CONFIG.caseStudy.CAMERA_REST_Z;
    captureCamera.updateMatrixWorld();
    gl.setRenderTarget(target);
    gl.clear();
    gl.render(scene, captureCamera);
    gl.setRenderTarget(previousTarget);
    planeRef.current.visible = wasPlaneVisible;

    const pixels = new Uint8Array(sourceWidth * sourceHeight * 4);
    gl.readRenderTargetPixels(target, 0, 0, sourceWidth, sourceHeight, pixels);
    const texture = drawBrowserTexture({
      pixels,
      sourceWidth,
      sourceHeight,
    });

    if (!texture || !planeMaterialRef.current) return;

    textureRef.current?.dispose();
    textureRef.current = texture;
    planeMaterialRef.current.map = texture;
    planeMaterialRef.current.needsUpdate = true;
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
    planeRef.current.scale.setScalar(scale);
    planeRef.current.position.y = -contentCenterY * scale;
    planeRef.current.visible = true;
  }, 0.5);

  return (
    <group>
      <group ref={pageGroupRef}>{children}</group>

      <mesh
        ref={planeRef}
        geometry={planeGeometry}
        position={[0, 0, CONFIG.phase2.PLANE_Z]}
        renderOrder={10}
        frustumCulled={false}
        visible={false}
        raycast={() => null}
      >
        <meshBasicMaterial
          ref={planeMaterialRef}
          color="#ffffff"
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
