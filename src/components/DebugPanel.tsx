"use client";

import { useEffect } from "react";
import { Leva, useControls } from "leva";
import { CONFIG } from "@/config/constants";
import { bioVariants, type BioVariant } from "@/data/content";
import {
    DEBUG_DEFAULTS,
    type DebugSettings,
} from "@/config/debugSettings";

const D = DEBUG_DEFAULTS;

const BIO_SCHEMA = {
    variant: {
        value: D.bio.variant,
        options: Object.keys(bioVariants) as BioVariant[],
    },
};

const PREVIEW_SCHEMA = {
    sizeMult: {
        value: D.projectPreview.sizeMult,
        min: 0.5,
        max: 2.5,
        step: 0.05,
    },
    bendMult: {
        value: D.projectPreview.bendMult,
        min: 0,
        max: 0.6,
        step: 0.005,
    },
    aberrationMult: {
        value: D.projectPreview.aberrationMult,
        min: 0,
        max: 0.2,
        step: 0.001,
    },
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
    glitchSlice: {
        value: D.projectPreview.glitchSlice,
        min: 0,
        max: 0.3,
        step: 0.005,
    },
    glitchSplit: {
        value: D.projectPreview.glitchSplit,
        min: 0,
        max: 0.1,
        step: 0.001,
    },
    glitchHz: {
        value: D.projectPreview.glitchHz,
        min: 1,
        max: 40,
        step: 1,
    },
    pinGlitch: D.projectPreview.pinGlitch,
    pinnedGlitch: {
        value: D.projectPreview.pinnedGlitch,
        min: 0,
        max: 1,
        step: 0.01,
    },
};

