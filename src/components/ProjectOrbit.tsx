import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Box3, BufferGeometry, DoubleSide, Group, MathUtils, Matrix4, ShaderMaterial, SRGBColorSpace, Vector2, Vector3, Vector4, VideoTexture } from "three";
import { CONFIG } from "@/config/constants";
import { projectsData } from "@/data/content";
import { useHeroLayout } from "@/context/HeroLayoutContext";
import { useHeroTransition } from "@/context/HeroTransitionContext";
import { useAnimationContext } from "@/context/AnimationContext";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { createProjectOrbitGeometry, projectOrbitLayout, PROJECT_ORBIT_ASPECT, projectOrbitFragmentShader, projectOrbitVertexShader } from "@/lib/projectOrbit";
import { caseStudyStage } from "@/lib/caseStudyStage";
import { projectOrbitCollisionShape, type ProjectOrbitCollider } from "@/lib/projectOrbitCollision";
import { projectOrbitEntranceAt } from "@/lib/projectOrbitEntrance";
import { useProjectOrbitDrag } from "@/hooks/useProjectOrbitDrag";
import { createProjectOrbitHud } from "@/lib/projectOrbitHud";
import { useOrbitSignal } from "@/context/OrbitSignalContext";
import { heroAssemblyAt } from "@/lib/heroAssembly";

const C = CONFIG.projectOrbit;
const project = projectsData.find((project) => project.slug === "controller-configurator")!;

