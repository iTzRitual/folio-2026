import {
  Clone,
  useGLTF,
  MeshTransmissionMaterial,
  Center,
} from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { useControls } from "leva";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { useHeroLayout } from "@/context/HeroLayoutContext";
import { useAnimationContext } from "@/context/AnimationContext";

export default function Model() {
  const animGroupRef = useRef<THREE.Group>(null);
  const interactiveGroupRef = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Group>(null);
  const { nodes } = useGLTF("/glbs/czaszka2draco.glb");

  const {
    grabAreaRadius: baseGrabAreaRadius,
    stickyAreaRadius: baseStickyAreaRadius,
    responsiveScale: baseResponsiveScale,
  } = useHeroLayout();
  const { startTrigger } = useAnimationContext();

  const pos = useRef(new THREE.Vector3(0, 0, 0));
  const vel = useRef(new THREE.Vector3(0, 0, 0));
  const isDragging = useRef(false);

  const isHoveringCenter = useRef(false);
  const isHoveringModel = useRef(false);

  const lastInteractionTime = useRef(0);

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
    const dt = Math.min(delta, 0.1);

    const currentViewport = state.viewport.getCurrentViewport(
      state.camera,
      animGroupRef.current?.position || new THREE.Vector3(0, 0.1, 2),
    );

    const cursorX = (state.pointer.x * currentViewport.width) / 2;
    const cursorY = (state.pointer.y * currentViewport.height) / 2 - 0.1;

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
      const limitTop = currentViewport.height / 2 - 0.1 - collisionRadius;
      const limitBottom = -currentViewport.height / 2 - 0.1 + collisionRadius;
      const bounceForce = -0.85;

      if (pos.current.x > limitX) {
        pos.current.x = limitX;
        vel.current.x *= bounceForce;
      }
      if (pos.current.x < -limitX) {
        pos.current.x = -limitX;
        vel.current.x *= bounceForce;
      }
      if (pos.current.y > limitTop) {
        pos.current.y = limitTop;
        vel.current.y *= bounceForce;
      }
      if (pos.current.y < limitBottom) {
        pos.current.y = limitBottom;
        vel.current.y *= bounceForce;
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
            isHoveringCenter.current = true;
          }}
          onPointerLeave={() => {
            isHoveringCenter.current = false;
          }}
        >
          <circleGeometry args={[stickyAreaRadius, 32]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>

        <group ref={interactiveGroupRef}>
          <mesh
            position={[0, 0, 0.01]}
            onPointerEnter={() => {
              isHoveringModel.current = true;
              document.body.style.cursor = "grab";
            }}
            onPointerLeave={() => {
              isHoveringModel.current = false;
              if (!isDragging.current) document.body.style.cursor = "auto";
            }}
            onPointerDown={(e) => {
              isDragging.current = true;
              document.body.style.cursor = "grabbing";
              (e.target as Element).setPointerCapture(e.pointerId);
              e.stopPropagation();
            }}
            onPointerUp={(e) => {
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

          <group rotation={[skullRotation.x, skullRotation.y, skullRotation.z]}>
            <Center>
              <Clone ref={mesh} object={nodes.Sphere} scale={responsiveScale}>
                <MeshTransmissionMaterial {...materialProps} />
              </Clone>
            </Center>
          </group>
        </group>
      </group>
    </group>
  );
}
