"use client";

import { useLayoutEffect, useMemo, type RefObject } from "react";
import { Vector2, type MeshBasicMaterial } from "three";
import { CONFIG } from "@/config/constants";
import { roundedCurlFadeShader } from "@/lib/revealBlockShader";
import type { TextBounds } from "@/lib/textBounds";
import { curlBlockRect } from "./CurlRevealBlock";

interface LinkButtonPlateProps {
    bounds: TextBounds;
    color: string;
    cornerRadius: number;
    materialRef: RefObject<MeshBasicMaterial | null>;
}

export function LinkButtonPlate({
    bounds,
    color,
    cornerRadius,
    materialRef,
}: LinkButtonPlateProps) {
    const radiusUv = useMemo(() => ({ value: new Vector2(1, 1) }), []);

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

    const shader = useMemo(() => roundedCurlFadeShader(radiusUv), [radiusUv]);

    return (
        <mesh
            position={[
                leftEdge + width / 2,
                centerY,
                CONFIG.detailsReveal.BUTTON_Z,
            ]}
            renderOrder={-1}
        >
            <planeGeometry
                args={[width, height, 1, CONFIG.detailsReveal.BUTTON_SEGMENTS]}
            />
            <meshBasicMaterial
                ref={materialRef}
                color={color}
                transparent
                opacity={0}
                depthWrite={false}
                onBeforeCompile={shader}
            />
        </mesh>
    );
}
