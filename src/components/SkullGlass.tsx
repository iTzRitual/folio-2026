import { MeshTransmissionMaterial } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, type ComponentRef } from "react";
import { DataTexture, Material, Vector3, type BufferGeometry, type Mesh, type Plane, type Texture } from "three";
import { CONFIG } from "@/config/constants";
import { applySkullFragmentShader } from "@/lib/skullFragments";
import type { SkullSimulationUniforms } from "@/lib/skullParticles";

export function SkullGlass({
  geometry,
  lowQuality,
  clippingPlanes,
  fragments,
}: {
  geometry: BufferGeometry;
  lowQuality: boolean;
  clippingPlanes: Plane[];
  fragments?: SkullSimulationUniforms;
}) {
  const mesh = useRef<Mesh>(null);
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
    if (!(material.current instanceof Material) || !fragments) return;
    return applySkullFragmentShader(material.current, fragments);
  }, [fragments, lowQuality]);

  useFrame(() => {
    if (!mesh.current || !material.current) return;
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
