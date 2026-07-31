"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Group, Vector3 } from "three";
import { caseStudyStage } from "@/lib/caseStudyStage";
import {
    curlAngle,
    curlDropOpacity,
    curlRiseOpacity,
} from "@/lib/detailsCurl";

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
        const fade = Math.min(
            curlRiseOpacity(worldPosition.current.y),
            curlDropOpacity(worldPosition.current.y),
        );
        applyOpacity(revealedRef.current ? fade : 0);

        // A case study flies the camera off the sheet, which lands these twins
        // over copy they have nothing to do with — still selectable, and in a
        // link's case still openable. Hidden rather than unmounted: the reveal
        // would rebuild the accessibility tree on every open and close.
        const hidden = angle > 0 || caseStudyStage.progress > 1e-3;
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
