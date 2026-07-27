"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { useTexture } from "@react-three/drei";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
    SRGBColorSpace,
    Vector2,
    type Group,
    type MeshBasicMaterial,
    type WebGLProgramParametersWithUniforms,
} from "three";
import { CONFIG, THEME } from "@/config/constants";
import { applyCurlShader } from "@/lib/detailsCurl";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useCurlFade } from "./useCurlFade";

const BLOCK_VARYING = /* glsl */ `
varying vec2 vBlockUv;
`;

const BLOCK_DEFS = /* glsl */ `
uniform vec2 uBlockRadiusUv;
varying vec2 vBlockUv;
`;

const BLOCK_ALPHA = /* glsl */ `
{
  vec2 blockCorner =
    max(abs(vBlockUv - 0.5) - (0.5 - uBlockRadiusUv), 0.0) / uBlockRadiusUv;
  float blockDist = length(blockCorner) - 1.0;
  float blockEdge = max(fwidth(blockDist), 1e-5);
  diffuseColor.a *= 1.0 - smoothstep(-blockEdge, blockEdge, blockDist);
}
#include <opaque_fragment>
`;

interface AnimatedRevealImageProps {
    src: string;
    width: number;
    height: number;
    position: [number, number, number];
    lines?: number;
    cornerRadius?: number;
    delay?: number;
    stagger?: number;
    duration?: number;
    blockColor?: string;
    startTrigger: boolean;
}

export function AnimatedRevealImage({
    src,
    width,
    height,
    position,
    lines = CONFIG.detailsLayout.BIO_REVEAL_LINES,
    cornerRadius = 0,
    delay = 0,
    stagger = CONFIG.copy.STAGGER,
    duration = CONFIG.copy.DURATION,
    blockColor = THEME.stacked,
    startTrigger,
}: AnimatedRevealImageProps) {
    const texture = useTexture(src);
    const prefersReducedMotion = usePrefersReducedMotion();

    const imageMaterialRef = useRef<MeshBasicMaterial>(null);
    const blockGroupRefs = useRef<(Group | null)[]>([]);
    const blockMaterialRefs = useRef<(MeshBasicMaterial | null)[]>([]);
    const blockRadiusUv = useRef({ value: new Vector2(1, 1) });

    const lineHeight = height / lines;
    const blockHeight = lineHeight * CONFIG.detailsLayout.BIO_REVEAL_BLOCK_OVERHANG;
    const radius = Math.min(cornerRadius, width / 2, blockHeight / 2);
    const blockWidth = width + radius * 2;

    useLayoutEffect(() => {
        blockRadiusUv.current.value.set(
            Math.max(radius / blockWidth, 1e-4),
            Math.max(radius / blockHeight, 1e-4),
        );
    }, [radius, blockWidth, blockHeight]);

    const applyBlockShader = useCallback(
        (shader: WebGLProgramParametersWithUniforms) => {
            applyCurlShader(shader);

            shader.uniforms.uBlockRadiusUv = blockRadiusUv.current;

            shader.vertexShader = BLOCK_VARYING + shader.vertexShader;
            shader.vertexShader = shader.vertexShader.replace(
                "void main() {",
                "void main() {\n  vBlockUv = uv;",
            );

            shader.fragmentShader = BLOCK_DEFS + shader.fragmentShader;
            shader.fragmentShader = shader.fragmentShader.replace(
                "#include <opaque_fragment>",
                BLOCK_ALPHA,
            );
        },
        [],
    );

    const { groupRef, revealedRef } = useCurlFade((opacity) => {
        if (imageMaterialRef.current) imageMaterialRef.current.opacity = opacity;

        for (const material of blockMaterialRefs.current) {
            if (material) material.opacity = opacity;
        }
    });

    useEffect(() => {
        revealedRef.current = true;
    }, [revealedRef]);

    useGSAP(
        () => {
            const groups = blockGroupRefs.current.filter(
                (group): group is Group => group !== null,
            );
            if (groups.length === 0) return;

            gsap.set(
                groups.map((group) => group.scale),
                { x: 1 },
            );

            if (!startTrigger) return;

            if (prefersReducedMotion) {
                const call = gsap.delayedCall(delay, () => {
                    for (const group of groups) group.scale.x = 0;
                });

                return () => call.kill();
            }

            const tweens = groups.map((group, index) =>
                gsap.to(group.scale, {
                    x: 0,
                    duration,
                    delay: delay + index * stagger,
                    ease: "power4.inOut",
                }),
            );

            return () => tweens.forEach((tween) => tween.kill());
        },
        {
            dependencies: [
                startTrigger,
                delay,
                stagger,
                duration,
                lines,
                prefersReducedMotion,
            ],
        },
    );

    const lineSegments = Math.max(
        1,
        Math.round(CONFIG.detailsCurl.IMAGE_SEGMENTS / lines),
    );

    return (
        <group ref={groupRef} position={position}>
            <mesh position={[width / 2, -height / 2, 0]}>
                <planeGeometry
                    args={[
                        width,
                        height,
                        1,
                        CONFIG.detailsCurl.IMAGE_SEGMENTS,
                    ]}
                />
                <meshBasicMaterial
                    ref={imageMaterialRef}
                    map={texture}
                    map-colorSpace={SRGBColorSpace}
                    toneMapped={false}
                    transparent
                    opacity={0}
                    onBeforeCompile={applyCurlShader}
                />
            </mesh>

            {Array.from({ length: lines }, (_, index) => (
                <group
                    key={index}
                    ref={(group) => {
                        blockGroupRefs.current[index] = group;
                    }}
                    position={[
                        width + radius,
                        -lineHeight * (index + 0.5),
                        CONFIG.detailsLayout.BIO_REVEAL_BLOCK_Z,
                    ]}
                >
                    <mesh position={[-blockWidth / 2, 0, 0]}>
                        <planeGeometry
                            args={[blockWidth, blockHeight, 1, lineSegments]}
                        />
                        <meshBasicMaterial
                            ref={(material) => {
                                blockMaterialRefs.current[index] = material;
                            }}
                            color={blockColor}
                            transparent
                            opacity={0}
                            onBeforeCompile={applyBlockShader}
                        />
                    </mesh>
                </group>
            ))}
        </group>
    );
}
