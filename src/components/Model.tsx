import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { useHeroLayout } from "@/context/HeroLayoutContext";
import { useDebugSettings } from "@/context/DebugSettingsContext";
import { useAnimationContext } from "@/context/AnimationContext";
import { useHeroTransition } from "@/context/HeroTransitionContext";
import { curlScrimCoverY } from "@/lib/detailsCurl";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { CONFIG } from "../config/constants";
import { useSceneCapabilities } from "@/context/SceneCapabilitiesContext";
import { ProjectOrbit } from "@/components/ProjectOrbit";
import { SkullParticles } from "@/components/SkullParticles";
import { SkullGlass } from "@/components/SkullGlass";
import type { ProjectOrbitCollider } from "@/lib/projectOrbitCollision";

// Nothing of the model may show above the details gradient. Cutting it there
// rather than fading it keeps the model's own opacity out of it: the cut edge
// lands where the gradient is already at full cover, so it never shows. Module
// scope like the curl's own uniforms, for the one model in the scene.
const CLIP_DISABLED = 1e6;
const FOLD_CLIP = new THREE.Plane(new THREE.Vector3(0, -1, 0), CLIP_DISABLED);
const FOLD_CLIP_PLANES = [FOLD_CLIP];

useGLTF.setDecoderPath("/draco/");

