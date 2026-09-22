import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { DoubleSide, Group, MathUtils, Matrix4, ShaderMaterial, SRGBColorSpace, Vector2, Vector3, Vector4, VideoTexture } from "three";
import { CONFIG } from "@/config/constants";
import { projectsData } from "@/data/content";
import { useHeroLayout } from "@/context/HeroLayoutContext";
import { useHeroTransition } from "@/context/HeroTransitionContext";
import { useAnimationContext } from "@/context/AnimationContext";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { createProjectOrbitGeometry, projectOrbitFragmentShader, projectOrbitVertexShader } from "@/lib/projectOrbit";
import { caseStudyStage } from "@/lib/caseStudyStage";
import type { ProjectOrbitCollider } from "@/lib/projectOrbitCollision";
import { projectOrbitEntranceAt } from "@/lib/projectOrbitEntrance";

const C = CONFIG.projectOrbit;
const project = projectsData.find((project) => project.slug === "controller-configurator")!;

export function ProjectOrbit({ colliderRef, entranceProgressRef }: {
  colliderRef: RefObject<ProjectOrbitCollider>;
  entranceProgressRef: RefObject<{ progress: number; orbitElapsed: number }>;
}) {
  const texture = useTexture(project.preview, (loaded) => {
    loaded.colorSpace = SRGBColorSpace;
    loaded.needsUpdate = true;
  });
  const { responsiveScale } = useHeroLayout();
  const { progressRef, revealProgressRef } = useHeroTransition();
  const { startTrigger } = useAnimationContext();
  const reducedMotion = usePrefersReducedMotion();
  const group = useRef<Group>(null);
  const rotation = useRef<Group>(null);
  const materialRef = useRef<ShaderMaterial>(null);
  const entrance = useRef({ elapsed: 0, started: false, complete: false });
  const playback = useRef<{ video: HTMLVideoElement; active: boolean } | null>(null);
  const worldScale = useMemo(() => new Vector3(), []);
  const radius = responsiveScale * C.RADIUS_MULT;
  const geometries = useMemo(() => Array.from({ length: C.COUNT }, (_, index) => createProjectOrbitGeometry(radius, index)), [radius]);
  const material = useMemo(() => {
    const image = texture.image as { width: number; height: number };
    const aspect = image.width / image.height;
    return new ShaderMaterial({
      vertexShader: projectOrbitVertexShader,
      fragmentShader: projectOrbitFragmentShader,
      uniforms: {
        uMap: { value: texture },
        uVideo: { value: false },
        uCover: { value: new Vector2(Math.min(1, CONFIG.projectPreview.ASPECT / aspect), Math.min(1, aspect / CONFIG.projectPreview.ASPECT)) },
        uAspect: { value: CONFIG.projectPreview.ASPECT },
        uRadius: { value: C.CORNER_RADIUS },
        uBorder: { value: C.BORDER_WIDTH },
        uOpacity: { value: 0 },
        uOrbitCenter: { value: new Vector3() },
        uOrbitRadius: { value: 1 },
        uFarBrightness: { value: C.FAR_BRIGHTNESS },
        uOrbitFrame: { value: new Matrix4() },
        uReveal: { value: 0 },
        uTime: { value: 0 },
        uGlitch: { value: CONFIG.projectPreview.REST_GLITCH },
        uGlitchParams: { value: new Vector4(CONFIG.projectPreview.GLITCH_BANDS, CONFIG.projectPreview.GLITCH_SLICE, CONFIG.projectPreview.GLITCH_SPLIT, CONFIG.projectPreview.GLITCH_HZ) },
        uHologramOpacity: { value: C.HOLOGRAM_OPACITY },
        uHologramTint: { value: C.HOLOGRAM_TINT },
        uScan: { value: new Vector3(C.HOLOGRAM_SCAN_LINES, C.HOLOGRAM_SCAN_STRENGTH, C.HOLOGRAM_SCAN_SPEED) },
      },
      side: DoubleSide,
      transparent: true,
      depthWrite: false,
      forceSinglePass: true,
      toneMapped: false,
    });
  }, [texture]);

  useEffect(() => {
    if (reducedMotion || !project.loop) return;
    const video = document.createElement("video");
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "auto";
    const videoTexture = new VideoTexture(video);
    videoTexture.colorSpace = SRGBColorSpace;
    const current = { video, active: false };
    playback.current = current;
    const play = () => {
      if (current.active) void video.play().catch(() => undefined);
    };
    const ready = () => {
      const aspect = video.videoWidth / video.videoHeight;
      if (!Number.isFinite(aspect) || aspect <= 0) return;
      material.uniforms.uMap.value = videoTexture;
      material.uniforms.uVideo.value = true;
      material.uniforms.uCover.value.set(Math.min(1, CONFIG.projectPreview.ASPECT / aspect), Math.min(1, aspect / CONFIG.projectPreview.ASPECT));
    };
    const visibility = () => {
      if (document.hidden) {
        current.active = false;
        video.pause();
      }
    };
    video.addEventListener("playing", ready);
    document.addEventListener("pointerdown", play);
    document.addEventListener("visibilitychange", visibility);
    video.src = project.loop;
    video.load();
    return () => {
      playback.current = null;
      video.removeEventListener("playing", ready);
      document.removeEventListener("pointerdown", play);
      document.removeEventListener("visibilitychange", visibility);
      video.pause();
      video.removeAttribute("src");
      video.load();
      material.uniforms.uMap.value = texture;
      material.uniforms.uVideo.value = false;
      const image = texture.image as { width: number; height: number };
      const aspect = image.width / image.height;
      material.uniforms.uCover.value.set(Math.min(1, CONFIG.projectPreview.ASPECT / aspect), Math.min(1, aspect / CONFIG.projectPreview.ASPECT));
      videoTexture.dispose();
    };
  }, [material, texture, reducedMotion]);

  useEffect(() => () => geometries.forEach((geometry) => geometry.dispose()), [geometries]);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => { colliderRef.current.object = null; colliderRef.current.active = false; }, [colliderRef]);

  useFrame((state, delta) => {
    const currentMaterial = materialRef.current;
    if (!currentMaterial) return;
    const dt = Math.min(delta, 1 / 30);
    const exit = MathUtils.smoothstep(progressRef.current, 0, C.EXIT_END);
    const present = startTrigger && revealProgressRef.current === 0 && !caseStudyStage.open;
    currentMaterial.uniforms.uTime.value = reducedMotion ? 0 : state.clock.elapsedTime;
    currentMaterial.uniforms.uGlitch.value = reducedMotion ? 0 : CONFIG.projectPreview.REST_GLITCH;
    const videoActive = present && exit < 1 && !reducedMotion && !document.hidden;
    const currentPlayback = playback.current;
    if (currentPlayback && currentPlayback.active !== videoActive) {
      currentPlayback.active = videoActive;
      if (videoActive) void currentPlayback.video.play().catch(() => undefined);
      else currentPlayback.video.pause();
    }
    const intro = entrance.current;
    if (!startTrigger) {
      intro.elapsed = 0;
      intro.started = false;
      intro.complete = false;
    }
    if (startTrigger && entranceProgressRef.current.progress >= C.ENTRANCE_START) intro.started = true;
    if (intro.started && reducedMotion) intro.complete = true;
    if (rotation.current && present && exit < 1 && intro.started && !reducedMotion && !document.hidden) {
      if (intro.complete) rotation.current.rotation.y += dt * C.SPEED;
      else {
        intro.elapsed = entranceProgressRef.current.orbitElapsed;
        rotation.current.rotation.y = projectOrbitEntranceAt(intro.elapsed).phase;
        intro.complete = intro.elapsed >= C.ENTRANCE_DURATION;
      }
    }
    const reveal = intro.complete ? 1 : projectOrbitEntranceAt(intro.elapsed).reveal;
    currentMaterial.uniforms.uReveal.value = reveal;
    currentMaterial.uniforms.uOpacity.value = MathUtils.damp(currentMaterial.uniforms.uOpacity.value, present && intro.started ? 1 - exit : 0, C.RESPONSE, dt);
    if (group.current) {
      group.current.visible = currentMaterial.uniforms.uOpacity.value > 0.001 && exit < 1;
      group.current.getWorldPosition(currentMaterial.uniforms.uOrbitCenter.value);
      group.current.getWorldScale(worldScale);
      currentMaterial.uniforms.uOrbitRadius.value = radius * worldScale.x;
      currentMaterial.uniforms.uOrbitFrame.value.copy(group.current.matrixWorld).invert();
    }
    colliderRef.current.object = rotation.current;
    colliderRef.current.radius = radius;
    colliderRef.current.active = present && exit < 1 && reveal > 0 && currentMaterial.uniforms.uOpacity.value > 0.01;
    colliderRef.current.reveal = reveal;
    colliderRef.current.phase = rotation.current?.rotation.y ?? 0;
  }, -2);

  return (
    <group ref={group} rotation={[C.TILT_X, 0, C.TILT_Z]}>
      <group ref={rotation}>
        {Array.from({ length: C.COUNT }, (_, index) => {
          const angle = index / C.COUNT * Math.PI * 2;
          return (
            <mesh
              key={index}
              geometry={geometries[index]}
              position={[Math.sin(angle) * radius, 0, Math.cos(angle) * radius]}
              rotation={[0, angle, 0]}
              raycast={() => null}
            >
              <primitive object={material} attach="material" ref={index === 0 ? materialRef : undefined} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}