export function ProjectOrbit({ colliderRef, entranceProgressRef, skullGeometry, skullRef }: {
  colliderRef: RefObject<ProjectOrbitCollider>;
  entranceProgressRef: RefObject<{ progress: number; orbitElapsed: number }>;
  skullGeometry: BufferGeometry;
  skullRef: RefObject<Group | null>;
}) {
  const texture = useTexture(project.preview, (loaded) => {
    loaded.colorSpace = SRGBColorSpace;
    loaded.needsUpdate = true;
  });
  const { responsiveScale } = useHeroLayout();
  const { progressRef, revealProgressRef } = useHeroTransition();
  const { startTrigger } = useAnimationContext();
  const reducedMotion = usePrefersReducedMotion();
  const signal = useOrbitSignal();
  const skullBounds = useMemo(() => {
    skullGeometry.computeBoundingBox();
    const bounds = skullGeometry.boundingBox!;
    return {
      corners: Array.from({ length: 8 }, (_, i) => new Vector3(
        i & 1 ? bounds.max.x : bounds.min.x,
        i & 2 ? bounds.max.y : bounds.min.y,
        i & 4 ? bounds.max.z : bounds.min.z,
      )),
      center: bounds.getCenter(new Vector3()),
      projected: new Box3(),
      point: new Vector3(),
    };
  }, [skullGeometry]);
  const group = useRef<Group>(null);
  const rotation = useRef<Group>(null);
  const advanceOrbit = useProjectOrbitDrag(rotation, group);
  const materialRef = useRef<ShaderMaterial>(null);
  const entrance = useRef({ elapsed: 0, started: false, complete: false });
  const scrollSpin = useRef(0);
  const playback = useRef<{ video: HTMLVideoElement; active: boolean } | null>(null);
  const worldScale = useMemo(() => new Vector3(), []);
  const settings = signal.config;
  const radius = responsiveScale * settings.radius;
  const layout = useMemo(() => projectOrbitLayout({ count: settings.count, gap: settings.gap, cardScale: settings.cardScale }), [settings.count, settings.gap, settings.cardScale]);
  const collisionShape = useMemo(() => projectOrbitCollisionShape(layout), [layout]);
  const geometries = useMemo(() => Array.from({ length: layout.count }, (_, index) => createProjectOrbitGeometry(radius, layout, index)), [radius, layout]);
  const hudTexture = useMemo(() => createProjectOrbitHud(project.title), []);
  useEffect(() => () => hudTexture.dispose(), [hudTexture]);
  const material = useMemo(() => {
    const image = texture.image as { width: number; height: number };
    const aspect = image.width / image.height;
    return new ShaderMaterial({
      vertexShader: projectOrbitVertexShader,
      fragmentShader: projectOrbitFragmentShader,
      uniforms: {
        uMap: { value: texture },
        uHudMap: { value: hudTexture },
        uHudStyle: { value: 0 },
        uHudDetail: { value: 0 },
        uVideo: { value: false },
        uCover: { value: new Vector2(Math.max(1, PROJECT_ORBIT_ASPECT / aspect), Math.max(1, aspect / PROJECT_ORBIT_ASPECT)) },
        uAspect: { value: PROJECT_ORBIT_ASPECT },
        uRadius: { value: C.CORNER_RADIUS },
        uBorder: { value: C.BORDER_WIDTH },
        uOpacity: { value: 0 },
        uExitOpacity: { value: 1 },
        uOrbitCenter: { value: new Vector3() },
        uOrbitRadius: { value: 1 },
        uFarBrightness: { value: C.FAR_BRIGHTNESS },
        uOrbitWorld: { value: new Matrix4() },
        uRibbon: { value: new Vector4(radius, layout.pitch, layout.arc, 0) },
        uPhase: { value: 0 },
        uReveal: { value: 0 },
        uTime: { value: 0 },
        uGlitch: { value: 0 },
        uGlitchMediaOnly: { value: 0 },
        uGlitchParams: { value: new Vector4(CONFIG.projectPreview.GLITCH_BANDS, CONFIG.projectPreview.GLITCH_SLICE, CONFIG.projectPreview.GLITCH_SPLIT, CONFIG.projectPreview.GLITCH_HZ) },
        uSkullBounds: { value: new Vector4() },
        uSkullDepth: { value: 0 },
        uFadeReach: { value: 1 },
        uContentOpacity: { value: 0 },
        uFrontOpacity: { value: 0 },
        uGlow: { value: 0 },
        uHologramTint: { value: C.HOLOGRAM_TINT },
        uScan: { value: new Vector3(C.HOLOGRAM_SCAN_LINES, C.HOLOGRAM_SCAN_STRENGTH, C.HOLOGRAM_SCAN_SPEED) },
      },
      side: DoubleSide,
      transparent: true,
      depthWrite: false,
      forceSinglePass: true,
      toneMapped: false,
    });
  }, [texture, hudTexture, radius, layout]);

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
      material.uniforms.uCover.value.set(Math.max(1, PROJECT_ORBIT_ASPECT / aspect), Math.max(1, aspect / PROJECT_ORBIT_ASPECT));
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
      material.uniforms.uCover.value.set(Math.max(1, PROJECT_ORBIT_ASPECT / aspect), Math.max(1, aspect / PROJECT_ORBIT_ASPECT));
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
    const assembly = heroAssemblyAt(progressRef.current, reducedMotion);
    const exit = 1 - assembly.opacity;
    const present = startTrigger && revealProgressRef.current === 0 && !caseStudyStage.open;
    currentMaterial.uniforms.uContentOpacity.value = settings.contentOpacity;
    currentMaterial.uniforms.uFrontOpacity.value = settings.frontOpacity;
    currentMaterial.uniforms.uFadeReach.value = settings.fadeReach;
    currentMaterial.uniforms.uGlow.value = settings.glow;
    currentMaterial.uniforms.uHudStyle.value = settings.style === "cyberpunk" ? 1 : 0;
    currentMaterial.uniforms.uHudDetail.value = settings.hudDetail;
    currentMaterial.uniforms.uTime.value = reducedMotion ? 0 : state.clock.elapsedTime;
    currentMaterial.uniforms.uGlitch.value = reducedMotion ? 0 : settings.glitch;
    currentMaterial.uniforms.uGlitchMediaOnly.value = settings.glitchScope === "media" ? 1 : 0;
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
      if (!intro.complete) {
        intro.elapsed = entranceProgressRef.current.orbitElapsed;
        rotation.current.rotation.y = projectOrbitEntranceAt(intro.elapsed, layout.arc).phase;
        intro.complete = intro.elapsed >= C.ENTRANCE_DURATION;
      }
    }
    const moving = present && exit < 1 && intro.complete && !document.hidden;
    advanceOrbit(delta, moving && progressRef.current <= CONFIG.heroAssembly.UNFOLD_START, reducedMotion, moving);
    if (rotation.current) {
      if (intro.complete) rotation.current.rotation.y += assembly.spin - scrollSpin.current;
      scrollSpin.current = intro.complete ? assembly.spin : 0;
      currentMaterial.uniforms.uPhase.value = rotation.current.rotation.y;
    }
    currentMaterial.uniforms.uRibbon.value.set(radius, layout.pitch, layout.arc, assembly.unfold);
    const reveal = intro.complete ? 1 : projectOrbitEntranceAt(intro.elapsed, layout.arc).reveal;
    currentMaterial.uniforms.uReveal.value = reveal;
    const targetOpacity = present && intro.started ? 1 : 0;
    const opacityResponse = targetOpacity > currentMaterial.uniforms.uOpacity.value ? C.ENTRANCE_RESPONSE : C.RESPONSE;
    currentMaterial.uniforms.uOpacity.value = MathUtils.damp(currentMaterial.uniforms.uOpacity.value, targetOpacity, opacityResponse, dt);
    currentMaterial.uniforms.uExitOpacity.value = assembly.opacity;
    if (group.current) {
      group.current.rotation.x = MathUtils.degToRad(settings.tiltX) * (1 - assembly.unfold);
      group.current.rotation.z = MathUtils.degToRad(settings.tiltZ) * (1 - assembly.unfold);
      group.current.visible = currentMaterial.uniforms.uOpacity.value > 0.001 && exit < 1;
      group.current.getWorldPosition(currentMaterial.uniforms.uOrbitCenter.value);
      group.current.getWorldScale(worldScale);
      currentMaterial.uniforms.uOrbitRadius.value = radius * worldScale.x;
      currentMaterial.uniforms.uOrbitWorld.value.copy(group.current.matrixWorld);
      if (group.current.visible && skullRef.current) {
        const skull = skullRef.current;
        skull.updateWorldMatrix(true, false);
        const { corners, center, projected, point } = skullBounds;
        projected.makeEmpty();
        for (const corner of corners) {
          point.copy(corner).applyMatrix4(skull.matrixWorld).project(state.camera);
          projected.expandByPoint(point);
        }
        currentMaterial.uniforms.uSkullBounds.value.set(
          (projected.min.x + projected.max.x) / 2,
          (projected.min.y + projected.max.y) / 2,
          (projected.max.x - projected.min.x) / 2,
          (projected.max.y - projected.min.y) / 2,
        );
        point.copy(center).applyMatrix4(skull.matrixWorld).applyMatrix4(state.camera.matrixWorldInverse);
        currentMaterial.uniforms.uSkullDepth.value = -point.z;
      }
    }
    colliderRef.current.object = rotation.current;
    colliderRef.current.radius = radius;
    colliderRef.current.shape = collisionShape;
    colliderRef.current.active = present && exit < 1 && reveal > 0 && currentMaterial.uniforms.uOpacity.value > 0.01;
    colliderRef.current.opacity = currentMaterial.uniforms.uOpacity.value * assembly.opacity;
    colliderRef.current.reveal = reveal;
    colliderRef.current.phase = rotation.current?.rotation.y ?? 0;
    colliderRef.current.curvature = 1 - assembly.unfold;
  }, -2);

  return (
    <group ref={group} position={[0, responsiveScale * settings.offsetY, 0]} rotation={[MathUtils.degToRad(settings.tiltX), 0, MathUtils.degToRad(settings.tiltZ)]}>
      <group ref={rotation}>
        {Array.from({ length: layout.count }, (_, index) => {
          const angle = index / layout.count * Math.PI * 2;
          return (
            <mesh
              key={index}
              frustumCulled={false}
              geometry={geometries[index]}
              position={[Math.sin(angle) * radius, 0, Math.cos(angle) * radius]}
              rotation={[0, angle, 0]}
            >
              <primitive object={material} attach="material" ref={index === 0 ? materialRef : undefined} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}
