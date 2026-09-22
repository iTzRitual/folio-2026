import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { DoubleSide, Group, MathUtils, ShaderMaterial, SRGBColorSpace, Vector2, Vector3 } from "three";
import { CONFIG } from "@/config/constants";
import { projectsData } from "@/data/content";
import { useHeroLayout } from "@/context/HeroLayoutContext";
import { useHeroTransition } from "@/context/HeroTransitionContext";
import { useAnimationContext } from "@/context/AnimationContext";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { createProjectOrbitGeometry, projectOrbitFragmentShader, projectOrbitVertexShader } from "@/lib/projectOrbit";
import { caseStudyStage } from "@/lib/caseStudyStage";
import type { ProjectOrbitCollider } from "@/lib/projectOrbitCollision";

const C = CONFIG.projectOrbit;
const preview = projectsData.find((project) => project.slug === "controller-configurator")!.preview;

export function ProjectOrbit({ colliderRef }: { colliderRef: RefObject<ProjectOrbitCollider> }) {
  const texture = useTexture(preview, (loaded) => {
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
  const worldScale = useMemo(() => new Vector3(), []);
  const radius = responsiveScale * C.RADIUS_MULT;
  const geometry = useMemo(() => createProjectOrbitGeometry(radius), [radius]);
  const material = useMemo(() => {
    const image = texture.image as { width: number; height: number };
    const aspect = image.width / image.height;
    return new ShaderMaterial({
      vertexShader: projectOrbitVertexShader,
      fragmentShader: projectOrbitFragmentShader,
      uniforms: {
        uMap: { value: texture },
        uCover: { value: new Vector2(Math.min(1, CONFIG.projectPreview.ASPECT / aspect), Math.min(1, aspect / CONFIG.projectPreview.ASPECT)) },
        uAspect: { value: CONFIG.projectPreview.ASPECT },
        uRadius: { value: C.CORNER_RADIUS },
        uBorder: { value: C.BORDER_WIDTH },
        uOpacity: { value: 0 },
        uOrbitCenter: { value: new Vector3() },
        uOrbitRadius: { value: 1 },
        uFarBrightness: { value: C.FAR_BRIGHTNESS },
      },
      side: DoubleSide,
      transparent: true,
      depthWrite: true,
      toneMapped: false,
    });
  }, [texture]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => { colliderRef.current.object = null; colliderRef.current.active = false; }, [colliderRef]);

  useFrame((_, delta) => {
    const currentMaterial = materialRef.current;
    if (!currentMaterial) return;
    const dt = Math.min(delta, 1 / 30);
    const exit = MathUtils.smoothstep(progressRef.current, 0, C.EXIT_END);
    const present = startTrigger && revealProgressRef.current === 0 && !caseStudyStage.open;
    currentMaterial.uniforms.uOpacity.value = MathUtils.damp(currentMaterial.uniforms.uOpacity.value, present ? 1 - exit : 0, C.RESPONSE, dt);
    if (group.current) {
      group.current.visible = currentMaterial.uniforms.uOpacity.value > 0.001 && exit < 1;
      group.current.getWorldPosition(currentMaterial.uniforms.uOrbitCenter.value);
      group.current.getWorldScale(worldScale);
      currentMaterial.uniforms.uOrbitRadius.value = radius * worldScale.x;
    }
    if (rotation.current && present && exit < 1 && !reducedMotion && !document.hidden) {
      rotation.current.rotation.y = (rotation.current.rotation.y + dt * C.SPEED) % (Math.PI * 2);
    }
    colliderRef.current.object = rotation.current;
    colliderRef.current.radius = radius;
    colliderRef.current.active = present && exit < 1 && currentMaterial.uniforms.uOpacity.value > 0.01;
  }, -2);

  return (
    <group ref={group} rotation={[C.TILT_X, 0, C.TILT_Z]}>
      <group ref={rotation}>
        {Array.from({ length: C.COUNT }, (_, index) => {
          const angle = index / C.COUNT * Math.PI * 2;
          return (
            <mesh
              key={index}
              geometry={geometry}
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
