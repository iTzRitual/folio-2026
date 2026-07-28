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

/**
 * Written every frame from the pointer's vertical speed. Module scope because
 * there is exactly one preview plate, matching how the details curl shares its
 * uniforms.
 */
export const previewUniforms = {
    /** Signed lag of the plate's centre, in local units. */
    uPreviewBend: { value: 0 },
    /** Signed per-channel UV split. */
    uPreviewSplit: { value: 0 },
};

const VERTEX_DEFS = /* glsl */ `
uniform float uPreviewBend;
varying vec2 vPreviewUv;
`;

// The left and right edges lead and the middle trails, so the plate bows
// against the pointer instead of sliding rigidly.
const VERTEX_BEND = /* glsl */ `
#include <begin_vertex>
transformed.y += uPreviewBend * sin(uv.x * 3.141592653589793);
`;

const FRAGMENT_DEFS = /* glsl */ `
uniform vec2 uPreviewRadiusUv;
uniform float uPreviewSplit;
varying vec2 vPreviewUv;
`;

// Smearing the channels along the direction of travel, strongest where the
// plate is bending hardest.
const FRAGMENT_MAP = /* glsl */ `
#ifdef USE_MAP
{
  float split = uPreviewSplit * sin(vPreviewUv.x * 3.141592653589793);
  vec2 offset = vec2(0.0, split);
  vec4 centerSample = texture2D(map, vMapUv);
  diffuseColor *= vec4(
    texture2D(map, vMapUv + offset).r,
    centerSample.g,
    texture2D(map, vMapUv - offset).b,
    centerSample.a
  );
}
#endif
`;

const FRAGMENT_ALPHA = /* glsl */ `
{
  vec2 corner =
    max(abs(vPreviewUv - 0.5) - (0.5 - uPreviewRadiusUv), 0.0) / uPreviewRadiusUv;
  float dist = length(corner) - 1.0;
  float edge = clamp(fwidth(dist), 1e-5, 0.5);
  diffuseColor.a *= 1.0 - smoothstep(-edge, edge, dist);
}
#include <opaque_fragment>
`;

function previewShader(radiusUv: { value: THREE.Vector2 }) {
    return (shader: THREE.WebGLProgramParametersWithUniforms) => {
        shader.uniforms.uPreviewRadiusUv = radiusUv;
        shader.uniforms.uPreviewBend = previewUniforms.uPreviewBend;
        shader.uniforms.uPreviewSplit = previewUniforms.uPreviewSplit;

        shader.vertexShader = VERTEX_DEFS + shader.vertexShader;
        shader.vertexShader = shader.vertexShader
            .replace("void main() {", "void main() {\n  vPreviewUv = uv;")
            .replace("#include <begin_vertex>", VERTEX_BEND);

        shader.fragmentShader = FRAGMENT_DEFS + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader
            .replace("#include <map_fragment>", FRAGMENT_MAP)
            .replace("#include <opaque_fragment>", FRAGMENT_ALPHA);
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
    const applyShader = useMemo(() => previewShader(radiusUv), [radiusUv]);

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
            <planeGeometry
                args={[
                    width,
                    height,
                    CONFIG.projectPreview.BEND_SEGMENTS,
                    1,
                ]}
            />
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