export default function Model({ isDebug }: { isDebug: boolean }) {
  const animGroupRef = useRef<THREE.Group>(null);
  const transitionScaleGroupRef = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Group>(null);
  const orbitCollider = useRef<ProjectOrbitCollider>({ object: null, radius: 1, active: false });
  const entranceProgressRef = useRef({ progress: 0, orbitElapsed: 0 });
  const { nodes } = useGLTF("/glbs/czaszka2draco.glb");
  const surface = useMemo(() => {
    const source = nodes.Sphere;
    return source instanceof THREE.Mesh ? source.geometry.clone().center() : null;
  }, [nodes]);
  useEffect(() => () => surface?.dispose(), [surface]);

  const { responsiveScale: baseResponsiveScale } = useHeroLayout();
  const { startTrigger } = useAnimationContext();
  const { progressRef, revealProgressRef, modelAnchorRef } = useHeroTransition();
  const prefersReducedMotion = usePrefersReducedMotion();
  const { compactHeight, inputMode, layoutMode, qualityTier } =
    useSceneCapabilities();
  const lowQuality = !isDebug && (inputMode === "coarse" || qualityTier === "low");

  const modelDepth = useRef(new THREE.Vector3(0, 0, CONFIG.model.DEPTH_Z));
  const previousStage = useRef(0);

  const { viewport } = useThree();

  const skullRotationGroupRef = useRef<THREE.Group>(null);

  const debug = useDebugSettings();

  useGSAP(() => {
    if (!animGroupRef.current) return;
    entranceProgressRef.current.progress = 0;
    entranceProgressRef.current.orbitElapsed = 0;

    if (!startTrigger) {
      animGroupRef.current.scale.set(0, 0, 0);
      return;
    }

    if (prefersReducedMotion) {
      animGroupRef.current.scale.set(0.95, 0.95, 0.95);
      const timeline = gsap.timeline({ delay: 0.5 });
      timeline.to(animGroupRef.current.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.4,
        ease: "power2.out",
      }, 0);
      timeline.to(entranceProgressRef.current, { progress: 1, duration: 0.4, ease: "none" }, 0);
      return;
    }

    const duration = debug.skullAppearance.mode === "fragments" ? CONFIG.model.FRAGMENTS.ENTRANCE_DURATION : 1.5;
    const timeline = gsap.timeline({ delay: 1 });
    timeline.to(animGroupRef.current.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration,
      ease: debug.skullAppearance.mode === "fragments" ? CONFIG.model.FRAGMENTS.ENTRANCE_EASE : "elastic.out(1, 0.5)",
    }, 0);
    timeline.to(entranceProgressRef.current, { progress: 1, duration, ease: "none" }, 0);
    timeline.to(entranceProgressRef.current, {
      orbitElapsed: CONFIG.projectOrbit.ENTRANCE_DURATION,
      duration: CONFIG.projectOrbit.ENTRANCE_DURATION,
      ease: "none",
    }, duration * CONFIG.projectOrbit.ENTRANCE_START);
  }, { dependencies: [startTrigger, prefersReducedMotion], revertOnUpdate: true });

  const responsiveScale = baseResponsiveScale * debug.particles.scale;

  const skullRotation = debug.skullRotation;

  useFrame((state, delta) => {
    const scrollProgress = THREE.MathUtils.clamp(progressRef.current, 0, 1);
    const workstationRevealed = revealProgressRef.current > 0.001;
    const inDetails = scrollProgress >= CONFIG.model.DETAILS_POPUP_START;

    const stage = layoutMode === "narrow" ? 0 : inDetails ? 1 : 0;
    const teleported = stage !== previousStage.current;
    previousStage.current = stage;
    const dt = Math.min(delta, 1 / 30);
    const entryRamp = THREE.MathUtils.clamp(
      (scrollProgress - CONFIG.model.DETAILS_POPUP_START) /
        CONFIG.model.POPUP_RAMP_SPAN,
      0,
      1,
    );
    const detailsScale = modelAnchorRef.current.scale * entryRamp;

    const modelViewport = state.viewport.getCurrentViewport(
      state.camera,
      modelDepth.current,
    );
    // The scrim is authored against the details sheet at z≈0; the model hangs a
    // depth closer, so the cut's world Y has to travel through this to land on
    // the same screen height.
    const foldDepthScale = modelViewport.height / viewport.height;

    FOLD_CLIP.constant =
      inDetails
        ? curlScrimCoverY() * foldDepthScale
        : CLIP_DISABLED;

    if (animGroupRef.current) {
      animGroupRef.current.visible = !workstationRevealed;
      const heroYCurrent =
        CONFIG.model.BASE_MODEL_Y +
        scrollProgress *
          viewport.height *
          CONFIG.model.MODEL_UP_TRAVEL_FACTOR;
      const detailsTargetY =
        modelAnchorRef.current.yFraction * modelViewport.height;
      const detailsTargetX =
        modelAnchorRef.current.xFraction * modelViewport.width;
      const narrowHeroX = compactHeight
        ? modelViewport.width * CONFIG.model.NARROW_COMPACT_X_FRACTION
        : 0;

      const narrowTransition = THREE.MathUtils.smoothstep(
        scrollProgress,
        CONFIG.model.NARROW_TRANSITION_START,
        1,
      );
      const targetX =
        layoutMode === "narrow"
          ? THREE.MathUtils.lerp(
              narrowHeroX,
              detailsTargetX,
              narrowTransition,
            )
          : inDetails
            ? detailsTargetX
            : 0;
      const targetY =
        layoutMode === "narrow"
          ? THREE.MathUtils.lerp(heroYCurrent, detailsTargetY, narrowTransition)
          : inDetails
            ? detailsTargetY
            : heroYCurrent;

      animGroupRef.current.position.x = teleported
        ? targetX
        : THREE.MathUtils.damp(
            animGroupRef.current.position.x,
            targetX,
            10,
            dt,
          );
      animGroupRef.current.position.y = teleported
        ? targetY
        : THREE.MathUtils.damp(
            animGroupRef.current.position.y,
            targetY,
            10,
            dt,
          );
    }

    if (transitionScaleGroupRef.current) {
      const scaleOutProgress = THREE.MathUtils.clamp(
        (scrollProgress - CONFIG.model.SCALE_OUT_START) /
          (CONFIG.model.SCALE_OUT_END - CONFIG.model.SCALE_OUT_START),
        0,
        1,
      );
      const narrowTransition = THREE.MathUtils.smoothstep(
        scrollProgress,
        CONFIG.model.NARROW_TRANSITION_START,
        1,
      );
      const narrowHeroScale = compactHeight
        ? CONFIG.model.NARROW_COMPACT_HERO_SCALE
        : CONFIG.model.NARROW_HERO_SCALE;
      const targetScale =
        layoutMode === "narrow"
          ? THREE.MathUtils.lerp(
              narrowHeroScale,
              modelAnchorRef.current.scale,
              narrowTransition,
            )
          : inDetails
            ? detailsScale
            : 1 - scaleOutProgress;

      const currentScale = teleported
        ? 0
        : transitionScaleGroupRef.current.scale.x;
      const smoothScale = THREE.MathUtils.damp(
        currentScale,
        targetScale,
        10,
        dt,
      );
      transitionScaleGroupRef.current.scale.setScalar(smoothScale);
    }

    if (mesh.current) {
      const t = state.clock.getElapsedTime() * CONFIG.model.IDLE_ROTATION_SPEED;
      const idle = prefersReducedMotion ? 0 : CONFIG.model.IDLE_MAX_ANGLE;
      const pointer = !prefersReducedMotion && inputMode === "fine" && !inDetails
        ? CONFIG.model.CURSOR_MAX_ANGLE
        : 0;
      const x = -THREE.MathUtils.clamp(state.pointer.y, -1, 1) * pointer;
      const y = THREE.MathUtils.clamp(state.pointer.x, -1, 1) * pointer;
      const length = Math.hypot(x, y);
      const limit = length > pointer && length > 0 ? pointer / length : 1;
      mesh.current.rotation.x = THREE.MathUtils.damp(mesh.current.rotation.x, x * limit, CONFIG.model.TILT_RESPONSE, dt);
      mesh.current.rotation.y = THREE.MathUtils.damp(mesh.current.rotation.y, y * limit, CONFIG.model.TILT_RESPONSE, dt);
      mesh.current.rotation.z = Math.sin(t) * idle;
    }
  }, -3);

  return (
    <group>
      <group position={[0, 0.1, CONFIG.model.DEPTH_Z]} ref={animGroupRef}>
        <group ref={transitionScaleGroupRef}>
          <ProjectOrbit colliderRef={orbitCollider} entranceProgressRef={entranceProgressRef} />
          <group ref={mesh}>
            <group
              ref={skullRotationGroupRef}
              rotation={[skullRotation.x, skullRotation.y, skullRotation.z]}
            >
              <group scale={responsiveScale}>
                {debug.skullAppearance.mode === "glass" && surface && (
                  <SkullGlass
                    geometry={surface}
                    lowQuality={lowQuality}
                    clippingPlanes={FOLD_CLIP_PLANES}
                  />
                )}
                {debug.skullAppearance.mode !== "glass" && (
                  <SkullParticles
                    entranceRef={animGroupRef}
                    orbitCollider={orbitCollider}
                    fragments={debug.skullAppearance.mode === "fragments"}
                    source={nodes.Sphere}
                    lowQuality={lowQuality}
                    clippingPlanes={FOLD_CLIP_PLANES}
                  />
                )}
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}
