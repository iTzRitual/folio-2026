import { MeshTransmissionMaterial } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, type ComponentRef, type RefObject } from "react";
import { DataTexture, Material, Vector3, type BufferGeometry, type Mesh, type Plane, type Texture } from "three";
import { CONFIG } from "@/config/constants";
import { applySkullFragmentShader } from "@/lib/skullFragments";
import type { SkullSimulationUniforms } from "@/lib/skullParticles";
import { applySkullOrbitLighting, createSkullOrbitLightingUniforms } from "@/lib/skullOrbitLighting";
import { orbitCollisionTransform, type ProjectOrbitCollider } from "@/lib/projectOrbitCollision";
import { useOrbitSignal } from "@/context/OrbitSignalContext";

export function SkullGlass({
  geometry,
  lowQuality,
  clippingPlanes,
  fragments,
  orbitCollider,
}: {
  orbitCollider: RefObject<ProjectOrbitCollider>;
  geometry: BufferGeometry;
  lowQuality: boolean;
  clippingPlanes: Plane[];
  fragments?: SkullSimulationUniforms;
}) {
  const mesh = useRef<Mesh>(null);
  const { config } = useOrbitSignal();
  const orbitLighting = useRef(createSkullOrbitLightingUniforms());
  const material = useRef<ComponentRef<typeof MeshTransmissionMaterial>>(null);
  const refractionBuffer = useRef<Texture | null>(null);
  const scale = useMemo(() => new Vector3(), []);
  const blankBuffer = useMemo(() => {
    const texture = new DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    texture.needsUpdate = true;
    return texture;
  }, []);

  useEffect(() => () => blankBuffer.dispose(), [blankBuffer]);

  useLayoutEffect(() => {
    if (!(material.current instanceof Material)) return;
    const restoreFragments = fragments ? applySkullFragmentShader(material.current, fragments) : undefined;
    const restoreLighting = applySkullOrbitLighting(material.current, orbitLighting.current);
    return () => {
      restoreLighting();
      restoreFragments?.();
    };
  }, [fragments, lowQuality]);

  useFrame(({ camera }) => {
    if (!mesh.current || !material.current) return;
    const collider = orbitCollider.current;
    orbitLighting.current.skullOrbitHud.value = config.style === "cyberpunk" ? 1 : 0;
    orbitLighting.current.skullOrbitLight.value.set(0, config.illumination, config.occlusion, 0);
    if (collider.active && orbitCollisionTransform(mesh.current, collider, orbitLighting.current.skullOrbitFromLocal.value)) {
      orbitCollisionTransform(camera, collider, orbitLighting.current.skullOrbitFromView.value);
      orbitLighting.current.skullOrbitLight.value.x = collider.opacity ?? 1;
      orbitLighting.current.skullOrbitReveal.value = collider.reveal ?? 1;
      orbitLighting.current.skullOrbitPhase.value = collider.phase ?? 0;
      if (collider.shape) orbitLighting.current.skullOrbitShape.value.copy(collider.shape);
    }
    const current = material.current.buffer;
    if (current && current !== blankBuffer) refractionBuffer.current = current;
    mesh.current.getWorldScale(scale);
    let visible = scale.x > CONFIG.model.TRANSMISSION_MIN_SCALE;
    mesh.current.traverseAncestors((parent) => { visible = visible && parent.visible; });
    material.current.buffer = visible
      ? (refractionBuffer.current ?? undefined)
      : blankBuffer;
  });

  return (
    <mesh ref={mesh} geometry={geometry} frustumCulled={!fragments} raycast={() => null}>
      <MeshTransmissionMaterial
        ref={material}
        {...CONFIG.model.GLASS}
        clippingPlanes={clippingPlanes}
        resolution={lowQuality ? CONFIG.model.TRANSMISSION_RESOLUTION_MOBILE : CONFIG.model.TRANSMISSION_RESOLUTION}
        samples={lowQuality ? CONFIG.model.TRANSMISSION_SAMPLES_MOBILE : CONFIG.model.TRANSMISSION_SAMPLES}
      />
    </mesh>
  );
}
