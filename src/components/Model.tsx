import {
  Clone,
  useGLTF,
  MeshTransmissionMaterial,
  Center,
} from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { useHeroLayout } from "@/context/HeroLayoutContext";
import { useDebugSettings } from "@/context/DebugSettingsContext";
import { useAnimationContext } from "@/context/AnimationContext";
import { useHeroTransition } from "@/context/HeroTransitionContext";
import {
  useHoveredPreview,
  useProjectHoverActions,
} from "@/context/ProjectHoverContext";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { attachFlatMorphTarget, buildFlatMorphTarget } from "@/lib/skullMorph";
import {
  ProjectPreviewPlane,
  previewUniforms,
  useProjectPreviewTextures,
} from "./DetailsScene/ProjectPreviewPlane";
import { CONFIG } from "../config/constants";

// The GLB is Blender-oriented, so the flattened plate lies in the mesh's local
// XZ plane. Facing it at the camera means mapping local +Z to world up, which
// is exactly the -90° X rotation the glTF node carries.
const PLATE_FACING = new THREE.Quaternion().setFromEuler(
  new THREE.Euler(-Math.PI / 2, 0, 0),
);
// The screenshot rides in the mesh's own frame, so it needs the inverse turn:
// its +Z normal onto local -Y, the face PLATE_FACING then points at the camera.
const PLATE_IMAGE_FACING = new THREE.Quaternion().setFromEuler(
  new THREE.Euler(Math.PI / 2, 0, 0),
);
const IDENTITY_QUATERNION = new THREE.Quaternion();

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

