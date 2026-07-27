import {
  Clone,
  useGLTF,
  MeshTransmissionMaterial,
  Center,
} from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { useControls } from "leva";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { useHeroLayout } from "@/context/HeroLayoutContext";
import { useAnimationContext } from "@/context/AnimationContext";
import { useHeroTransition } from "@/context/HeroTransitionContext";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { CONFIG } from "../config/constants";

export default function Model({ isMobile, isDebug = false }: { isMobile?: boolean, isDebug?: boolean }) {
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
  const previousAnchorStage = useRef(0);
  const lookPointer = useRef(new THREE.Vector2(0, 0));

  const { viewport } = useThree();

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

  const materialProps = isDebug ? levaMaterialProps : {
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

  const levaSkullRotation = useControls("Skull Rotation", {
    x: { value: -1.3, min: -Math.PI, max: Math.PI, step: 0.05 },
    y: { value: -3.13, min: -Math.PI, max: Math.PI, step: 0.05 },
    z: { value: 0.85, min: -Math.PI, max: Math.PI, step: 0.05 },
  });

  const skullRotation = isDebug ? levaSkullRotation : {
    x: -1.3,
    y: -3.13,
    z: 0.85,
  };

  useFrame((state, delta) => {
    const scrollProgress = THREE.MathUtils.clamp(progressRef.current, 0, 1);
    const shouldLockInteraction =
      scrollProgress > CONFIG.model.INTERACTION_LOCK_EPSILON;
    const inDetails = scrollProgress >= CONFIG.model.DETAILS_POPUP_START;

    const stage = inDetails ? 1 + modelAnchorRef.current.stage : 0;
    const teleported = !isMobile && stage !== previousAnchorStage.current;
    previousAnchorStage.current = stage;
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

      if (pos.current.lengthSq() < 0.0025) {
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
        const targetScale = inDetails
          ? modelAnchorRef.current.scale
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

    if (mesh.current) {
      const t = state.clock.getElapsedTime();
      const look = modelAnchorRef.current.lookWeight;

      lookPointer.current.x = THREE.MathUtils.damp(
        lookPointer.current.x,
        state.pointer.x,
        CONFIG.model.LOOK_POINTER_SMOOTHNESS,
        dt,
      );
      lookPointer.current.y = THREE.MathUtils.damp(
        lookPointer.current.y,
        state.pointer.y,
        CONFIG.model.LOOK_POINTER_SMOOTHNESS,
        dt,
      );

      const idleX = prefersReducedMotion
        ? 0
        : Math.sin(t * CONFIG.model.IDLE_ROTATION_SPEED) *
          CONFIG.model.IDLE_ROTATION_SPEED_X_MAG;
      const idleY = prefersReducedMotion
        ? 0
        : Math.cos(t * CONFIG.model.IDLE_ROTATION_SPEED) *
          CONFIG.model.IDLE_ROTATION_SPEED_Y_MAG;

      mesh.current.rotation.x = THREE.MathUtils.lerp(
        idleX,
        -lookPointer.current.y * CONFIG.model.LOOK_RANGE_X,
        look,
      );
      mesh.current.rotation.y = THREE.MathUtils.lerp(
        idleY,
        lookPointer.current.x * CONFIG.model.LOOK_RANGE_Y,
        look,
      );

      if (!prefersReducedMotion) {
        const spun =
          mesh.current.rotation.z +
          dt * CONFIG.model.IDLE_ROTATION_SPEED_Z * (1 - look);
        const turn = Math.PI * 2;
        mesh.current.rotation.z =
          (((spun + Math.PI) % turn) + turn) % turn - Math.PI;
      }

      mesh.current.rotation.z = THREE.MathUtils.damp(
        mesh.current.rotation.z,
        0,
        CONFIG.model.LOOK_SETTLE_SMOOTHNESS * look,
        dt,
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

            <group
              rotation={[skullRotation.x, skullRotation.y, skullRotation.z]}
            >
              <Center>
                <Clone ref={mesh} object={nodes.Sphere} scale={responsiveScale}>
                  <MeshTransmissionMaterial
                    {...materialProps}
                    resolution={256}
                    samples={4}
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
