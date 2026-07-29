"use client";

import { useEffect } from "react";
import { Leva, useControls } from "leva";
import { CONFIG } from "@/config/constants";
import { bioVariants, type BioVariant } from "@/data/content";
import {
    DEBUG_DEFAULTS,
    type DebugSettings,
} from "@/context/DebugSettingsContext";

const D = DEBUG_DEFAULTS;

const BIO_SCHEMA = {
    variant: {
        value: D.bio.variant,
        options: Object.keys(bioVariants) as BioVariant[],
    },
};

const PREVIEW_SCHEMA = {
    mode: { value: D.projectPreview.mode, options: ["morph", "scale"] as const },
    sizeMult: { value: D.projectPreview.sizeMult, min: 0.5, max: 2.5, step: 0.05 },
    bendMult: { value: D.projectPreview.bendMult, min: 0, max: 0.6, step: 0.005 },
    aberrationMult: {
        value: D.projectPreview.aberrationMult,
        min: 0,
        max: 0.2,
        step: 0.001,
    },
    growStart: { value: D.projectPreview.growStart, min: 0, max: 0.95, step: 0.01 },
    velocityFullScale: {
        value: D.projectPreview.velocityFullScale,
        min: 0.2,
        max: 8,
        step: 0.1,
    },
    velocitySmoothing: {
        value: D.projectPreview.velocitySmoothing,
        min: 1,
        max: 30,
        step: 0.5,
    },
    pinMorph: D.projectPreview.pinMorph,
    pinnedMorph: { value: D.projectPreview.pinnedMorph, min: 0, max: 1, step: 0.01 },
};

const MATERIAL_SCHEMA = {
    thickness: { value: D.material.thickness, min: 0, max: 5, step: 0.05 },
    roughness: { value: D.material.roughness, min: 0, max: 1, step: 0.1 },
    transmission: { value: D.material.transmission, min: 0, max: 1, step: 0.01 },
    ior: { value: D.material.ior, min: 0, max: 3, step: 0.1 },
    chromaticAberration: {
        value: D.material.chromaticAberration,
        min: 0,
        max: 1,
        step: 0.01,
    },
    backside: { value: D.material.backside },
    scale: { value: D.material.scale, min: 0, max: 3, step: 0.05 },
};

const SKULL_ROTATION_SCHEMA = {
    x: { value: D.skullRotation.x, min: -Math.PI, max: Math.PI, step: 0.05 },
    y: { value: D.skullRotation.y, min: -Math.PI, max: Math.PI, step: 0.05 },
    z: { value: D.skullRotation.z, min: -Math.PI, max: Math.PI, step: 0.05 },
};

const CURL_SCHEMA = {
    foldOffsetMult: { value: D.curl.foldOffsetMult, min: -0.3, max: 0.3, step: 0.005 },
    bottomOffsetMult: {
        value: D.curl.bottomOffsetMult,
        min: 0,
        max: 0.5,
        step: 0.005,
    },
    radiusMult: { value: D.curl.radiusMult, min: 0.03, max: 1, step: 0.005 },
    maxAngle: { value: D.curl.maxAngle, min: 0.2, max: 3, step: 0.01 },
    fadeAngleStart: { value: D.curl.fadeAngleStart, min: 0, max: 2, step: 0.01 },
    fadeAngleEnd: { value: D.curl.fadeAngleEnd, min: 0.05, max: 3, step: 0.01 },
};

const ANCHOR_SCHEMA = {
    foldFadeClearance: {
        value: D.modelAnchor.foldFadeClearance,
        min: 0,
        max: 0.6,
        step: 0.01,
    },
    foldFadeSpan: {
        value: D.modelAnchor.foldFadeSpan,
        min: 0.05,
        max: 1.2,
        step: 0.01,
    },
};

const HEADER_SCHEMA = {
    fontSize: { value: D.header.fontSize, min: 0.004, max: 0.02, step: 0.0001 },
};

const EDGE_FADE_SCHEMA = {
    topSpanMult: { value: D.edgeFade.topSpanMult, min: 0.05, max: 2, step: 0.01 },
    bottomSpanMult: {
        value: D.edgeFade.bottomSpanMult,
        min: 0.01,
        max: 0.6,
        step: 0.005,
    },
};

const SCROLL_BLUR_SCHEMA = {
    velocityScale: { value: D.scrollBlur.velocityScale, min: 1, max: 60, step: 1 },
    blur: { value: D.scrollBlur.blur, min: 0, max: 0.12, step: 0.001 },
    split: { value: D.scrollBlur.split, min: 0, max: 0.03, step: 0.0005 },
    taps: {
        value: D.scrollBlur.taps,
        min: 2,
        max: CONFIG.customAberration.SCROLL_TAPS,
        step: 1,
    },
    vignetteXWeight: {
        value: D.scrollBlur.vignetteXWeight,
        min: 0,
        max: 1.5,
        step: 0.05,
    },
    vignetteInner: { value: D.scrollBlur.vignetteInner, min: 0, max: 0.7, step: 0.01 },
    vignetteOuter: {
        value: D.scrollBlur.vignetteOuter,
        min: 0.05,
        max: 1.2,
        step: 0.01,
    },
    vignetteFloor: { value: D.scrollBlur.vignetteFloor, min: 0, max: 1, step: 0.05 },
    attack: { value: D.scrollBlur.attack, min: 5, max: 80, step: 1 },
    release: { value: D.scrollBlur.release, min: 2, max: 40, step: 1 },
};

const EXCLUSION_SCHEMA = {
    strength: { value: D.headerExclusion.strength, min: 0, max: 1, step: 0.05 },
    threshold: { value: D.headerExclusion.threshold, min: 0, max: 0.5, step: 0.005 },
    softness: { value: D.headerExclusion.softness, min: 0.01, max: 0.6, step: 0.005 },
};

/**
 * Every Leva control in the project lives here so that leva itself is only ever
 * pulled in on /debug. Nothing else may import it.
 */
export default function DebugPanel({
    onChange,
}: {
    onChange: (settings: DebugSettings) => void;
}) {
    const bio = useControls("Bio", BIO_SCHEMA);
    const projectPreview = useControls("Project preview", PREVIEW_SCHEMA);
    const material = useControls(MATERIAL_SCHEMA);
    const skullRotation = useControls("Skull Rotation", SKULL_ROTATION_SCHEMA);
    const curl = useControls("Details curl", CURL_SCHEMA);
    const modelAnchor = useControls("Model anchor", ANCHOR_SCHEMA);
    const header = useControls("Header", HEADER_SCHEMA);
    const edgeFade = useControls("Curl edge fade", EDGE_FADE_SCHEMA);
    const scrollBlur = useControls("Scroll blur", SCROLL_BLUR_SCHEMA);
    const headerExclusion = useControls("Header exclusion", EXCLUSION_SCHEMA);

    useEffect(() => {
        onChange({
            bio,
            projectPreview: {
                ...projectPreview,
                mode: projectPreview.mode as DebugSettings["projectPreview"]["mode"],
            },
            material,
            skullRotation,
            curl,
            modelAnchor,
            header,
            edgeFade,
            scrollBlur,
            headerExclusion,
        });
    }, [
        onChange,
        bio,
        projectPreview,
        material,
        skullRotation,
        curl,
        modelAnchor,
        header,
        edgeFade,
        scrollBlur,
        headerExclusion,
    ]);

    return <Leva collapsed />;
}
