import { useGLTF, MeshTransmissionMaterial, useFBO } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { useDebugSettings } from "@/context/DebugSettingsContext";
import { useAnimationContext } from "@/context/AnimationContext";
import { useHeroTransition } from "@/context/HeroTransitionContext";
import { curlScrimCoverY } from "@/lib/detailsCurl";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { CONFIG } from "@/config/constants";
import { useSceneCapabilities } from "@/context/SceneCapabilitiesContext";
import { ScanSurface, SCAN_LAYER } from "./HeroScene/ScanSurface";
import { createScanGeometry } from "@/lib/scanGeometry";

const CLIP_DISABLED = 1e6;
const FOLD_CLIP = new THREE.Plane(new THREE.Vector3(0, -1, 0), CLIP_DISABLED);
const FOLD_CLIP_PLANES = [FOLD_CLIP];
useGLTF.setDecoderPath("/draco/");

export default function Model() {
  const animGroupRef = useRef<THREE.Group>(null);
  const transitionScaleGroupRef = useRef<THREE.Group>(null);
  const rotationRef = useRef<THREE.Group>(null);
  const skullMeshRef = useRef<THREE.Mesh>(null);
  const { nodes } = useGLTF("/glbs/czaszka2draco.glb");
  const geometry = useMemo(() => createScanGeometry(nodes.Sphere as THREE.Mesh), [nodes]);
  const scanEnabled = useRef(false);
  const { viewport, gl, events } = useThree();
  const { startTrigger } = useAnimationContext();
  const { progressRef, revealProgressRef, modelAnchorRef } = useHeroTransition();
  const prefersReducedMotion = usePrefersReducedMotion();
  const { compactHeight, inputMode, layoutMode, qualityTier } = useSceneCapabilities();
  const lowQuality = inputMode === "coarse" || qualityTier === "low";
  const background = useFBO(lowQuality ? CONFIG.scan.BACKGROUND_LOW : CONFIG.scan.BACKGROUND_HIGH);
  const debug = useDebugSettings();
  const modelDepth = useRef(new THREE.Vector3(0, 0, CONFIG.model.DEPTH_Z));
  const previousStage = useRef(0);
  const pointerPresent = useRef(false);
  const pointerTarget = useRef(new THREE.Vector2());

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => {
    const canvas = gl.domElement;
    const move = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const rect = canvas.getBoundingClientRect();
      pointerTarget.current.set(
        THREE.MathUtils.clamp((event.clientX - rect.left) / rect.width * 2 - 1, -1, 1),
        THREE.MathUtils.clamp(1 - (event.clientY - rect.top) / rect.height * 2, -1, 1),
      );
      pointerPresent.current = true;
    };
    const leave = () => { pointerPresent.current = false; };
    const surface = events.connected || canvas;
    surface.addEventListener("pointermove", move);
    surface.addEventListener("pointerleave", leave);
    window.addEventListener("blur", leave);
    return () => {
      surface.removeEventListener("pointermove", move);
      surface.removeEventListener("pointerleave", leave);
      window.removeEventListener("blur", leave);
    };
  }, [gl, events.connected]);
  useLayoutEffect(() => { skullMeshRef.current?.layers.set(SCAN_LAYER); }, []);

  useGSAP(() => {
    const group = animGroupRef.current;
    if (!group) return;
    if (!startTrigger) { group.scale.setScalar(0); return; }
    if (prefersReducedMotion) { group.scale.setScalar(1); return; }
    gsap.to(group.scale, { x: 1, y: 1, z: 1, duration: CONFIG.scan.ENTRANCE_DURATION,
      ease: "power3.out", delay: CONFIG.scan.ENTRANCE_DELAY });
  }, [startTrigger, prefersReducedMotion]);

  useFrame((state, delta) => {
    const scrollProgress = THREE.MathUtils.clamp(progressRef.current, 0, 1);
    const workstationRevealed = revealProgressRef.current > 0.001;
    const inDetails = scrollProgress >= CONFIG.model.DETAILS_POPUP_START;
    const stage = layoutMode === "narrow" ? 0 : inDetails ? 1 : 0;
    const teleported = stage !== previousStage.current;
    previousStage.current = stage;
    const dt = Math.min(delta, 1 / 30);
    const entryRamp = THREE.MathUtils.clamp(
      (scrollProgress - CONFIG.model.DETAILS_POPUP_START) / CONFIG.model.POPUP_RAMP_SPAN, 0, 1);
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

    const follow = inputMode === "fine" && !prefersReducedMotion && pointerPresent.current &&
      scrollProgress < CONFIG.model.INTERACTION_LOCK_EPSILON;
    const yaw = debug.skullRotation.y + (follow ? pointerTarget.current.x * CONFIG.scan.YAW : 0);
    const pitch = debug.skullRotation.x - (follow ? pointerTarget.current.y * CONFIG.scan.PITCH : 0);
    if (rotationRef.current) {
      rotationRef.current.rotation.set(
        prefersReducedMotion ? pitch : THREE.MathUtils.damp(rotationRef.current.rotation.x, pitch, CONFIG.scan.RESPONSE, dt),
        prefersReducedMotion ? yaw : THREE.MathUtils.damp(rotationRef.current.rotation.y, yaw, CONFIG.scan.RESPONSE, dt),
        debug.skullRotation.z,
      );
    }
    scanEnabled.current = follow && debug.scan.enabled;
    if (skullMeshRef.current) {
      const height = Math.min(modelViewport.height * (layoutMode === "narrow" ? CONFIG.scan.NARROW_HEIGHT : CONFIG.scan.HEIGHT),
        modelViewport.width * CONFIG.scan.WIDTH_LIMIT);
      skullMeshRef.current.scale.setScalar(height * debug.material.scale / CONFIG.scan.MATERIAL_SCALE);
    }
  }, -1);

  return (
    <>
      <group position={[0, CONFIG.model.BASE_MODEL_Y, CONFIG.model.DEPTH_Z]} ref={animGroupRef}>
        <group ref={transitionScaleGroupRef}>
          <group ref={rotationRef}>
            <mesh ref={skullMeshRef} geometry={geometry} frustumCulled={false} raycast={() => null}>
              <MeshTransmissionMaterial
                {...debug.material}
                buffer={background.texture}
                clippingPlanes={FOLD_CLIP_PLANES}
                resolution={lowQuality ? CONFIG.model.TRANSMISSION_RESOLUTION_MOBILE : CONFIG.model.TRANSMISSION_RESOLUTION}
                samples={lowQuality ? CONFIG.model.TRANSMISSION_SAMPLES_MOBILE : CONFIG.model.TRANSMISSION_SAMPLES}
              />
            </mesh>
          </group>
        </group>
      </group>
      <ScanSurface
        skull={skullMeshRef}
        background={background}
        enabled={scanEnabled}
        pointer={pointerTarget}
        clip={FOLD_CLIP}
      />
    </>
  );
}
