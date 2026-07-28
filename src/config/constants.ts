export const THEMES = {
    Dark: {
        bg: "#1D1D1D",
        textPrimary: "#FFFFFF",
        textSecondary: "#BCBCBC",
        textBody: "#D6D6D6",
        textHint: "#A0A0A0",
        textStacked: "#BEBEBE",
        hover: "#FFFFFF",
    },
    Light: {
        bg: "#E9E9E9",
        textPrimary: "#141414",
        textSecondary: "#4A4A4A",
        textBody: "#333333",
        textHint: "#5F5F5F",
        textStacked: "#484848",
        hover: "#000000",
    },
} as const;

export type Palette = (typeof THEMES)[keyof typeof THEMES];


export const FONTS = {
    karlaLight: "fonts/Karla-Light.ttf",
    karlaExtraBold: "fonts/Karla-ExtraBold.ttf",
} as const;

const SCROLL_TIMELINE_VIEWPORTS = 1.5;

export const CONFIG = {
    scene: {
        DETAILS_GROUP_Z: -0.05,
    },
    scrollTimeline: {
        VIEWPORTS: SCROLL_TIMELINE_VIEWPORTS,
    },
    loader: {
        REVEAL_DURATION: 0.5,
        ODOMETER_DURATION: 2,
        ODOMETER_DURATION_REPEAT: 0.5,
    },
    model: {
        BASE_MODEL_Y: 0.1,
        INTERACTION_LOCK_EPSILON: 0.07,
        MODEL_UP_TRAVEL_FACTOR: 0.25,
        SCALE_OUT_START: 0.2,
        SCALE_OUT_END: 0.9,
        RETURN_TO_CENTER_SMOOTHNESS: 8,
        RETURN_VELOCITY_DAMPING: 10,
        RETURN_SNAP_EPSILON: 0.0025,
        DETAILS_POPUP_START: 0.9,
        DETAILS_POPUP_SCALE: 0.6,
        FOLD_FADE_CLEARANCE_MULT: 0.03,
        FOLD_FADE_SPAN_MULT: 0.14,
        POPUP_RAMP_SPAN: 0.1,
        IDLE_ROTATION_SPEED_Z: 1.2,
        IDLE_ROTATION_SPEED_X_MAG: 0.2,
        IDLE_ROTATION_SPEED_Y_MAG: 0.1,
        IDLE_ROTATION_SPEED: 2,
        DEPTH_Z: 2,
    },
    detailsLayout: {
        HEADING_SIZE_MULT: 0.03,
        HEADING_MIN_PX: 26,
        HEADING_MAX_PX: 72,
        BODY_SIZE_MULT: 0.5,
        SECTION_TRAVEL_MULT: 1.16,
        TARGET_BASE_Y_MULT: -0.25,
        SECTION_TOP_OFF_MULT: 0.35,
        SECTION_GAP_MULT: 2.4,
        RIGHT_TITLE_OFFSET_MULT: 0.2,
        GAP_MULT: 0.08,
        BODY_TOP_OFFSET_MULT: 0.38,
        BODY_LINE_HEIGHT_MULT: 1.5,
        PROJECT_ROW_PITCH_MULT: 2.25,
        LETTER_SPACING: -0.03,
        REVEAL_MARGIN_MULT: 0.04,
        BIO_IMAGE_WIDTH_MULT: 0.26,
        BIO_IMAGE_ASPECT: 2000 / 1500,
        BIO_CONTENT_TOP_MULT: 1.75,
        BIO_COLUMN_GAP_MULT: 0.04,
        BIO_REVEAL_LINES: 9,
        BIO_REVEAL_BLOCK_Z: 0.02,
        BIO_REVEAL_BLOCK_OVERHANG: 1.1,
        BIO_REVEAL_BLOCK_RADIUS_PX: 8,
    },
    detailsReveal: {
        BLOCK_WIDTH_MULT: 1.01,
        BLOCK_HEIGHT_MULT: 1.1,
        BLOCK_RADIUS_PX: 8,
        BLOCK_SEGMENTS: 6,
        BLOCK_Z: 0.002,
        BUTTON_Z: -0.002,
        BUTTON_SEGMENTS: 24,
    },
    detailsCurl: {
        FOLD_OFFSET_MULT: 0,
        BOTTOM_OFFSET_MULT: 0,
        RADIUS_MULT: 0.085,
        MAX_ANGLE: 1.5,
        FADE_ANGLE_START: 0.15,
        FADE_ANGLE_END: 1.25,
        SHADE_STRENGTH: 1,
        SHADE_SPAN_MULT: 0.85,
        SHADE_MODE: 1,
        GLYPH_DETAIL: 3,
        ARROW_SEGMENTS: 4,
        IMAGE_SEGMENTS: 24,
    },
    projectPreview: {
        // "morph": the skull flattens into the screenshot plate.
        // "scale": the skull scales out while the plate scales in.
        MODE: "morph" as "morph" | "scale",
        ASPECT: 1.6,
        // Thickness the flattened glass plate keeps, in geometry-local units.
        SLAB_THICKNESS: 0.05,
        // Gap between the glass plate's front face and the image, so the
        // screenshot never z-fights the refraction.
        IMAGE_GAP: 0.06,
        // Final size of both the plate and the screenshot on it, relative to
        // the skull's own footprint.
        SIZE_MULT: 1.75,
        // Morph progress at which the plate starts growing into SIZE_MULT, so
        // the skull flattens first and only swells once it is nearly a plate.
        // The screenshot fades in over the same range.
        GROW_START: 0.62,
        CORNER_RADIUS_MULT: 0.05,
        MORPH_IN_DURATION: 0.7,
        MORPH_OUT_DURATION: 0.45,
        SCALE_SKULL_OUT_DURATION: 0.22,
        SCALE_PLANE_IN_DURATION: 0.3,
        SCALE_PLANE_IN_DELAY: 0.11,
        SCALE_PLANE_OUT_DURATION: 0.18,
        SCALE_SKULL_IN_DURATION: 0.3,
        SCALE_SKULL_IN_DELAY: 0.09,
        // Crossing a row boundary fires leave before enter. Waiting this long
        // before dropping the hover keeps the list one continuous region, so
        // sweeping down it swaps the screenshot instead of re-morphing.
        HOVER_GRACE_MS: 90,
        // Cross-plate segments the trailing-centre bend is sampled over.
        BEND_SEGMENTS: 48,
        // Peak lag of the plate's centre, as a fraction of its height.
        BEND_MULT: 0.275,
        // Peak per-channel UV split, in texture units.
        ABERRATION_MULT: 0.06,
        // Pointer speed (in normalised units per second) that saturates both.
        VELOCITY_FULL_SCALE: 2.6,
        VELOCITY_SMOOTHING: 11,
    },
    detailsLink: {
        ARROW_SIZE_MULT: 0.4,
        ARROW_GAP_MULT: 0.3,
        ARROW_NUDGE_FACTOR: 0.25,
        ARROW_DURATION: 0.2,
        PREVIEW_MIN_OPACITY: 0.6,
        INTERACT_MIN_OPACITY: 0.05,
        BUTTON_TEXT_FADE_POWER: 0.5,
        BUTTON_PAD_X_EM: 0.8,
        BUTTON_PAD_Y_EM: 0.78,
    },
    detailsTimings: {
        HEADING_DELAY: 0.1,
        BODY_DELAY: 0.18,
        BODY_STAGGER_STEP: 0.07,
        SKILLS_STAGGER_STEP: 0.06,
    },
    header: {
        FONT_SIZE: 0.0075,
        MARGIN_Y_PX: 28,
        LETTER_SPACING: -0.02,
        HTML_LETTER_SPACING_OFFSET: -0.004,
        SLOT_TS: [0, 0.2, 0.56, 0.75, 1],
        SEGMENT_GAP_EM: 0.45,
        HIT_PAD_EM: 0.6,
        HOVER_DURATION: 0.15,
        REVEAL_DELAY: 0.35,
        REVEAL_STAGGER: 0.07,
        FADE_DURATION: 0.6,
    },
    heroText: {
        LABEL_EXIT_START: 0.05,
        LABEL_EXIT_END: 0.1,
    },
    title: {
        TARGET_SCALE: 0.75,
        HINT_SCROLL_HIDE_EPSILON: 0.0005,
        HINT_SCROLL_SHOW_EPSILON: 0.0001,
        STACKED_FADE_START: 0.12,
        VISUAL_FONT_CORRECTION_X: 0.05,
        DELAY_FIRST_RUN: 2.5,
        DELAY_REPEAT: 0.8,
        DURATION_FIRST_RUN: 1.5,
        FADE_DURATION_FIRST_RUN: 1.2,
        FADE_POSITION_FIRST_RUN: 0.8,
    },
    customAberration: {
        COLUMNS: 40.0,
        LERP_FACTOR_MULT: 9.75,
        INTENSITY_LERP_MULT: 3.0,
        INTENSITY_MIN: 0.005,
        SAFE_DELTA_MIN: 0.0001,
        VEL_MULT: 0.016666,
        SCROLL_TAPS: 8,
        SCROLL_BLUR: 0.022,
        SCROLL_SPLIT: 0.04,
        SCROLL_VEL_SCALE: 20.0,
        SCROLL_VEL_CLAMP: 1.0,
        SCROLL_ATTACK_MULT: 30.0,
        SCROLL_RELEASE_MULT: 14.0,
        SCROLL_MIN: 0.004,
        SCROLL_VIGNETTE_X_WEIGHT: 0.5,
        SCROLL_VIGNETTE_FLOOR: 0.35,
        SCROLL_VIGNETTE_INNER: 0.15,
        SCROLL_VIGNETTE_OUTER: 0.5,
    },
    heroLayout: {
        TITLE_Y_MULTIPLIER: 0.7,
        HERO_Y_MULTIPLIER: 1.05,
        SUBTITLE_Y_MULTIPLIER: 0.22,
        SUBTITLE_PROGRESS_POWER: 1.05,
        TITLE_FONT_SIZE: 0.127,
        TITLE_FONT_VISUAL_OFFSET: 0.14,
        SUBTITLE_FONT_SIZE: 0.03025,
        PROFESSION_FONT_SIZE: 0.02,
        PROFESSION_PADDING_Y: 8,
        PROFESSION_LINE_THICKNESS: 1,
        PROFESSION_LINE_WIDTH: 0.9,
        PROFESSION_EXIT_DISTANCE: 0.14,
    },
    professionLabel: {
        LINE_DELAY: 1.5,
        ALPHA_MULTIPLIER: 0.4,
        LETTER_SPACING: -0.02,
        DELAY: 0.2,
    },
    subtitle: {
        OUTLINE_WIDTH: 0.001,
        LETTER_SPACING: -0.03,
        DELAY: 0.1,
    },
    copy: {
        STAGGER: 0.15,
        DURATION: 0.75,
        LINE_THRESHOLD: 0.1,
    },
} as const;
