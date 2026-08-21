"use client";

import { createContext, useContext } from "react";
import { CONFIG } from "@/config/constants";
import { DEFAULT_BIO_VARIANT, type BioVariant } from "@/data/content";

export interface DebugSettings {
    bio: { variant: BioVariant };
    projectPreview: {
        sizeMult: number;
        bendMult: number;
        aberrationMult: number;
        velocityFullScale: number;
        velocitySmoothing: number;
        glitchSlice: number;
        glitchSplit: number;
        glitchHz: number;
        pinGlitch: boolean;
        pinnedGlitch: number;
    };
    material: {
        thickness: number;
        roughness: number;
        transmission: number;
        ior: number;
        chromaticAberration: number;
        backside: boolean;
        scale: number;
    };
    skullRotation: { x: number; y: number; z: number };
    curl: {
        foldOffsetMult: number;
        bottomOffsetMult: number;
        radiusMult: number;
        maxAngle: number;
        fadeAngleStart: number;
        fadeAngleEnd: number;
    };
    modelAnchor: { foldFadeClearance: number; foldFadeSpan: number };
    header: { fontSize: number };
    edgeFade: { topSpanMult: number; bottomSpanMult: number };
    scrollBlur: {
        velocityScale: number;
        blur: number;
        split: number;
        taps: number;
        vignetteXWeight: number;
        vignetteInner: number;
        vignetteOuter: number;
        vignetteFloor: number;
        attack: number;
        release: number;
    };
    phase2: {
        dockScale: number;
        dockOffsetX: number;
        dockOffsetY: number;
        safariChromeScale: number;
        safariControlsScale: number;
        safariAddressScale: number;
        safariBottomSafeArea: number;
    };
    headerExclusion: { strength: number; threshold: number; softness: number };
}

/**
 * What the scene runs on outside /debug. The Leva panel is the only thing that
 * ever replaces these, and it is code-split away from the production bundle, so
 * nothing here may be derived from leva.
 */
export const DEBUG_DEFAULTS: DebugSettings = {
    bio: { variant: DEFAULT_BIO_VARIANT },
    projectPreview: {
        sizeMult: 1,
        bendMult: CONFIG.projectPreview.BEND_MULT,
        aberrationMult: CONFIG.projectPreview.ABERRATION_MULT,
        velocityFullScale: CONFIG.projectPreview.VELOCITY_FULL_SCALE,
        velocitySmoothing: CONFIG.projectPreview.VELOCITY_SMOOTHING,
        glitchSlice: CONFIG.projectPreview.GLITCH_SLICE,
        glitchSplit: CONFIG.projectPreview.GLITCH_SPLIT,
        glitchHz: CONFIG.projectPreview.GLITCH_HZ,
        pinGlitch: false,
        pinnedGlitch: 0,
    },
    material: {
        thickness: 0.65,
        roughness: 0.2,
        transmission: 0.97,
        ior: 0.9,
        chromaticAberration: 1.0,
        backside: false,
        scale: 0.8,
    },
    skullRotation: { x: -1.3, y: -3.13, z: 0.85 },
    curl: {
        foldOffsetMult: CONFIG.detailsCurl.FOLD_OFFSET_MULT,
        bottomOffsetMult: CONFIG.detailsCurl.BOTTOM_OFFSET_MULT,
        radiusMult: CONFIG.detailsCurl.RADIUS_MULT,
        maxAngle: CONFIG.detailsCurl.MAX_ANGLE,
        fadeAngleStart: CONFIG.detailsCurl.FADE_ANGLE_START,
        fadeAngleEnd: CONFIG.detailsCurl.FADE_ANGLE_END,
    },
    modelAnchor: {
        foldFadeClearance: CONFIG.model.FOLD_FADE_CLEARANCE_MULT,
        foldFadeSpan: CONFIG.model.FOLD_FADE_SPAN_MULT,
    },
    header: { fontSize: CONFIG.header.FONT_SIZE },
    edgeFade: {
        topSpanMult: CONFIG.detailsCurl.EDGE_FADE_TOP_MULT,
        bottomSpanMult: CONFIG.detailsCurl.EDGE_FADE_BOTTOM_MULT,
    },
    scrollBlur: {
        velocityScale: CONFIG.customAberration.SCROLL_VEL_SCALE,
        blur: CONFIG.customAberration.SCROLL_BLUR,
        split: CONFIG.customAberration.SCROLL_SPLIT,
        taps: CONFIG.customAberration.SCROLL_TAPS,
        vignetteXWeight: CONFIG.customAberration.SCROLL_VIGNETTE_X_WEIGHT,
        vignetteInner: CONFIG.customAberration.SCROLL_VIGNETTE_INNER,
        vignetteOuter: CONFIG.customAberration.SCROLL_VIGNETTE_OUTER,
        vignetteFloor: CONFIG.customAberration.SCROLL_VIGNETTE_FLOOR,
        attack: CONFIG.customAberration.SCROLL_ATTACK_MULT,
        release: CONFIG.customAberration.SCROLL_RELEASE_MULT,
    },
    phase2: {
        dockScale: CONFIG.phase2.DOCK_SCALE,
        dockOffsetX: CONFIG.phase2.DOCK_OFFSET_X,
        dockOffsetY: CONFIG.phase2.DOCK_OFFSET_Y,
        safariChromeScale: CONFIG.phase2.SAFARI_CHROME_SCALE,
        safariControlsScale: CONFIG.phase2.SAFARI_CONTROLS_SCALE,
        safariAddressScale: CONFIG.phase2.SAFARI_ADDRESS_SCALE,
        safariBottomSafeArea: CONFIG.phase2.SAFARI_BOTTOM_SAFE_AREA,
    },
    headerExclusion: { strength: 1, threshold: 0.05, softness: 0.15 },
};

const DebugSettingsContext = createContext<DebugSettings>(DEBUG_DEFAULTS);

/**
 * R3F runs its own reconciler, so context does not cross the Canvas boundary on
 * its own — Scene re-provides the value inside, the way it already does for the
 * theme.
 */
export function DebugSettingsBridge({
    value,
    children,
}: {
    value: DebugSettings;
    children: React.ReactNode;
}) {
    return (
        <DebugSettingsContext.Provider value={value}>
            {children}
        </DebugSettingsContext.Provider>
    );
}

export function useDebugSettings(): DebugSettings {
    return useContext(DebugSettingsContext);
}
