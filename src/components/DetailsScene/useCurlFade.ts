"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Group, Vector3 } from "three";
import { curlAngle, curlOpacity } from "@/lib/detailsCurl";

export function useCurlFade<T extends HTMLElement = HTMLDivElement>(
    applyOpacity: (opacity: number) => void,
) {
    const groupRef = useRef<Group>(null);
    const twinRef = useRef<T>(null);
    const revealedRef = useRef(false);
    const twinHiddenRef = useRef(false);
    const worldPosition = useRef(new Vector3());

    useFrame(() => {
        const group = groupRef.current;
        if (!group) return;

        group.getWorldPosition(worldPosition.current);
        const angle = curlAngle(worldPosition.current.y);
        applyOpacity(revealedRef.current ? curlOpacity(angle) : 0);

        const hidden = angle > 0;
        if (hidden !== twinHiddenRef.current) {
            twinHiddenRef.current = hidden;
            const twin = twinRef.current;
            if (twin) {
                twin.style.visibility = hidden ? "hidden" : "";
                twin.style.pointerEvents = hidden ? "none" : "";
            }
        }
    });

    return { groupRef, twinRef, revealedRef };
}
