"use client";

import { useEffect, useRef } from "react";
import { useTexture } from "@react-three/drei";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SRGBColorSpace, type Group, type MeshBasicMaterial } from "three";
import { CONFIG, THEME } from "@/config/constants";
import { applyCurlShader } from "@/lib/detailsCurl";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useCurlFade } from "./useCurlFade";

interface AnimatedRevealImageProps {
    src: string;
    width: number;
    height: number;
    position: [number, number, number];
    lines?: number;
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

    const lineHeight = height / lines;
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
                        width,
                        -lineHeight * (index + 0.5),
                        CONFIG.detailsLayout.BIO_REVEAL_BLOCK_Z,
                    ]}
                >
                    <mesh position={[-width / 2, 0, 0]}>
                        <planeGeometry
                            args={[width, lineHeight, 1, lineSegments]}
                        />
                        <meshBasicMaterial
                            ref={(material) => {
                                blockMaterialRefs.current[index] = material;
                            }}
                            color={blockColor}
                            transparent
                            opacity={0}
                            onBeforeCompile={applyCurlShader}
                        />
                    </mesh>
                </group>
            ))}
        </group>
    );
}
