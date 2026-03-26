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

const CONFIG = {
  BASE_MODEL_Y: 0.1,
  INTERACTION_LOCK_EPSILON: 0.001,
  MODEL_UP_TRAVEL_FACTOR: 0.25,
  SCALE_OUT_START: 0.2,
  SCALE_OUT_END: 0.9,
  RETURN_TO_CENTER_SMOOTHNESS: 8,
  RETURN_VELOCITY_DAMPING: 10,
  RETURN_SNAP_EPSILON: 0.002,
  DETAILS_POPUP_START: 0.9,
  DETAILS_POPUP_END: 1.0,
  DETAILS_POPUP_SCALE: 0.6,
  DETAILS_POPUP_X_FACTOR: 0.13,
  DETAILS_POPUP_Y_SECTION_OFFSET: 1.1,
};

export default function Model({ isMobile }: { isMobile?: boolean }) {
  const animGroupRef = useRef<THREE.Group>(null);
  const transitionScaleGroupRef = useRef<THREE.Group>(null);
  const interactiveGroupRef = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Group>(null);
  const { nodes } = useGLTF("/glbs/czaszka2draco.glb");

  const {
    marginY,
    grabAreaRadius: baseGrabAreaRadius,
    stickyAreaRadius: baseStickyAreaRadius,
    responsiveScale: baseResponsiveScale,
  } = useHeroLayout();
  const { startTrigger } = useAnimationContext();
  const { progressRef } = useHeroTransition();

  const pos = useRef(new THREE.Vector3(0, 0, 0));
  const vel = useRef(new THREE.Vector3(0, 0, 0));
  const isDragging = useRef(false);
  const isInteractionLockedRef = useRef(false);

  const isHoveringCenter = useRef(false);
  const isHoveringModel = useRef(false);

  const lastInteractionTime = useRef(0);

  const { viewport } = useThree();

  useGSAP(() => {
    if (!animGroupRef.current) return;

    if (!startTrigger) {
      animGroupRef.current.scale.set(0, 0, 0);
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
  }, [startTrigger]);

  const materialProps = useControls({
    thickness: { value: 0.65, min: 0, max: 5, step: 0.05 },
    roughness: { value: 0.2, min: 0, max: 1, step: 0.1 },
    transmission: { value: 0.9, min: 0, max: 1, step: 0.1 },
    ior: { value: 0.9, min: 0, max: 3, step: 0.1 },
    chromaticAberration: { value: 1.0, min: 0, max: 1, step: 0.01 },
    backside: { value: false },
    scale: { value: 0.8, min: 0, max: 3, step: 0.05 },
  });

  const responsiveScale = baseResponsiveScale * materialProps.scale;
  const grabAreaRadius = baseGrabAreaRadius * materialProps.scale;
  const stickyAreaRadius = baseStickyAreaRadius * materialProps.scale;

  const skullRotation = useControls("Skull Rotation", {
    x: { value: -1.3, min: -Math.PI, max: Math.PI, step: 0.05 },
    y: { value: -3.13, min: -Math.PI, max: Math.PI, step: 0.05 },
    z: { value: 0.85, min: -Math.PI, max: Math.PI, step: 0.05 },
  });

  useFrame((state, delta) => {
    const scrollProgress = THREE.MathUtils.clamp(progressRef.current, 0, 1);
    const shouldLockInteraction =
      scrollProgress > CONFIG.INTERACTION_LOCK_EPSILON;
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
        CONFIG.RETURN_TO_CENTER_SMOOTHNESS,
        dt,
      );
      pos.current.y = THREE.MathUtils.damp(
        pos.current.y,
        0,
        CONFIG.RETURN_TO_CENTER_SMOOTHNESS,
        dt,
      );

      const velocityDamping = Math.exp(-CONFIG.RETURN_VELOCITY_DAMPING * dt);
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
          CONFIG.BASE_MODEL_Y +
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
        const popupProgress = THREE.MathUtils.clamp(
          (scrollProgress - CONFIG.DETAILS_POPUP_START) /
            (CONFIG.DETAILS_POPUP_END - CONFIG.DETAILS_POPUP_START),
          0,
          1,
        );

        const heroYAtPopupStart =
          CONFIG.BASE_MODEL_Y +
          CONFIG.DETAILS_POPUP_START *
            viewport.height *
            CONFIG.MODEL_UP_TRAVEL_FACTOR;
        const heroYCurrent =
          CONFIG.BASE_MODEL_Y +
          scrollProgress * viewport.height * CONFIG.MODEL_UP_TRAVEL_FACTOR;
        const targetBaseY = -viewport.height * 0.25;
        const sectionTop = viewport.height / 2 - marginY * 0.35;
        const sectionSpacing = viewport.height * 0.25;
        const detailsTargetY =
          targetBaseY +
          sectionTop -
          sectionSpacing * CONFIG.DETAILS_POPUP_Y_SECTION_OFFSET;
        const detailsTargetX = viewport.width * CONFIG.DETAILS_POPUP_X_FACTOR;

        const targetX = THREE.MathUtils.lerp(0, detailsTargetX, popupProgress);
        const targetY =
          scrollProgress < CONFIG.DETAILS_POPUP_START
            ? heroYCurrent
            : THREE.MathUtils.lerp(
                heroYAtPopupStart,
                detailsTargetY,
                popupProgress,
              );

        animGroupRef.current.position.x = THREE.MathUtils.damp(
          animGroupRef.current.position.x,
          targetX,
          10,
          dt,
        );
        animGroupRef.current.position.y = THREE.MathUtils.damp(
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
          (scrollProgress - CONFIG.SCALE_OUT_START) /
            (CONFIG.SCALE_OUT_END - CONFIG.SCALE_OUT_START),
          0,
          1,
        );
        const popupProgress = THREE.MathUtils.clamp(
          (scrollProgress - CONFIG.DETAILS_POPUP_START) /
            (CONFIG.DETAILS_POPUP_END - CONFIG.DETAILS_POPUP_START),
          0,
          1,
        );

        const scaleOutValue = 1 - scaleOutProgress;
        const targetScale = THREE.MathUtils.lerp(
          scaleOutValue,
          CONFIG.DETAILS_POPUP_SCALE,
          popupProgress,
        );

        const currentScale = transitionScaleGroupRef.current.scale.x;
        const smoothScale = THREE.MathUtils.damp(
          currentScale,
          targetScale,
          10,
          dt,
        );
        transitionScaleGroupRef.current.scale.setScalar(smoothScale);
      }
    }

    const outerGroupY = animGroupRef.current?.position.y ?? CONFIG.BASE_MODEL_Y;

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

          if (isHoveringCenter.current) {
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
      mesh.current.rotation.z += dt * 1.2;
      mesh.current.rotation.x = Math.sin(t * 2) * 0.2;
      mesh.current.rotation.y = Math.cos(t * 2) * 0.1;
    }
  });

  return (
    <group>
      <group position={[0, 0.1, 2]} ref={animGroupRef}>
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
                (e.target as Element).setPointerCapture(e.pointerId);
                e.stopPropagation();
              }}
              onPointerUp={(e) => {
                if (isInteractionLockedRef.current) return;
                isDragging.current = false;
                document.body.style.cursor = isHoveringModel.current
                  ? "grab"
                  : "auto";
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
                  <MeshTransmissionMaterial {...materialProps} />
                </Clone>
              </Center>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}
