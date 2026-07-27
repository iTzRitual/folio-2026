"use client";

import {
    useEffect,
    useLayoutEffect,
    useMemo,
    useState,
    type RefObject,
} from "react";
import * as THREE from "three";
import { PROJECT_PREVIEW_SOURCES } from "@/data/content";
import { CONFIG } from "@/config/constants";

const ROUNDED_DEFS = /* glsl */ `
uniform vec2 uPreviewRadiusUv;
varying vec2 vPreviewUv;
`;

const ROUNDED_ALPHA = /* glsl */ `
{
  vec2 corner =
    max(abs(vPreviewUv - 0.5) - (0.5 - uPreviewRadiusUv), 0.0) / uPreviewRadiusUv;
  float dist = length(corner) - 1.0;
  float edge = clamp(fwidth(dist), 1e-5, 0.5);
  diffuseColor.a *= 1.0 - smoothstep(-edge, edge, dist);
}
#include <opaque_fragment>
`;

function roundedShader(radiusUv: { value: THREE.Vector2 }) {
    return (shader: THREE.WebGLProgramParametersWithUniforms) => {
        shader.uniforms.uPreviewRadiusUv = radiusUv;

        shader.vertexShader = `varying vec2 vPreviewUv;\n${shader.vertexShader}`.replace(
            "void main() {",
            "void main() {\n  vPreviewUv = uv;",
        );
        shader.fragmentShader = ROUNDED_DEFS + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace(
            "#include <opaque_fragment>",
            ROUNDED_ALPHA,
        );
    };
}

/**
 * Loads every project preview up front. The skull lives inside a Suspense
 * boundary, so suspending on a hover-time texture fetch would blank it out.
 */
export function useProjectPreviewTextures(enabled: boolean) {
    const [textures, setTextures] = useState<Record<string, THREE.Texture>>({});

    useEffect(() => {
        if (!enabled) return;

        const loader = new THREE.TextureLoader();
        const loaded: Record<string, THREE.Texture> = {};
        let cancelled = false;

        for (const src of PROJECT_PREVIEW_SOURCES) {
            loader.load(src, (texture) => {
                if (cancelled) {
                    texture.dispose();
                    return;
                }
                texture.colorSpace = THREE.SRGBColorSpace;
                loaded[src] = texture;
                setTextures({ ...loaded });
            });
        }

        return () => {
            cancelled = true;
            for (const texture of Object.values(loaded)) texture.dispose();
        };
    }, [enabled]);

    return textures;
}

interface ProjectPreviewPlaneProps {
    texture: THREE.Texture | null;
    width: number;
    height: number;
    materialRef: RefObject<THREE.MeshBasicMaterial | null>;
}

export function ProjectPreviewPlane({
    texture,
    width,
    height,
    materialRef,
}: ProjectPreviewPlaneProps) {
    const radiusUv = useMemo(() => ({ value: new THREE.Vector2(1, 1) }), []);
    const applyShader = useMemo(() => roundedShader(radiusUv), [radiusUv]);

    const radius = Math.min(
        height * CONFIG.projectPreview.CORNER_RADIUS_MULT,
        width / 2,
        height / 2,
    );

    useLayoutEffect(() => {
        radiusUv.value.set(
            Math.max(radius / width, 1e-4),
            Math.max(radius / height, 1e-4),
        );
    }, [radiusUv, radius, width, height]);

    // Swapping the map in and out of null changes the program.
    useLayoutEffect(() => {
        if (materialRef.current) materialRef.current.needsUpdate = true;
    }, [texture, materialRef]);

    return (
        <mesh visible={texture !== null}>
            <planeGeometry args={[width, height]} />
            <meshBasicMaterial
                ref={materialRef}
                map={texture}
                toneMapped={false}
                transparent
                opacity={0}
                depthWrite={false}
                onBeforeCompile={applyShader}
            />
        </mesh>
    );
}