export default function Model({ isMobile }: { isMobile?: boolean }) {
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
  const { progressRef, modelAnchorRef } = useHeroTransition();
  const prefersReducedMotion = usePrefersReducedMotion();

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

  const morphOrientRef = useRef<THREE.Group>(null);
  const skullRotationGroupRef = useRef<THREE.Group>(null);
  const previewGroupRef = useRef<THREE.Group>(null);
  const previewMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const skullMeshRef = useRef<THREE.Mesh | null>(null);
  const transmissionRef =
    useRef<React.ComponentRef<typeof MeshTransmissionMaterial>>(null);
  const refractionBuffer = useRef<THREE.Texture | null>(null);

  // Details — and with it the project hover — is desktop only.
  const previewTextures = useProjectPreviewTextures(!isMobile);
  const hoveredPreview = useHoveredPreview();
  const { resetHoveredPreview } = useProjectHoverActions();
  // Keep the last hovered preview around so the plate can animate back out
  // with the right screenshot still on it.
  const [shownPreview, setShownPreview] = useState<string | null>(null);
  if (hoveredPreview && hoveredPreview !== shownPreview) {
    setShownPreview(hoveredPreview);
  }
  const previewActive = hoveredPreview !== null;

  const debug = useDebugSettings();
  const previewMode = debug.projectPreview.mode;
  const pinnedMorph = debug.projectPreview.pinMorph
    ? debug.projectPreview.pinnedMorph
    : null;
  const previewSizeMult = debug.projectPreview.sizeMult;
  const previewTuning = {
    bend: debug.projectPreview.bendMult,
    aberration: debug.projectPreview.aberrationMult,
    fullScale: debug.projectPreview.velocityFullScale,
    smoothing: debug.projectPreview.velocitySmoothing,
    growStart: debug.projectPreview.growStart,
  };

  const flatTarget = useMemo(
    () =>
      buildFlatMorphTarget(
        (nodes.Sphere as THREE.Mesh).geometry,
        CONFIG.projectPreview.ASPECT,
        CONFIG.projectPreview.SLAB_THICKNESS,
      ),
    [nodes.Sphere],
  );

  useLayoutEffect(() => {
    attachFlatMorphTarget((nodes.Sphere as THREE.Mesh).geometry, flatTarget);

    mesh.current?.traverse((child) => {
      if (skullMeshRef.current || !(child as THREE.Mesh).isMesh) return;
      const found = child as THREE.Mesh;
      skullMeshRef.current = found;
      found.updateMorphTargets();
      (found.material as THREE.Material).needsUpdate = true;
    });
  }, [nodes.Sphere, flatTarget]);

  const pointerTracking = useRef({ lastY: 0, velocity: 0, seeded: false });

  // 0 = skull, 1 = fully revealed preview. `skull` only moves in "scale" mode.
  const previewProxy = useRef({ morph: 0, plate: 0, skull: 1 });
  const orientTemp = useRef({
    parent: new THREE.Quaternion(),
    orient: new THREE.Quaternion(),
    mesh: new THREE.Quaternion(),
    local: new THREE.Quaternion(),
    target: new THREE.Quaternion(),
    plateCenter: new THREE.Vector3(),
    meshScale: new THREE.Vector3(),
    parentScale: new THREE.Vector3(),
  });

  useGSAP(
    () => {
      const proxy = previewProxy.current;
      const active = previewActive;
      const cfg = CONFIG.projectPreview;

      gsap.killTweensOf(proxy);

      if (prefersReducedMotion) {
        proxy.morph = active && previewMode === "morph" ? 1 : 0;
        proxy.plate = active ? 1 : 0;
        proxy.skull = active && previewMode === "scale" ? 0 : 1;
        return;
      }

      if (previewMode === "morph") {
        proxy.skull = 1;

        // `plate` is not tweened here: it is read off `morph` in the frame loop,
        // so the screenshot cannot resolve before the plate it sits on exists.
        gsap.to(proxy, {
          morph: active ? 1 : 0,
          duration: active ? cfg.MORPH_IN_DURATION : cfg.MORPH_OUT_DURATION,
          ease: active ? "power3.inOut" : "power2.inOut",
        });
        return;
      }

      proxy.morph = 0;
      const timeline = gsap.timeline();
      if (active) {
        timeline
          .to(proxy, {
            skull: 0,
            duration: cfg.SCALE_SKULL_OUT_DURATION,
            ease: "power2.in",
          })
          .to(
            proxy,
            {
              plate: 1,
              duration: cfg.SCALE_PLANE_IN_DURATION,
              ease: "back.out(1.7)",
            },
            cfg.SCALE_PLANE_IN_DELAY,
          );
      } else {
        timeline
          .to(proxy, {
            plate: 0,
            duration: cfg.SCALE_PLANE_OUT_DURATION,
            ease: "power2.in",
          })
          .to(
            proxy,
            {
              skull: 1,
              duration: cfg.SCALE_SKULL_IN_DURATION,
              ease: "back.out(1.6)",
            },
            cfg.SCALE_SKULL_IN_DELAY,
          );
      }
    },
    // Keyed on whether *any* project is hovered, not on which one — sweeping
    // down the list swaps the screenshot without restarting the morph.
    { dependencies: [previewActive, previewMode, prefersReducedMotion] },
  );

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

  // Geometry-local, like the morph target itself — the group carries the scale.
  const previewWidth = flatTarget.rectWidth;
  const previewHeight = flatTarget.rectHeight;

  const skullRotation = debug.skullRotation;

  useFrame((state, delta) => {
    const scrollProgress = THREE.MathUtils.clamp(progressRef.current, 0, 1);
    const shouldLockInteraction =
      scrollProgress > CONFIG.model.INTERACTION_LOCK_EPSILON;
    const inDetails = scrollProgress >= CONFIG.model.DETAILS_POPUP_START;

    const stage = inDetails ? 1 : 0;
    const teleported = !isMobile && stage !== previousStage.current;
    previousStage.current = stage;
    const dt = Math.min(delta, 1 / 30);
    // Layout-inducing on some engines, and the mobile branch below wants it
    // twice.
    const scrollY = isMobile ? window.scrollY : 0;

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

    if (animGroupRef.current) {
      if (isMobile) {
        const depthViewport = state.viewport.getCurrentViewport(
          state.camera,
          new THREE.Vector3(0, 0, 2),
        );

        const scrolledScreens = scrollY / window.innerHeight;
        const mobileYOffset = 0.1;
        const targetY =
          CONFIG.model.BASE_MODEL_Y +
          mobileYOffset +
          scrolledScreens * depthViewport.height;

        animGroupRef.current.position.x = 0;
        animGroupRef.current.position.y = THREE.MathUtils.damp(
          animGroupRef.current.position.y,
          targetY,
          20,
          dt,
        );
      } else {
        const heroYCurrent =
          CONFIG.model.BASE_MODEL_Y +
          scrollProgress *
            viewport.height *
            CONFIG.model.MODEL_UP_TRAVEL_FACTOR;
        const modelViewport = state.viewport.getCurrentViewport(
          state.camera,
          modelDepth.current,
        );
        const detailsTargetY =
          modelAnchorRef.current.yFraction * modelViewport.height;
        const detailsTargetX =
          modelAnchorRef.current.xFraction * modelViewport.width;

        const targetX = inDetails ? detailsTargetX : 0;
        const targetY = inDetails ? detailsTargetY : heroYCurrent;

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
    }

    if (transitionScaleGroupRef.current) {
      if (isMobile) {
        const scaleOutProgress = THREE.MathUtils.clamp(
          scrollY / (window.innerHeight * 0.8),
          0,
          1,
        );
        const targetScale = 1 - scaleOutProgress * 0.5;

        const currentScale = transitionScaleGroupRef.current.scale.x;
        const smoothScale = THREE.MathUtils.damp(
          currentScale,
          targetScale,
          15,
          dt,
        );
        transitionScaleGroupRef.current.scale.setScalar(smoothScale);
      } else {
        const scaleOutProgress = THREE.MathUtils.clamp(
          (scrollProgress - CONFIG.model.SCALE_OUT_START) /
            (CONFIG.model.SCALE_OUT_END - CONFIG.model.SCALE_OUT_START),
          0,
          1,
        );
        const entryRamp = THREE.MathUtils.clamp(
          (scrollProgress - CONFIG.model.DETAILS_POPUP_START) /
            CONFIG.model.POPUP_RAMP_SPAN,
          0,
          1,
        );
        const targetScale = inDetails
          ? modelAnchorRef.current.scale * entryRamp
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

    // The twins are positioned by transform, and a transform sliding out from
    // under a stationary cursor never fires a leave. Scroll past the list fast
    // enough and the hover sticks, stranding the plate in the hero. Nothing
    // outside Details may hold it.
    if (previewActive && !inDetails) resetHoveredPreview();

    const preview = previewProxy.current;
    const skullMesh = skullMeshRef.current;

    if (pinnedMorph !== null) preview.morph = pinnedMorph;

    // In morph mode the plate's reveal *is* its growth, read off the one
    // timeline value. Scale mode moves the two independently, so it keeps the
    // tweened proxy.
    const plate =
      previewMode === "morph"
        ? THREE.MathUtils.smoothstep(preview.morph, previewTuning.growStart, 1)
        : THREE.MathUtils.clamp(preview.plate, 0, 1);

    if (skullMesh?.morphTargetInfluences) {
      skullMesh.morphTargetInfluences[0] = preview.morph;
    }

    // The flattened skull only exists to carry the animation — once the
    // screenshot is up it would just sit behind it, showing through wherever
    // the plate bends away. Dissolve it as the exact inverse of the image's own
    // fade, so the two cross over and it comes back on the way out.
    if (skullMesh) {
      const glass = skullMesh.material as THREE.Material;
      const glassOpacity = 1 - plate;
      const fading = glassOpacity < 1 - 1e-3;

      // Only bucket it with the transparent objects while it is actually
      // fading; opaque is how it renders for the whole hero.
      if (glass.transparent !== fading) glass.transparent = fading;
      glass.opacity = glassOpacity;
      skullMesh.visible = glassOpacity > 1e-3;
    }

    // The refraction buffer costs a full second render of the scene. Once the
    // skull has scaled away into the details stage, or the screenshot has taken
    // its place, there is nothing left to refract.
    if (transmissionRef.current) {
      const current = transmissionRef.current.buffer;
      if (current && current !== BLANK_BUFFER) refractionBuffer.current = current;

      const worthRefracting =
        skullMesh?.visible !== false &&
        (transitionScaleGroupRef.current?.scale.x ?? 1) >
          CONFIG.model.TRANSMISSION_MIN_SCALE;

      transmissionRef.current.buffer = worthRefracting
        ? (refractionBuffer.current ?? undefined)
        : BLANK_BUFFER;
    }

    // The skull flattens at its own size, then swells into the screenshot's
    // footprint over the tail of the morph, so both land on the same rectangle.
    const plateGrowth = THREE.MathUtils.lerp(
      1,
      previewSizeMult,
      THREE.MathUtils.smoothstep(preview.morph, previewTuning.growStart, 1),
    );

    const orient = morphOrientRef.current;
    if (orient) {
      // Cancel out everything the skull is rotated by so the flattened plate
      // ends up square to the camera, blended in by the morph itself. The
      // chain is re-measured each frame, so the idle spin unwinds with it.
      if (preview.morph > 1e-4 && skullMesh) {
        const temp = orientTemp.current;
        skullMesh.getWorldQuaternion(temp.mesh);
        orient.getWorldQuaternion(temp.orient);
        temp.local.copy(temp.orient).invert().multiply(temp.mesh);
        orient.parent?.getWorldQuaternion(temp.parent);

        temp.target
          .copy(temp.parent)
          .invert()
          .multiply(PLATE_FACING)
          .multiply(temp.local.invert());

        orient.quaternion.slerpQuaternions(
          IDENTITY_QUATERNION,
          temp.target,
          preview.morph,
        );
      } else {
        orient.quaternion.identity();
      }

      orient.scale.setScalar(Math.max(preview.skull, 1e-4) * plateGrowth);
    }

    const previewGroup = previewGroupRef.current;
    if (previewGroup) {
      previewGroup.visible = plate > 1e-3;

      if (previewGroup.visible && skullMesh && previewGroup.parent) {
        const temp = orientTemp.current;
        const center = temp.plateCenter;

        if (previewMode === "morph") {
          // Ride the flattened geometry's own frame: the gap is measured along
          // the slab's local thickness axis and every transform between the
          // mesh and this group — the skull's rotation, the orient slerp, the
          // growth — arrives through the copy instead of being re-derived.
          center.set(
            flatTarget.centerX,
            flatTarget.centerY -
              CONFIG.projectPreview.SLAB_THICKNESS / 2 -
              CONFIG.projectPreview.IMAGE_GAP,
            flatTarget.centerZ,
          );
          skullMesh.localToWorld(center);
          previewGroup.parent.worldToLocal(center);

          skullMesh.getWorldQuaternion(temp.mesh);
          previewGroup.parent.getWorldQuaternion(temp.parent);
          previewGroup.quaternion
            .copy(temp.parent)
            .invert()
            .multiply(temp.mesh)
            .multiply(PLATE_IMAGE_FACING);

          skullMesh.getWorldScale(temp.meshScale);
          previewGroup.parent.getWorldScale(temp.parentScale);
          previewGroup.scale.setScalar(temp.meshScale.x / temp.parentScale.x);
        } else {
          center.set(
            flatTarget.centerX,
            flatTarget.centerY,
            flatTarget.centerZ,
          );
          skullMesh.localToWorld(center);
          previewGroup.parent.worldToLocal(center);
          center.z +=
            (CONFIG.projectPreview.SLAB_THICKNESS / 2 +
              CONFIG.projectPreview.IMAGE_GAP) *
            responsiveScale;

          previewGroup.quaternion.identity();
          previewGroup.scale.setScalar(
            responsiveScale * previewSizeMult * Math.max(plate, 1e-4),
          );
        }

        previewGroup.position.copy(center);
      }
    }
    if (previewMaterialRef.current) {
      previewMaterialRef.current.opacity = plate;
    }

    const pointer = pointerTracking.current;

    if (!pointer.seeded) {
      pointer.lastY = state.pointer.y;
      pointer.seeded = true;
    }

    const rawVelocity = (state.pointer.y - pointer.lastY) / Math.max(dt, 1e-4);
    pointer.lastY = state.pointer.y;
    // Chasing the raw reading rounds off the spikes on the way in and lets the
    // plate spring back on its own once the pointer stops.
    pointer.velocity = THREE.MathUtils.damp(
      pointer.velocity,
      rawVelocity,
      previewTuning.smoothing,
      dt,
    );

    const travel = prefersReducedMotion
      ? 0
      : THREE.MathUtils.clamp(
          pointer.velocity / previewTuning.fullScale,
          -1,
          1,
        ) * plate;

    // Negated: the centre lags behind, so it trails the pointer's direction.
    previewUniforms.uPreviewBend.value =
      -travel * previewTuning.bend * previewHeight;
    previewUniforms.uPreviewSplit.value = travel * previewTuning.aberration;
  });

  return (
    <group>
      <group position={[0, 0.1, CONFIG.model.DEPTH_Z]} ref={animGroupRef}>
        <mesh
          position={[0, 0, 0]}
          onPointerEnter={() => {
            if (isInteractionLockedRef.current) return;
            isHoveringCenter.current = true;
          }}
          onPointerLeave={() => {
            if (isInteractionLockedRef.current) return;
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
                if (isInteractionLockedRef.current) return;
                isHoveringModel.current = true;
                document.body.style.cursor = "grab";
              }}
              onPointerLeave={() => {
                if (isInteractionLockedRef.current) return;
                isHoveringModel.current = false;
                document.body.style.cursor = "auto";
              }}
              onPointerDown={(e) => {
                if (isInteractionLockedRef.current) return;
                isDragging.current = true;
                document.body.style.cursor = "grabbing";
                document.body.style.userSelect = "none";
                (e.target as Element).setPointerCapture(e.pointerId);
                e.stopPropagation();
              }}
              onPointerUp={(e) => {
                if (isInteractionLockedRef.current) return;
                isDragging.current = false;
                document.body.style.cursor = isHoveringModel.current
                  ? "grab"
                  : "auto";
                document.body.style.userSelect = "";
                (e.target as Element).releasePointerCapture(e.pointerId);
              }}
              onPointerCancel={(e) => {
                if (isMobile || isInteractionLockedRef.current) return;
                isDragging.current = false;
                document.body.style.cursor = "auto";
                document.body.style.userSelect = "";
                (e.target as Element).releasePointerCapture(e.pointerId);
              }}
            >
              <circleGeometry args={[grabAreaRadius, 32]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

            <group ref={morphOrientRef}>
              <group
                ref={skullRotationGroupRef}
                rotation={[skullRotation.x, skullRotation.y, skullRotation.z]}
              >
                <Center>
                  <Clone
                    ref={mesh}
                    object={nodes.Sphere}
                    scale={responsiveScale}
                  >
                    <MeshTransmissionMaterial
                      ref={transmissionRef}
                      {...materialProps}
                      resolution={
                        isMobile
                          ? CONFIG.model.TRANSMISSION_RESOLUTION_MOBILE
                          : CONFIG.model.TRANSMISSION_RESOLUTION
                      }
                      samples={
                        isMobile
                          ? CONFIG.model.TRANSMISSION_SAMPLES_MOBILE
                          : CONFIG.model.TRANSMISSION_SAMPLES
                      }
                    />
                  </Clone>
                </Center>
              </group>
            </group>

            {!isMobile && (
              <group ref={previewGroupRef} visible={false}>
                <ProjectPreviewPlane
                  texture={
                    shownPreview ? (previewTextures[shownPreview] ?? null) : null
                  }
                  width={previewWidth}
                  height={previewHeight}
                  materialRef={previewMaterialRef}
                />
              </group>
            )}
          </group>
        </group>
      </group>
    </group>
  );
}
