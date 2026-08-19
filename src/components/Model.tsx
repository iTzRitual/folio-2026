import {
  Clone,
  useGLTF,
  MeshTransmissionMaterial,
  Center,
} from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
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

// Nothing of the model may show above the details gradient. Cutting it there
// rather than fading it keeps the model's own opacity out of it: the cut edge
// lands where the gradient is already at full cover, so it never shows. Module
// scope like the curl's own uniforms, for the one model in the scene.
const CLIP_DISABLED = 1e6;
const FOLD_CLIP = new THREE.Plane(new THREE.Vector3(0, -1, 0), CLIP_DISABLED);
const FOLD_CLIP_PLANES = [FOLD_CLIP];

useGLTF.setDecoderPath("/draco/");

// Swapping this in for the refraction buffer is what stops
// MeshTransmissionMaterial re-rendering the scene: it only does so while its
// buffer is still the FBO it created.
const BLANK_BUFFER = new THREE.DataTexture(
  new Uint8Array([0, 0, 0, 255]),
  1,
  1,
);
BLANK_BUFFER.needsUpdate = true;

export default function Model() {
  const animGroupRef = useRef<THREE.Group>(null);
  const transitionScaleGroupRef = useRef<THREE.Group>(null);
  const interactiveGroupRef = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Group>(null);
  const { nodes } = useGLTF("/glbs/czaszka2draco.glb");

  const {
    grabAreaRadius: baseGrabAreaRadius,
    stickyAreaRadius: baseStickyAreaRadius,
    responsiveScale: baseResponsiveScale,
  } = useHeroLayout();
  const { startTrigger } = useAnimationContext();
  const { progressRef, revealProgressRef, modelAnchorRef } = useHeroTransition();
  const prefersReducedMotion = usePrefersReducedMotion();
  const { compactHeight, inputMode, layoutMode, qualityTier } =
    useSceneCapabilities();
  const directManipulation = inputMode === "fine";
  const lowQuality = inputMode === "coarse" || qualityTier === "low";

  const pos = useRef(new THREE.Vector3(0, 0, 0));
  const vel = useRef(new THREE.Vector3(0, 0, 0));
  const isDragging = useRef(false);
  const isInteractionLockedRef = useRef(false);

  const isHoveringCenter = useRef(false);
  const isHoveringModel = useRef(false);

  const lastInteractionTime = useRef(0);
  const modelDepth = useRef(new THREE.Vector3(0, 0, CONFIG.model.DEPTH_Z));
  const previousStage = useRef(0);

  const { viewport } = useThree();

  const skullRotationGroupRef = useRef<THREE.Group>(null);
  const skullMeshRef = useRef<THREE.Mesh | null>(null);
  const transmissionRef =
    useRef<React.ComponentRef<typeof MeshTransmissionMaterial>>(null);
  const refractionBuffer = useRef<THREE.Texture | null>(null);

  const debug = useDebugSettings();

  useLayoutEffect(() => {
    mesh.current?.traverse((child) => {
      if (skullMeshRef.current || !(child as THREE.Mesh).isMesh) return;
      skullMeshRef.current = child as THREE.Mesh;
    });
  }, [nodes.Sphere]);

  useGSAP(() => {
    if (!animGroupRef.current) return;

    if (!startTrigger) {
      animGroupRef.current.scale.set(0, 0, 0);
      return;
    }

    if (prefersReducedMotion) {
      animGroupRef.current.scale.set(0.95, 0.95, 0.95);
      gsap.to(animGroupRef.current.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.4,
        ease: "power2.out",
        delay: 0.5,
      });
      return;
    }

    gsap.to(animGroupRef.current.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 1.5,
      ease: "elastic.out(1, 0.5)",
      delay: 1,
    });
  }, [startTrigger, prefersReducedMotion]);

  const materialProps = debug.material;

  const responsiveScale = baseResponsiveScale * materialProps.scale;
  const grabAreaRadius = baseGrabAreaRadius * materialProps.scale;
  const stickyAreaRadius = baseStickyAreaRadius * materialProps.scale;

  const skullRotation = debug.skullRotation;

  useFrame((state, delta) => {
    const scrollProgress = THREE.MathUtils.clamp(progressRef.current, 0, 1);
    const phase2Revealed = revealProgressRef.current > 0.001;
    const shouldLockInteraction =
      !directManipulation ||
      scrollProgress > CONFIG.model.INTERACTION_LOCK_EPSILON;
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

    if (isInteractionLockedRef.current !== shouldLockInteraction) {
      isInteractionLockedRef.current = shouldLockInteraction;

      if (shouldLockInteraction) {
        isDragging.current = false;
        isHoveringCenter.current = false;
        isHoveringModel.current = false;

        document.body.style.cursor = "auto";
      }
    }

    if (shouldLockInteraction) {
      pos.current.x = THREE.MathUtils.damp(
        pos.current.x,
        0,
        CONFIG.model.RETURN_TO_CENTER_SMOOTHNESS,
        dt,
      );
      pos.current.y = THREE.MathUtils.damp(
        pos.current.y,
        0,
        CONFIG.model.RETURN_TO_CENTER_SMOOTHNESS,
        dt,
      );

      const velocityDamping = Math.exp(
        -CONFIG.model.RETURN_VELOCITY_DAMPING * dt,
      );
      vel.current.multiplyScalar(velocityDamping);

      if (pos.current.lengthSq() < CONFIG.model.RETURN_SNAP_EPSILON) {
        pos.current.set(0, 0, 0);
        vel.current.set(0, 0, 0);
      }
    }

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
      animGroupRef.current.visible = !phase2Revealed;
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

    const outerGroupY =
      animGroupRef.current?.position.y ?? CONFIG.model.BASE_MODEL_Y;

    const currentViewport = state.viewport.getCurrentViewport(
      state.camera,
      animGroupRef.current?.position || new THREE.Vector3(0, 0.1, 2),
    );

    const cursorX = (state.pointer.x * currentViewport.width) / 2;
    const cursorY =
      (state.pointer.y * currentViewport.height) / 2 - outerGroupY;

    if (!shouldLockInteraction) {
      if (isDragging.current) {
        lastInteractionTime.current = state.clock.getElapsedTime();

        const dragStiffness = 8;
        vel.current.x = (cursorX - pos.current.x) * dragStiffness;
        vel.current.y = (cursorY - pos.current.y) * dragStiffness;

        pos.current.x += vel.current.x * dt;
        pos.current.y += vel.current.y * dt;
      } else {
        pos.current.x += vel.current.x * dt;
        pos.current.y += vel.current.y * dt;

        const collisionRadius = responsiveScale * 1.2;
        const limitX = currentViewport.width / 2 - collisionRadius;
        const limitTop =
          currentViewport.height / 2 - outerGroupY - collisionRadius;
        const limitBottom =
          -currentViewport.height / 2 - outerGroupY + collisionRadius;

        const edgeSpring = 50.0;

        if (pos.current.x > limitX) {
          vel.current.x -= (pos.current.x - limitX) * edgeSpring * dt;
        } else if (pos.current.x < -limitX) {
          vel.current.x -= (pos.current.x + limitX) * edgeSpring * dt;
        }

        if (pos.current.y > limitTop) {
          vel.current.y -= (pos.current.y - limitTop) * edgeSpring * dt;
        } else if (pos.current.y < limitBottom) {
          vel.current.y -= (pos.current.y - limitBottom) * edgeSpring * dt;
        }

        const timeSinceRelease =
          state.clock.getElapsedTime() - lastInteractionTime.current;
        const inactivityDelay = 2.0;

        if (timeSinceRelease > inactivityDelay) {
          let targetX = 0;
          let targetY = 0;

          if (isHoveringCenter.current && !prefersReducedMotion) {
            targetX = cursorX;
            targetY = cursorY;
          }

          vel.current.x += (targetX - pos.current.x) * 4 * dt;
          vel.current.y += (targetY - pos.current.y) * 4 * dt;

          vel.current.x -= vel.current.x * 3.0 * dt;
          vel.current.y -= vel.current.y * 3.0 * dt;
        } else {
          const friction = 1.0;
          vel.current.x -= vel.current.x * friction * dt;
          vel.current.y -= vel.current.y * friction * dt;
        }
      }
    }

    if (interactiveGroupRef.current) {
      interactiveGroupRef.current.position.copy(pos.current);
    }

    if (mesh.current && !prefersReducedMotion) {
      const t = state.clock.getElapsedTime();
      mesh.current.rotation.z += dt * CONFIG.model.IDLE_ROTATION_SPEED_Z;
      mesh.current.rotation.x =
        Math.sin(t * CONFIG.model.IDLE_ROTATION_SPEED) *
        CONFIG.model.IDLE_ROTATION_SPEED_X_MAG;
      mesh.current.rotation.y =
        Math.cos(t * CONFIG.model.IDLE_ROTATION_SPEED) *
        CONFIG.model.IDLE_ROTATION_SPEED_Y_MAG;
    }

    const skullMesh = skullMeshRef.current;

    // The refraction buffer costs a full second render of the scene. Once the
    // skull has scaled away into the details stage there is nothing left to
    // refract.
    if (transmissionRef.current) {
      const current = transmissionRef.current.buffer;
      if (current && current !== BLANK_BUFFER)
        refractionBuffer.current = current;

      const worthRefracting =
        skullMesh?.visible !== false &&
        (transitionScaleGroupRef.current?.scale.x ?? 1) >
          CONFIG.model.TRANSMISSION_MIN_SCALE;

      transmissionRef.current.buffer = worthRefracting
        ? (refractionBuffer.current ?? undefined)
        : BLANK_BUFFER;
    }
  });

  return (
    <group>
      <group position={[0, 0.1, CONFIG.model.DEPTH_Z]} ref={animGroupRef}>
        <mesh
          position={[0, 0, 0]}
          onPointerEnter={() => {
            if (!directManipulation || isInteractionLockedRef.current) return;
            isHoveringCenter.current = true;
          }}
          onPointerLeave={() => {
            if (!directManipulation || isInteractionLockedRef.current) return;
            isHoveringCenter.current = false;
          }}
        >
          <circleGeometry args={[stickyAreaRadius, 32]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>

        <group ref={transitionScaleGroupRef}>
          <group ref={interactiveGroupRef}>
            <mesh
              position={[0, 0, 0.01]}
              onPointerEnter={() => {
                if (!directManipulation || isInteractionLockedRef.current) return;
                isHoveringModel.current = true;
                document.body.style.cursor = "grab";
              }}
              onPointerLeave={() => {
                if (!directManipulation || isInteractionLockedRef.current) return;
                isHoveringModel.current = false;
                document.body.style.cursor = "auto";
              }}
              onPointerDown={(e) => {
                if (!directManipulation || isInteractionLockedRef.current) return;
                isDragging.current = true;
                document.body.style.cursor = "grabbing";
                document.body.style.userSelect = "none";
                (e.target as Element).setPointerCapture(e.pointerId);
                e.stopPropagation();
              }}
              onPointerUp={(e) => {
                if (!directManipulation || isInteractionLockedRef.current) return;
                isDragging.current = false;
                document.body.style.cursor = isHoveringModel.current
                  ? "grab"
                  : "auto";
                document.body.style.userSelect = "";
                (e.target as Element).releasePointerCapture(e.pointerId);
              }}
              onPointerCancel={(e) => {
                if (!directManipulation || isInteractionLockedRef.current) return;
                isDragging.current = false;
                document.body.style.cursor = "auto";
                document.body.style.userSelect = "";
                (e.target as Element).releasePointerCapture(e.pointerId);
              }}
            >
              <circleGeometry args={[grabAreaRadius, 32]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

            <group
              ref={skullRotationGroupRef}
              rotation={[skullRotation.x, skullRotation.y, skullRotation.z]}
            >
              <Center>
                <Clone ref={mesh} object={nodes.Sphere} scale={responsiveScale}>
                  <MeshTransmissionMaterial
                    ref={transmissionRef}
                    clippingPlanes={FOLD_CLIP_PLANES}
                    {...materialProps}
                    resolution={
                      lowQuality
                        ? CONFIG.model.TRANSMISSION_RESOLUTION_MOBILE
                        : CONFIG.model.TRANSMISSION_RESOLUTION
                    }
                    samples={
                      lowQuality
                        ? CONFIG.model.TRANSMISSION_SAMPLES_MOBILE
                        : CONFIG.model.TRANSMISSION_SAMPLES
                    }
                  />
                </Clone>
              </Center>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}
