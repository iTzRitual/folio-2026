import {
  Clone,
  useGLTF,
  MeshTransmissionMaterial,
  Center,
} from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useControls } from "leva";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { useHeroLayout } from "@/context/HeroLayoutContext";
import { useAnimationContext } from "@/context/AnimationContext";
import { useHeroTransition } from "@/context/HeroTransitionContext";
import { useProjectHover } from "@/context/ProjectHoverContext";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { attachFlatMorphTarget, buildFlatMorphTarget } from "@/lib/skullMorph";
import {
  ProjectPreviewPlane,
  useProjectPreviewTextures,
} from "./DetailsScene/ProjectPreviewPlane";
import { CONFIG } from "../config/constants";

// The GLB is Blender-oriented, so the flattened plate lies in the mesh's local
// XZ plane. Facing it at the camera means mapping local +Z to world up, which
// is exactly the -90° X rotation the glTF node carries.
const PLATE_FACING = new THREE.Quaternion().setFromEuler(
  new THREE.Euler(-Math.PI / 2, 0, 0),
);
const IDENTITY_QUATERNION = new THREE.Quaternion();

export default function Model({
  isMobile,
  isDebug = false,
}: {
  isMobile?: boolean;
  isDebug?: boolean;
}) {
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

  // Details — and with it the project hover — is desktop only.
  const previewTextures = useProjectPreviewTextures(!isMobile);
  const { hoveredPreview } = useProjectHover();
  // Keep the last hovered preview around so the plate can animate back out
  // with the right screenshot still on it.
  const [shownPreview, setShownPreview] = useState<string | null>(null);
  if (hoveredPreview && hoveredPreview !== shownPreview) {
    setShownPreview(hoveredPreview);
  }

  const levaPreview = useControls("Project preview", {
    mode: {
      value: CONFIG.projectPreview.MODE,
      options: ["morph", "scale"] as const,
    },
    sizeMult: {
      value: CONFIG.projectPreview.SIZE_MULT,
      min: 0.5,
      max: 2.5,
      step: 0.05,
    },
  });
  const previewMode = isDebug ? levaPreview.mode : CONFIG.projectPreview.MODE;
  const previewSizeMult = isDebug
    ? levaPreview.sizeMult
    : CONFIG.projectPreview.SIZE_MULT;

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

  // 0 = skull, 1 = fully revealed preview. `skull` only moves in "scale" mode.
  const previewProxy = useRef({ morph: 0, plate: 0, skull: 1 });
  const orientTemp = useRef({
    parent: new THREE.Quaternion(),
    orient: new THREE.Quaternion(),
    mesh: new THREE.Quaternion(),
    local: new THREE.Quaternion(),
    target: new THREE.Quaternion(),
    plateCenter: new THREE.Vector3(),
  });

  useGSAP(
    () => {
      const proxy = previewProxy.current;
      const active = hoveredPreview !== null;
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
        const duration = active ? cfg.MORPH_IN_DURATION : cfg.MORPH_OUT_DURATION;

        gsap.to(proxy, {
          morph: active ? 1 : 0,
          duration,
          ease: active ? "power3.inOut" : "power2.inOut",
        });
        // The screenshot only resolves once the plate has mostly formed.
        gsap.to(proxy, {
          plate: active ? 1 : 0,
          duration: duration * (1 - cfg.MORPH_IMAGE_FADE_START),
          delay: active ? duration * cfg.MORPH_IMAGE_FADE_START : 0,
          ease: "power2.out",
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
    { dependencies: [hoveredPreview, previewMode, prefersReducedMotion] },
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

  const levaMaterialProps = useControls({
    thickness: { value: 0.65, min: 0, max: 5, step: 0.05 },
    roughness: { value: 0.2, min: 0, max: 1, step: 0.1 },
    transmission: { value: 0.97, min: 0, max: 1, step: 0.01 },
    ior: { value: 0.9, min: 0, max: 3, step: 0.1 },
    chromaticAberration: { value: 1.0, min: 0, max: 1, step: 0.01 },
    backside: { value: false },
    scale: { value: 0.8, min: 0, max: 3, step: 0.05 },
  });

  const materialProps = isDebug
    ? levaMaterialProps
    : {
        thickness: 0.65,
        roughness: 0.2,
        transmission: 0.97,
        ior: 0.9,
        chromaticAberration: 1.0,
        backside: false,
        scale: 0.8,
      };

  const responsiveScale = baseResponsiveScale * materialProps.scale;
  const grabAreaRadius = baseGrabAreaRadius * materialProps.scale;
  const stickyAreaRadius = baseStickyAreaRadius * materialProps.scale;

  const previewWidth = flatTarget.rectWidth * responsiveScale * previewSizeMult;
  const previewHeight =
    flatTarget.rectHeight * responsiveScale * previewSizeMult;

  const levaSkullRotation = useControls("Skull Rotation", {
    x: { value: -1.3, min: -Math.PI, max: Math.PI, step: 0.05 },
    y: { value: -3.13, min: -Math.PI, max: Math.PI, step: 0.05 },
    z: { value: 0.85, min: -Math.PI, max: Math.PI, step: 0.05 },
  });

  const skullRotation = isDebug
    ? levaSkullRotation
    : {
        x: -1.3,
        y: -3.13,
        z: 0.85,
      };

  useFrame((state, delta) => {
    const scrollProgress = THREE.MathUtils.clamp(progressRef.current, 0, 1);
    const shouldLockInteraction =
      scrollProgress > CONFIG.model.INTERACTION_LOCK_EPSILON;
    const inDetails = scrollProgress >= CONFIG.model.DETAILS_POPUP_START;

    const stage = inDetails ? 1 : 0;
    const teleported = !isMobile && stage !== previousStage.current;
    previousStage.current = stage;
    const dt = Math.min(delta, 1 / 30);

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

        const scrolledScreens = window.scrollY / window.innerHeight;
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
          window.scrollY / (window.innerHeight * 0.8),
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

    const preview = previewProxy.current;
    const skullMesh = skullMeshRef.current;

    if (skullMesh?.morphTargetInfluences) {
      skullMesh.morphTargetInfluences[0] = preview.morph;
    }

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

      orient.scale.setScalar(Math.max(preview.skull, 1e-4));
    }

    const previewGroup = previewGroupRef.current;
    if (previewGroup) {
      previewGroup.visible = preview.plate > 1e-3;
      previewGroup.scale.setScalar(
        previewMode === "scale" ? Math.max(preview.plate, 1e-4) : 1,
      );

      // Track where the plate actually lands rather than assuming the model
      // sits centred on the group's origin.
      if (previewGroup.visible && skullMesh && previewGroup.parent) {
        const center = orientTemp.current.plateCenter;
        center.set(flatTarget.centerX, flatTarget.centerY, flatTarget.centerZ);
        skullMesh.localToWorld(center);
        previewGroup.parent.worldToLocal(center);
        center.z +=
          (CONFIG.projectPreview.SLAB_THICKNESS / 2 +
            CONFIG.projectPreview.IMAGE_GAP) *
          responsiveScale;
        previewGroup.position.copy(center);
      }
    }
    if (previewMaterialRef.current) {
      previewMaterialRef.current.opacity = THREE.MathUtils.clamp(
        preview.plate,
        0,
        1,
      );
    }
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
                      {...materialProps}
                      resolution={256}
                      samples={4}
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
