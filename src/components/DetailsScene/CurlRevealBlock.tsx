"use client";

import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Vector2, type Mesh, type MeshBasicMaterial } from "three";
import { CONFIG } from "@/config/constants";
import { roundedCurlShader } from "@/lib/revealBlockShader";
import type { TextBounds } from "@/lib/textBounds";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

export function curlBlockRect(bounds: TextBounds) {
    const rawWidth = bounds.maxX - bounds.minX;
    const rawHeight = bounds.maxY - bounds.minY;
    const width = rawWidth * CONFIG.detailsReveal.BLOCK_WIDTH_MULT;
    const height = rawHeight * CONFIG.detailsReveal.BLOCK_HEIGHT_MULT;

    return {
        width,
        height,
        leftEdge: (bounds.minX + bounds.maxX) / 2 - width / 2,
        centerY: (bounds.minY + bounds.maxY) / 2,
    };
}

interface CurlRevealBlockProps {
    bounds: TextBounds;
    color: string;
    cornerRadius: number;
    direction: "leftToRight" | "rightToLeft";
    delay: number;
    duration: number;
    startTrigger: boolean;
    materialRef: RefObject<MeshBasicMaterial | null>;
    onHalfway: () => void;
    segments?: number;
    renderOrder?: number;
}

export function CurlRevealBlock({
    bounds,
    color,
    cornerRadius,
    direction,
    delay,
    duration,
    startTrigger,
    materialRef,
    onHalfway,
    segments = CONFIG.detailsReveal.BLOCK_SEGMENTS,
    renderOrder = 0,
}: CurlRevealBlockProps) {
    const prefersReducedMotion = usePrefersReducedMotion();
    const meshRef = useRef<Mesh>(null);
    const playedRef = useRef(false);
    const onHalfwayRef = useRef(onHalfway);
    const radiusUv = useMemo(() => ({ value: new Vector2(1, 1) }), []);

    useLayoutEffect(() => {
        onHalfwayRef.current = onHalfway;
    }, [onHalfway]);

    const { width, height, leftEdge, centerY } = useMemo(
        () => curlBlockRect(bounds),
        [bounds],
    );

    const radius = Math.min(cornerRadius, width / 2, height / 2);

    useLayoutEffect(() => {
        radiusUv.value.set(
            Math.max(radius / width, 1e-4),
            Math.max(radius / height, 1e-4),
        );
    }, [radiusUv, radius, width, height]);

    const shader = useMemo(() => roundedCurlShader(radiusUv), [radiusUv]);

    useGSAP(
        () => {
            const mesh = meshRef.current;
            if (!mesh) return;

            const growFromLeft = direction === "leftToRight";
            const proxy = { s: 0 };

            const apply = (fromLeft: boolean) => {
                mesh.scale.x = Math.max(proxy.s, 0.0001);
                mesh.position.x = fromLeft
                    ? leftEdge + (width * proxy.s) / 2
                    : leftEdge + width - (width * proxy.s) / 2;
            };

            apply(growFromLeft);
            mesh.visible = false;

            if (!startTrigger || playedRef.current) return;
            playedRef.current = true;

            if (prefersReducedMotion) {
                let fired = false;
                const call = gsap.delayedCall(delay, () => {
                    fired = true;
                    onHalfwayRef.current();
                });

                return () => {
                    call.kill();
                    if (!fired) playedRef.current = false;
                };
            }

            const tl = gsap.timeline({
                delay,
                onStart: () => {
                    mesh.visible = true;
                },
                onComplete: () => {
                    mesh.visible = false;
                },
            });

            tl.to(proxy, {
                s: 1,
                duration,
                ease: "power4.inOut",
                onUpdate: () => apply(growFromLeft),
            });
            tl.call(() => onHalfwayRef.current());
            tl.to(proxy, {
                s: 0,
                duration,
                ease: "power4.inOut",
                onUpdate: () => apply(!growFromLeft),
            });

            return () => {
                const progress = tl.progress();
                tl.kill();
                mesh.visible = false;

                if (progress === 0) {
                    playedRef.current = false;
                } else if (progress < 1) {
                    onHalfwayRef.current();
                }
            };
        },
        {
            dependencies: [
                startTrigger,
                delay,
                duration,
                direction,
                width,
                leftEdge,
                prefersReducedMotion,
            ],
        },
    );

    return (
        <mesh
            ref={meshRef}
            position={[leftEdge, centerY, CONFIG.detailsReveal.BLOCK_Z]}
            scale-x={0.0001}
            visible={false}
            renderOrder={renderOrder}
        >
            <planeGeometry args={[width, height, 1, segments]} />
            <meshBasicMaterial
                ref={materialRef}
                color={color}
                transparent
                opacity={0}
                onBeforeCompile={shader}
            />
        </mesh>
    );
}