const MATERIAL_SCHEMA = {
    thickness: { value: D.material.thickness, min: 0, max: 5, step: 0.05 },
    roughness: { value: D.material.roughness, min: 0, max: 1, step: 0.1 },
    transmission: {
        value: D.material.transmission,
        min: 0,
        max: 1,
        step: 0.01,
    },
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

const SCAN_SCHEMA = {
    enabled: { value: D.scan.enabled },
    idleStrength: { label: "Idle strength", value: D.scan.idleStrength, min: 0, max: 0.5, step: 0.005 },
    strength: { label: "Hover boost", value: D.scan.strength, min: 0, max: 1.5, step: 0.01 },
    hoverSpread: { label: "Whole model spread", value: D.scan.hoverSpread, min: 0, max: 1, step: 0.01 },
    bands: { value: D.scan.bands, min: 20, max: 220, step: 1 },
    flow: { value: D.scan.flow, min: 0, max: 4, step: 0.05 },
    radius: { value: D.scan.radius, min: 0.05, max: 1, step: 0.01 },
    proximity: { value: D.scan.proximity, min: 0.05, max: 1, step: 0.01 },
    response: { value: D.scan.response, min: 1, max: 30, step: 0.5 },
    release: { value: D.scan.release, min: 1, max: 30, step: 0.5 },
};

const SKULL_ROTATION_SCHEMA = {
    x: { value: D.skullRotation.x, min: -Math.PI, max: Math.PI, step: 0.05 },
    y: { value: D.skullRotation.y, min: -Math.PI, max: Math.PI, step: 0.05 },
    z: { value: D.skullRotation.z, min: -Math.PI, max: Math.PI, step: 0.05 },
};

const CURL_SCHEMA = {
    foldOffsetMult: {
        value: D.curl.foldOffsetMult,
        min: -0.3,
        max: 0.3,
        step: 0.005,
    },
    bottomOffsetMult: {
        value: D.curl.bottomOffsetMult,
        min: 0,
        max: 0.5,
        step: 0.005,
    },
    radiusMult: { value: D.curl.radiusMult, min: 0.03, max: 1, step: 0.005 },
    maxAngle: { value: D.curl.maxAngle, min: 0.2, max: 3, step: 0.01 },
    fadeAngleStart: {
        value: D.curl.fadeAngleStart,
        min: 0,
        max: 2,
        step: 0.01,
    },
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
    topSpanMult: {
        value: D.edgeFade.topSpanMult,
        min: 0.05,
        max: 2,
        step: 0.01,
    },
    bottomSpanMult: {
        value: D.edgeFade.bottomSpanMult,
        min: 0.01,
        max: 0.6,
        step: 0.005,
    },
};

const SCROLL_BLUR_SCHEMA = {
    velocityScale: {
        value: D.scrollBlur.velocityScale,
        min: 1,
        max: 60,
        step: 1,
    },
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
    vignetteInner: {
        value: D.scrollBlur.vignetteInner,
        min: 0,
        max: 0.7,
        step: 0.01,
    },
    vignetteOuter: {
        value: D.scrollBlur.vignetteOuter,
        min: 0.05,
        max: 1.2,
        step: 0.01,
    },
    vignetteFloor: {
        value: D.scrollBlur.vignetteFloor,
        min: 0,
        max: 1,
        step: 0.05,
    },
    attack: { value: D.scrollBlur.attack, min: 5, max: 80, step: 1 },
    release: { value: D.scrollBlur.release, min: 2, max: 40, step: 1 },
};

const EXCLUSION_SCHEMA = {
    strength: { value: D.headerExclusion.strength, min: 0, max: 1, step: 0.05 },
    threshold: {
        value: D.headerExclusion.threshold,
        min: 0,
        max: 0.5,
        step: 0.005,
    },
    softness: {
        value: D.headerExclusion.softness,
        min: 0.01,
        max: 0.6,
        step: 0.005,
    },
};

const DESKTOP_SCHEMA = {
    dockScale: { value: D.desktop.dockScale, min: 0.6, max: 1.7, step: 0.01 },
    dockOffsetX: {
        value: D.desktop.dockOffsetX,
        min: -0.3,
        max: 0.3,
        step: 0.005,
    },
    dockOffsetY: {
        value: D.desktop.dockOffsetY,
        min: -0.3,
        max: 0.045,
        step: 0.005,
    },
    dockMagnification: {
        value: D.desktop.dockMagnification,
        min: 0,
        max: CONFIG.workstation.DOCK_MAGNIFICATION_MAX,
        step: 0.01,
    },
    safariChromeScale: {
        value: D.desktop.safariChromeScale,
        min: 0.6,
        max: 2,
        step: 0.01,
    },
    safariControlsScale: {
        value: D.desktop.safariControlsScale,
        min: 0.5,
        max: 2,
        step: 0.01,
    },
    safariAddressScale: {
        value: D.desktop.safariAddressScale,
        min: 0.5,
        max: 2,
        step: 0.01,
    },
    safariBottomSafeArea: {
        value: D.desktop.safariBottomSafeArea,
        min: 0,
        max: 0.3,
        step: 0.005,
    },
};

const WORKSTATION_SCHEMA = {
    polaroidsPosition: { value: D.workstation.polaroidsPosition, step: 0.01 },
    energyCanPosition: { value: D.workstation.energyCanPosition, step: 0.01 },
    leftSpeakerPosition: { value: D.workstation.leftSpeakerPosition, step: 0.01 },
    rightSpeakerPosition: { value: D.workstation.rightSpeakerPosition, step: 0.01 },
    featuredRecordPosition: { value: D.workstation.featuredRecordPosition, step: 0.01 },
    sillBooksPosition: { value: D.workstation.sillBooksPosition, step: 0.01 },

    monitorPosition: { value: D.workstation.monitorPosition, step: 0.01 },
    cabinetPosition: { value: D.workstation.cabinetPosition, step: 0.01 },
    mousePosition: { value: D.workstation.mousePosition, step: 0.01 },
    controllerPosition: { value: D.workstation.controllerPosition, step: 0.01 },
    lampPosition: { value: D.workstation.lampPosition, step: 0.01 },
    windowPosition: { value: D.workstation.windowPosition, step: 0.01 },
    portraitArtworkPosition: { value: D.workstation.portraitArtworkPosition, step: 0.01 },
    ronaldoArtworkPosition: { value: D.workstation.ronaldoArtworkPosition, step: 0.01 },
    skateboardPosition: { value: D.workstation.skateboardPosition, step: 0.01 },
    plantPosition: { value: D.workstation.plantPosition, step: 0.01 },
    monitorYaw: { value: D.workstation.monitorYaw, min: -15, max: 15, step: 0.5 },
    keyboardPosition: { value: D.workstation.keyboardPosition, step: 0.001 },
    keyboardRotation: { value: D.workstation.keyboardRotation, step: 0.5 },
    keyboardScale: { value: D.workstation.keyboardScale, min: 0.5, max: 1.5, step: 0.01 },
    turntablePosition: { value: D.workstation.turntablePosition, step: 0.001 },
    turntableRotation: { value: D.workstation.turntableRotation, step: 0.5 },
    turntableScale: { value: D.workstation.turntableScale, min: 0.5, max: 1.5, step: 0.01 },
    deskPosition: { value: D.workstation.deskPosition, step: 0.001 },
    deskScale: { value: D.workstation.deskScale, min: 0.5, max: 6, step: 0.01 },
};

const SCENE_FRAMING_SCHEMA = {
    maxZoomOut: { value: D.sceneFraming.maxZoomOut, label: "Maximum zoom out", min: 0, max: 1, step: 0.01 },
    cameraEnd: { value: D.sceneFraming.cameraEnd, step: 0.01 },
    cameraTarget: { value: D.sceneFraming.cameraTarget, step: 0.01 },
    cameraCurve: { value: D.sceneFraming.cameraCurve, step: 0.01 },
    arcStart: { value: D.sceneFraming.arcStart, min: 0, max: 0.6, step: 0.01 },
};

const POINTER_CAMERA_SCHEMA = {
    enabled: D.pointerCamera.enabled,
    sensitivity: { value: D.pointerCamera.sensitivity, label: "Sensitivity", min: 0, max: 1.5, step: 0.05 },
    horizontalStrength: { value: D.pointerCamera.horizontalStrength, label: "Horizontal / focus", min: 0, max: 0.5, step: 0.01 },
    verticalStrength: { value: D.pointerCamera.verticalStrength, label: "Vertical / focus", min: 0, max: 0.25, step: 0.005 },
    focusDepth: { value: D.pointerCamera.focusDepth, label: "Focus depth", min: 0.25, max: 1, step: 0.05 },
    smoothTime: { value: D.pointerCamera.smoothTime, label: "Smooth time (s)", min: 0.1, max: 2, step: 0.05 },
    returnDuration: { value: D.pointerCamera.returnDuration, label: "Return target (s)", min: 0.1, max: 5, step: 0.1 },
    deadzone: { value: D.pointerCamera.deadzone, min: 0, max: 0.2, step: 0.01 },
    revealStart: { value: D.pointerCamera.revealStart, min: 0.5, max: 1, step: 0.01 },
    revealFull: { value: D.pointerCamera.revealFull, min: 0.5, max: 1, step: 0.01 },
    scrollAttenuation: { value: D.pointerCamera.scrollAttenuation, min: 0, max: 1, step: 0.05 },
};

const LIGHTING_SCHEMA = {
    mode: { value: D.lighting.mode, options: ["day", "night"] },
    windowLight: { value: D.lighting.windowLight, min: 0, max: 6, step: 0.1 },
    lampLight: { value: D.lighting.lampLight, min: 0, max: 6, step: 0.1 },
    fillLight: { value: D.lighting.fillLight, min: 0, max: 2, step: 0.05 },
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
    const scan = useControls("Skull Scan", SCAN_SCHEMA);
    const curl = useControls("Details curl", CURL_SCHEMA);
    const modelAnchor = useControls("Model anchor", ANCHOR_SCHEMA);
    const header = useControls("Header", HEADER_SCHEMA);
    const edgeFade = useControls("Curl edge fade", EDGE_FADE_SCHEMA);
    const scrollBlur = useControls("Scroll blur", SCROLL_BLUR_SCHEMA);
    const desktop = useControls("CRT desktop", DESKTOP_SCHEMA);
    const lighting = useControls("Environment lighting", LIGHTING_SCHEMA);
    const workstation = useControls("Workstation", WORKSTATION_SCHEMA);
    const sceneFraming = useControls("3D scene framing", SCENE_FRAMING_SCHEMA);
    const pointerCamera = useControls("Pointer Camera", POINTER_CAMERA_SCHEMA, { collapsed: true });
    const headerExclusion = useControls("Header exclusion", EXCLUSION_SCHEMA);

    useEffect(() => {
        onChange({
            bio,
            projectPreview,
            material,
            skullRotation,
            scan,
            curl,
            modelAnchor,
            header,
            edgeFade,
            scrollBlur,
            desktop,
            lighting: { ...lighting, mode: lighting.mode as DebugSettings["lighting"]["mode"] },
            workstation,
            sceneFraming,
            pointerCamera,
            headerExclusion,
        });
    }, [
        onChange,
        bio,
        projectPreview,
        material,
        skullRotation,
        scan,
        curl,
        modelAnchor,
        header,
        edgeFade,
        scrollBlur,
        desktop,
        lighting,
        workstation,
        sceneFraming,
        pointerCamera,
        headerExclusion,
    ]);

    return (
        <div data-lenis-prevent className="debug-panel">
            <Leva collapsed />
        </div>
    );
}
