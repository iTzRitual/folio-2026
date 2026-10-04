"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Mesh, MeshBasicMaterial, Vector3 } from "three";
import { createWorkstationScrollbarController } from "@/lib/workstationScrollbar";
import { createVSCodeRenderer, getScrollbarGeometries, setVSCodeSources, type VSCodeRenderer } from "@/lib/vscodeRenderer";

function ScrollbarSurface() {
  const { camera, gl, size } = useThree();
  const surface = useRef<Mesh>(null);
  const material = useRef<MeshBasicMaterial>(null);
  const rendererRef = useRef<VSCodeRenderer | null>(null);
  const controllerRef = useRef<ReturnType<typeof createWorkstationScrollbarController> | null>(null);
  const output = useRef<HTMLOutputElement>(null);
  const clicks = useRef(0);
  const [enabled, setEnabled] = useState(true);
  useEffect(() => { if (!enabled) controllerRef.current?.cancel(); }, [enabled]);
  useLayoutEffect(() => {
    const next = createVSCodeRenderer({
      width: 1024,
      height: 640,
      layout: { x: 64, y: 48, width: 900, height: 540, chromeHeight: 28 },
      controlsScale: 1,
    });
    if (!next) throw new Error("The scrollbar fixture requires Canvas 2D");
    setVSCodeSources(next, {
      version: "scrollbar-fixture",
      files: [{ path: "src/test.ts", content: Array.from({ length: 200 }, (_, index) => `export const line${index} = ${index};`).join("\n") }],
    });
    const controller = createWorkstationScrollbarController({
      terminalTarget: window,
      camera,
      getBounds: () => gl.domElement.getBoundingClientRect(),
      getSurface: () => surface.current,
      getRenderer: () => next,
      mapContentUv: (source, target) => { target.copy(source); return true; },
    });
    controllerRef.current = controller;
    const disconnect = controller.connect();
    rendererRef.current = next;
    const mapMaterial = material.current;
    if (mapMaterial) {
      mapMaterial.map = next.texture;
      mapMaterial.needsUpdate = true;
    }
    return () => {
      disconnect();
      controllerRef.current = null;
      rendererRef.current = null;
      if (mapMaterial?.map === next.texture) {
        mapMaterial.map = null;
        mapMaterial.needsUpdate = true;
      }
      next.texture.dispose();
    };
  }, [camera, gl]);
  const point = useMemo(() => new Vector3(), []);
  useFrame(() => {
    const element = output.current;
    const mesh = surface.current;
    const controller = controllerRef.current;
    const renderer = rendererRef.current;
    if (!element || !mesh || !renderer || !controller) return;
    const scrollbar = getScrollbarGeometries(renderer).find(item => item.kind === "editor-y");
    if (!scrollbar) throw new Error("The fixture must contain a vertical editor scrollbar");
    point.set(
      (scrollbar.crossPosition / renderer.canvas.width - 0.5) * 3.2,
      (0.5 - (scrollbar.thumbStart + scrollbar.thumbLength / 2) / renderer.canvas.height) * 2,
      0,
    ).applyMatrix4(mesh.matrixWorld).project(camera);
    element.dataset.point = JSON.stringify({ x: (point.x + 1) * size.width / 2, y: (1 - point.y) * size.height / 2 });
    element.dataset.pointer = String(controller.pointerId);
    element.dataset.active = String(renderer.activeScrollbar);
    element.dataset.scroll = String(renderer.editorScrollY);
    element.dataset.clicks = String(clicks.current);
    element.dataset.enabled = String(enabled);
    element.dataset.ready = "true";
    element.textContent = `Scroll ${renderer.editorScrollY.toFixed(1)} · Pointer ${controller.pointerId ?? "idle"} · Clicks ${clicks.current}`;
  });
  return (
    <>
      <mesh
        ref={surface}
        visible={enabled}
        onPointerDown={event => { if (enabled) controllerRef.current?.begin(event); }}
        onPointerMove={event => controllerRef.current?.move(event)}
        onPointerUp={event => controllerRef.current?.finish(event)}
        onClick={event => { if (!controllerRef.current?.consumeClick(event.nativeEvent.detail)) clicks.current += 1; }}
      >
        <planeGeometry args={[3.2, 2]} />
        <meshBasicMaterial ref={material} />
      </mesh>
      <Html position={[0, 1.4, 0]} center>
        <div className="flex gap-4 whitespace-nowrap bg-neutral-950 p-4 text-white">
          <output ref={output} data-scrollbar-fixture />
          <button type="button" onClick={() => setEnabled(value => !value)}>Toggle signal</button>
        </div>
      </Html>
    </>
  );
}

export default function ScrollbarFixture() {
  return (
    <div className="fixed inset-0 bg-neutral-900">
      <Canvas camera={{ position: [0, 0, 5] }}>
        <ScrollbarSurface />
      </Canvas>
    </div>
  );
}
