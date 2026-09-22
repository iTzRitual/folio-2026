import { CONFIG } from "@/config/constants";
import { DEFAULT_BIO_VARIANT, type BioVariant } from "@/data/content";

export interface DebugSettings {
  skullAppearance: { mode: "particles" | "glass" };
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
  particles: {
    count: number;
    radius: number;
    cursorRadius: number;
    cursorStrength: number;
    returnStrength: number;
    damping: number;
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
  desktop: {
    dockScale: number;
    dockOffsetX: number;
    dockOffsetY: number;
    dockMagnification: number;
    safariChromeScale: number;
    safariControlsScale: number;
    safariAddressScale: number;
    safariBottomSafeArea: number;
  };
  sceneFraming: {
    cameraEnd: { x: number; y: number; z: number };
    cameraTarget: { x: number; y: number; z: number };
    cameraCurve: { x: number; y: number; z: number };
    arcStart: number;
    maxZoomOut: number;
  };
  pointerCamera: {
    enabled: boolean;
    sensitivity: number;
    horizontalStrength: number;
    verticalStrength: number;
    focusDepth: number;
    smoothTime: number;
    returnDuration: number;
    deadzone: number;
    revealStart: number;
    revealFull: number;
    scrollAttenuation: number;
  };
  headerExclusion: { strength: number; threshold: number; softness: number };
  lighting: { mode: "day" | "night"; windowLight: number; lampLight: number; fillLight: number };
  workstation: {
    monitorPosition: { x: number; y: number; z: number };
    cabinetPosition: { x: number; y: number; z: number };
    mousePosition: { x: number; y: number; z: number };
    controllerPosition: { x: number; y: number; z: number };
    lampPosition: { x: number; y: number; z: number };
    windowPosition: { x: number; y: number; z: number };
    portraitArtworkPosition: { x: number; y: number; z: number };
    ronaldoArtworkPosition: { x: number; y: number; z: number };
    skateboardPosition: { x: number; y: number; z: number };
    plantPosition: { x: number; y: number; z: number };
    polaroidsPosition: { x: number; y: number; z: number };
    energyCanPosition: { x: number; y: number; z: number };
    leftSpeakerPosition: { x: number; y: number; z: number };
    rightSpeakerPosition: { x: number; y: number; z: number };
    featuredRecordPosition: { x: number; y: number; z: number };
    sillBooksPosition: { x: number; y: number; z: number };
    monitorYaw: number;
    keyboardPosition: { x: number; y: number; z: number };
    keyboardRotation: { x: number; y: number; z: number };
    keyboardScale: number;
    turntablePosition: { x: number; y: number; z: number };
    turntableRotation: { x: number; y: number; z: number };
    turntableScale: number;
    deskPosition: { x: number; y: number; z: number };
    deskScale: { x: number; y: number; z: number };
  };
}

export const DEBUG_DEFAULTS: DebugSettings = {
  skullAppearance: { mode: "glass" },
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
  particles: {
    count: CONFIG.model.PARTICLE_COUNT,
    radius: CONFIG.model.PARTICLE_RADIUS,
    cursorRadius: CONFIG.model.PARTICLE_CURSOR_RADIUS,
    cursorStrength: CONFIG.model.PARTICLE_CURSOR_STRENGTH,
    returnStrength: CONFIG.model.PARTICLE_RETURN_STRENGTH,
    damping: CONFIG.model.PARTICLE_DAMPING,
    scale: 0.8,
  },
  skullRotation: { x: -1.3, y: -3.13, z: -1.57 },
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
  desktop: {
    dockScale: CONFIG.workstation.DOCK_SCALE,
    dockOffsetX: CONFIG.workstation.DOCK_OFFSET_X,
    dockOffsetY: CONFIG.workstation.DOCK_OFFSET_Y,
    dockMagnification: 0.5,
    safariChromeScale: CONFIG.workstation.SAFARI_CHROME_SCALE,
    safariControlsScale: CONFIG.workstation.SAFARI_CONTROLS_SCALE,
    safariAddressScale: CONFIG.workstation.SAFARI_ADDRESS_SCALE,
    safariBottomSafeArea: CONFIG.workstation.SAFARI_BOTTOM_SAFE_AREA,
  },
  sceneFraming: {
    cameraEnd: CONFIG.workstation.CAMERA_END,
    cameraTarget: CONFIG.workstation.CAMERA_TARGET,
    cameraCurve: CONFIG.workstation.CAMERA_CURVE,
    arcStart: CONFIG.workstation.CAMERA_ARC_START,
    maxZoomOut: CONFIG.workstation.CAMERA_MAX_ZOOM_OUT,
  },
  lighting: { mode: CONFIG.workstation.LIGHTING_MODE, windowLight: CONFIG.workstation.WINDOW_LIGHT, lampLight: CONFIG.workstation.LAMP_LIGHT, fillLight: CONFIG.workstation.FILL_LIGHT },
  pointerCamera: {
    enabled: CONFIG.pointerCamera.ENABLED,
    sensitivity: CONFIG.pointerCamera.SENSITIVITY,
    horizontalStrength: CONFIG.pointerCamera.HORIZONTAL_STRENGTH,
    verticalStrength: CONFIG.pointerCamera.VERTICAL_STRENGTH,
    focusDepth: CONFIG.pointerCamera.FOCUS_DEPTH,
    smoothTime: CONFIG.pointerCamera.SMOOTH_TIME,
    returnDuration: CONFIG.pointerCamera.RETURN_DURATION,
    deadzone: CONFIG.pointerCamera.DEADZONE,
    revealStart: CONFIG.pointerCamera.REVEAL_START,
    revealFull: CONFIG.pointerCamera.REVEAL_FULL,
    scrollAttenuation: CONFIG.pointerCamera.SCROLL_ATTENUATION,
  },
  headerExclusion: { strength: 1, threshold: 0.05, softness: 0.15 },
  workstation: {
    monitorPosition: CONFIG.workstation.MONITOR_POSITION,
    cabinetPosition: CONFIG.workstation.CABINET_POSITION,
    mousePosition: CONFIG.workstation.MOUSE_POSITION,
    controllerPosition: CONFIG.workstation.CONTROLLER_POSITION,
    lampPosition: CONFIG.workstation.LAMP_POSITION,
    windowPosition: CONFIG.workstation.WINDOW_POSITION,
    portraitArtworkPosition: CONFIG.workstation.ARTWORK_PORTRAIT_POSITION,
    ronaldoArtworkPosition: CONFIG.workstation.ARTWORK_RONALDO_POSITION,
    skateboardPosition: CONFIG.workstation.SKATEBOARD_POSITION,
    plantPosition: CONFIG.workstation.PLANT_POSITION,
    polaroidsPosition: CONFIG.workstation.POLAROIDS_POSITION,
    energyCanPosition: CONFIG.workstation.ENERGY_CAN_POSITION,
    leftSpeakerPosition: CONFIG.workstation.LEFT_SPEAKER_POSITION,
    rightSpeakerPosition: CONFIG.workstation.RIGHT_SPEAKER_POSITION,
    featuredRecordPosition: CONFIG.workstation.FEATURED_RECORD_POSITION,
    sillBooksPosition: CONFIG.workstation.SILL_BOOKS_POSITION,
    monitorYaw: CONFIG.workstation.MONITOR_YAW,
    keyboardPosition: CONFIG.workstation.KEYBOARD_POSITION,
    keyboardRotation: CONFIG.workstation.KEYBOARD_ROTATION,
    keyboardScale: CONFIG.workstation.KEYBOARD_SCALE,
    turntablePosition: CONFIG.workstation.TURNTABLE_POSITION,
    turntableRotation: CONFIG.workstation.TURNTABLE_ROTATION,
    turntableScale: CONFIG.workstation.TURNTABLE_SCALE,
    deskPosition: CONFIG.workstation.DESK_POSITION,
    deskScale: CONFIG.workstation.DESK_SCALE,
  },
};
