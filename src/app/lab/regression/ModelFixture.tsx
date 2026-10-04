"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { Suspense, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Mesh, ShaderMaterial, Texture, Vector3, VideoTexture } from "three";
import Model from "@/components/Model";
import { CONFIG } from "@/config/constants";
import { HeroLayoutProvider } from "@/context/HeroLayoutProvider";
import { HeroTransitionContextProvider, type HeroTransitionContextType } from "@/context/HeroTransitionContext";
import type { SceneQualityTier } from "@/lib/responsiveScene";
import { SceneCapabilitiesProvider } from "@/context/SceneCapabilitiesContext";

function ModelProbe({ output }: { output: RefObject<HTMLOutputElement | null> }) {
  const { gl, scene } = useThree();
  const computePasses = useRef(0);
  const frames = useRef(0);
  const videos = useRef(new Set<HTMLVideoElement>());
  const samples = useRef(new WeakMap<WebGLShader, number | null>());
  useLayoutEffect(() => {
    const render = gl.render;
    gl.render = function(currentScene, camera) {
      const objects = currentScene instanceof Mesh ? [currentScene] : currentScene.children;
      if (objects.some(child => child instanceof Mesh && child.material instanceof ShaderMaterial && child.material.uniforms.delta && child.material.uniforms.restPosition)) computePasses.current++;
      return render.call(this, currentScene, camera);
    };
    return () => { gl.render = render; };
  }, [gl]);
  useFrame(() => {
    let fragment: { geometry: string; vertices: number; rest: string | null; positions: string | null; scale: number[]; samples: number | null } | null = null;
    let orbit: { video: boolean; map: string; cover: number[] } | null = null;
    scene.traverse(object => {
      if (!(object instanceof Mesh) || Array.isArray(object.material)) return;
      if (object.geometry.attributes.particleUv) {
        const properties = gl.properties.get(object.material) as { uniforms?: Record<string, { value: unknown }>; currentProgram?: { fragmentShader: WebGLShader } };
        const uniforms = properties.uniforms;
        const rest = uniforms?.fragmentRest?.value;
        const positions = uniforms?.fragmentPositions?.value;
        const shader = properties.currentProgram?.fragmentShader;
        if (shader && !samples.current.has(shader)) {
          const source = gl.getContext().getShaderSource(shader);
          const match = source?.match(/for\s*\(float i = 0\.0; i < (\d+)\.0; i \+\+\)/);
          samples.current.set(shader, match ? Number(match[1]) : null);
        }
        fragment = {
          geometry: object.geometry.uuid,
          vertices: object.geometry.attributes.position.count,
          rest: rest instanceof Texture ? rest.uuid : null,
          positions: positions instanceof Texture ? positions.uuid : null,
          scale: new Vector3().setFromMatrixScale(object.matrixWorld).toArray(),
          samples: shader ? samples.current.get(shader) ?? null : null,
        };
      }
      if (object.material instanceof ShaderMaterial && object.material.uniforms.uVideo && object.material.uniforms.uCover) {
        const uniforms = object.material.uniforms;
        const texture = uniforms.uMap.value;
        if (texture instanceof VideoTexture && texture.image instanceof HTMLVideoElement) videos.current.add(texture.image);
        orbit = { video: uniforms.uVideo.value, map: texture.uuid, cover: uniforms.uCover.value.toArray() };
      }
    });
    if (output.current) {
      output.current.dataset.modelState = JSON.stringify({
        frame: ++frames.current,
        computePasses: computePasses.current,
        fragment,
        orbit,
        videos: [...videos.current].map(video => ({ src: video.getAttribute("src"), paused: video.paused, ready: video.readyState, time: video.currentTime })),
        hidden: document.hidden,
      });
    }
  }, -0.5);
  return null;
}

export default function ModelFixture({ initialQuality = "balanced" }: { initialQuality?: SceneQualityTier }) {
  const [quality, setQuality] = useState<SceneQualityTier>(initialQuality);
  const [started, setStarted] = useState(false);
  const [visible, setVisible] = useState(true);
  const output = useRef<HTMLOutputElement>(null);
  const progressRef = useRef(0);
  const revealProgressRef = useRef(0);
  const detailsScrollRef = useRef(0);
  const modelAnchorRef = useRef({ xFraction: 0, yFraction: 0, scale: 1 });
  const transition = useMemo<HeroTransitionContextType>(() => ({
    progressRef,
    detailsScrollRef,
    revealProgressRef,
    modelAnchorRef,
  }), []);
  const stage = (progress: number, reveal: number) => {
    progressRef.current = progress;
    revealProgressRef.current = reveal;
  };
  return (
    <main className="h-screen bg-black">
      <div className="absolute z-10 flex flex-wrap gap-4 bg-white p-4 text-black">
        {(["low", "balanced", "high"] as const).map(tier => <button key={tier} data-command={`quality-${tier}`} onClick={() => setQuality(tier)}>{tier}</button>)}
        <button data-command="start" onClick={() => setStarted(true)}>Start</button>
        <button data-command="hide" onClick={() => setVisible(false)}>Hide</button>
        <button data-command="show" onClick={() => setVisible(true)}>Show</button>
        <button data-command="hero" onClick={() => stage(0, 0)}>Hero</button>
        <button data-command="scatter" onClick={() => stage(0.3, 0)}>Scatter</button>
        <button data-command="details" onClick={() => stage(0.95, 0)}>Details</button>
        <button data-command="reveal" onClick={() => stage(1, 0.8)}>Reveal</button>
        <output ref={output} data-quality={quality} data-started={started} data-samples={quality === "low" ? CONFIG.model.TRANSMISSION_SAMPLES_MOBILE : CONFIG.model.TRANSMISSION_SAMPLES} />
      </div>
      <Canvas camera={{ fov: CONFIG.scene.CAMERA_FOV, position: [0, 0, CONFIG.scene.CAMERA_REST_Z] }} gl={{ antialias: false }}>
        <SceneCapabilitiesProvider inputMode="fine" qualityTier={quality}>
          <HeroLayoutProvider startAnimation={started}>
            <HeroTransitionContextProvider value={transition}>
              <Suspense fallback={null}>
                <Environment files="/hdri/city.hdr" />
                <directionalLight intensity={3} position={[0, 3, 2]} />
                <group visible={visible}><Model isDebug={false} /></group>
                <ModelProbe output={output} />
              </Suspense>
            </HeroTransitionContextProvider>
          </HeroLayoutProvider>
        </SceneCapabilitiesProvider>
      </Canvas>
    </main>
  );
}
