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
        // Below this scale the skull covers too few pixels for the refraction
        // buffer to be worth a second render of the whole scene.
        TRANSMISSION_MIN_SCALE: 0.02,
        TRANSMISSION_RESOLUTION: 256,
        TRANSMISSION_RESOLUTION_MOBILE: 128,
        TRANSMISSION_SAMPLES: 4,
        TRANSMISSION_SAMPLES_MOBILE: 2,
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
        HEADING_LINE_HEIGHT_MULT: 1.1,
        BODY_LINE_HEIGHT_MULT: 1.5,
        PROJECT_ROW_PITCH_MULT: 2.25,
        LETTER_SPACING: -0.03,
        // Pixels the sheet has to travel before the pointer intersection is
        // re-run, so hover follows the content under a stationary cursor.
        POINTER_SYNC_PX: 0.5,
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
        EDGE_FADE_TOP_MULT: 0.85,
        EDGE_FADE_BOTTOM_MULT: 0.14,
        EDGE_FADE_CUT_MULT: 0.25,
        EDGE_FADE_RENDER_ORDER: 20,
        ABOVE_EDGE_FADE_RENDER_ORDER: 30,
        GLYPH_DETAIL: 3,
        ARROW_SEGMENTS: 4,
        IMAGE_SEGMENTS: 24,
    },
    projectPreview: {
        // The screenshots are 1600x1000.
        ASPECT: 1.6,
        // Plate width as a fraction of the viewport's.
        WIDTH_FRACTION: 0.28,
        CORNER_RADIUS_MULT: 0.05,
        // Crossing a row boundary fires leave before enter. Waiting this long
        // before dropping the hover keeps the list one continuous region, so
        // sweeping down it swaps the screenshot instead of replaying the
        // entrance.
        HOVER_GRACE_MS: 90,
        // Damping the plate chases the pointer with. High enough that it reads
        // as sitting on the cursor; the lag it does keep is what the bend is
        // measured from.
        FOLLOW_SMOOTHING: 22,
        // Grid the two-axis trailing-centre bend is sampled over.
        BEND_SEGMENTS_X: 32,
        // Also what the fold is rolled over, so the plate needs rows the way
        // the details sheet does.
        BEND_SEGMENTS_Y: 28,
        // Peak lag of the plate's centre, as a fraction of its own span.
        BEND_MULT: 0.275,
        // Peak per-channel UV split, in texture units.
        ABERRATION_MULT: 0.06,
        // Pointer speed (in normalised units per second) that saturates both.
        VELOCITY_FULL_SCALE: 2.6,
        VELOCITY_SMOOTHING: 11,
        // Horizontal bands the glitch slices the plate into, and reveals it in.
        GLITCH_BANDS: 18,
        // Peak horizontal slice offset, in texture units.
        GLITCH_SLICE: 0.07,
        // Spare plate past each edge, as a fraction of the plate's own span. A
        // sliced band carries the plate's edge with it and the channel split
        // carries it further, and this is the room they have to land outside
        // the frame in. Wider than tall: only the slice travels sideways.
        GLITCH_BLEED: [0.22, 0.09] as [number, number],
        // How far into that room a torn band stays solid before it dissolves,
        // so nothing is ever cut square at the mesh's own edge.
        GLITCH_BLEED_SOLID: 0.25,
        // Peak channel split the glitch adds on top of the travel's own.
        GLITCH_SPLIT: 0.018,
        // Times a second the slice pattern reshuffles.
        GLITCH_HZ: 12,
        ENTER_REVEAL_DURATION: 0.26,
        ENTER_GLITCH_DURATION: 0.42,
        ENTER_SCALE_FROM: 0.94,
        ENTER_SCALE_DURATION: 0.3,
        EXIT_REVEAL_DURATION: 0.16,
        EXIT_GLITCH_DURATION: 0.12,
        EXIT_SCALE_TO: 0.97,
        SWAP_GLITCH_DURATION: 0.22,
        // Over the details content, so the plate covers the buttons, but under
        // the edge fade, which is what darkens it at both ends.
        RENDER_ORDER: 15,
        REST_GLITCH: 0.38,
        REST_ABERRATION: 0.012,
        TUNE_SATURATION: [0.3, 1.15] as [number, number],
        TUNE_CONTRAST: [0.82, 1.1] as [number, number],
        TUNE_BRIGHTNESS: [0.82, 1.12] as [number, number],
        CHARGE_SCALE_GAIN: 0.02,
        // The caption is its own mesh, sharing the plate's geometry so it bends
        // and curls identically, but skipping the glitch so it stays readable.
        // Fractions of the plate, which keeps it resolution-independent.
        CAPTION_TEXTURE_WIDTH: 1024,
        CAPTION_FONT_FRACTION: 13 / 360,
        CAPTION_PAD_X_FRACTION: 16 / 360,
        CAPTION_BASELINE_FRACTION: 0.17,
        CAPTION_BAR_FRACTION: 2 / 225,
        CAPTION_BAR_GAP_FRACTION: 6 / 225,
        CAPTION_LEAD: "Click for case study",
        CAPTION_TRAIL: "Hold for live site",
    },
    caseStudy: {
        // Where R3F parks its default camera, and the only place anything else
        // in the scene expects it to be. Every distance below is measured from
        // here, so the flight has to end by putting it back.
        CAMERA_REST_Z: 5,
        // Fraction of the landed frame's width the plate spans. Below ~0.8 the
        // frame still reads as a page with margins rather than as a fullscreen
        // image, which is what keeps the copy underneath feeling attached.
        FILL: 0.72,
        // How far above the landed frame's centre the plate settles, in frame
        // heights. Just enough that the gap under it does not look like an
        // accident before the copy arrives in it.
        PLATE_OFFSET: 0.03,
        FLIGHT_DURATION: 0.95,
        // Shorter on the way out: the list is a place the viewer already knows,
        // so returning to it does not have to be shown at the same length.
        CLOSE_DURATION: 0.71,
        // The list is what the camera flies past, so it has to be gone before
        // the frame is small enough to show how magnified it has become.
        LIST_DIM_START: 0.2,
        LIST_DIM_SPAN: 0.35,
        // The model hangs at CONFIG.model.DEPTH_Z, in front of the sheet and so
        // in front of the plate — the camera flies straight through it. It has
        // to leave faster than the list does: its magnification climbs as the
        // camera closes on it, and only a ramp this short outruns that.
        MODEL_EXIT_SPAN: 0.25,
        // The copy only starts once the frame has almost stopped moving; a
        // stagger read against a travelling camera reads as drift.
        COPY_START: 0.72,
        COPY_RAMP: 0.28,
        COPY_REVEAL_SPAN: 0.5,
        COPY_REVEAL_STAGGER: 0.12,
        // Rise per line before it lands, in that line's own em.
        COPY_REVEAL_RISE: 0.6,
        // Body size and measure, as fractions of the landed frame's width.
        EM_MULT: 0.019,
        TEXT_WIDTH_MULT: 0.62,
        // Gap between the plate's bottom edge and the first line, in frame
        // heights.
        COPY_GAP_MULT: 0.085,
        TITLE_SIZE_EM: 2.3,
        TITLE_LINE_HEIGHT: 1.08,
        META_SIZE_EM: 0.78,
        META_LINE_HEIGHT: 1.4,
        // The metadata line is one breath, so it is allowed past the measure
        // the prose is set to rather than wrapping in the middle of a stack.
        META_WIDTH_MULT: 1.4,
        LEDE_SIZE_EM: 1.28,
        LEDE_LINE_HEIGHT: 1.35,
        BODY_LINE_HEIGHT: 1.62,
        GAP_AFTER_TITLE_EM: 0.55,
        GAP_AFTER_META_EM: 1.5,
        GAP_AFTER_LEDE_EM: 1.1,
        GAP_AFTER_PARAGRAPH_EM: 0.9,
        // Wheel travel is read in frame heights so a flick moves the copy the
        // same distance whatever the window is.
        SCROLL_DAMPING: 9,
        // Room past the last line, so it does not end flush with the frame's
        // bottom edge.
        SCROLL_OVERSHOOT_MULT: 0.15,
        // Above the edge fade, which is faded out from under the case study
        // rather than drawn over it.
        RENDER_ORDER: 40,
    },
    projectGesture: {
        PRESS_SCALE: 0.97,
        PRESS_DURATION: 0.12,
        CHARGE_DELAY: 0.15,
        CHARGE_DURATION: 0.5,
        REWIND_DURATION: 0.18,
    },
    detailsLink: {
        ARROW_SIZE_MULT: 0.4,
        ARROW_GAP_MULT: 0.3,
        ARROW_NUDGE_FACTOR: 0.25,
        ARROW_DURATION: 0.2,
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
        FONT_SIZE: 0.0105,
        MARGIN_Y_PX: 28,
        HTML_Z_INDEX: 16777271,
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
        SCROLL_TAPS_MIN: 3,
        // Device pixels the pass can cover at full tap count. Above this the
        // taps are scaled down, since each one costs three dependent fetches
        // over the entire screen.
        SCROLL_TAP_PIXEL_BUDGET: 2_500_000,
        // Ceiling PerformanceMonitor raises DPR to. Budgeting against it keeps
        // the tap count stable while the monitor adapts, so a DPR change never
        // forces a shader recompile.
        SCROLL_TAP_DPR_CEILING: 1.5,
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
    themeSweep: {
        DURATION: 0.62,
        AXIS: [-0.85, -0.53] as [number, number],
        SOFTNESS: 0.19,
        PLANE_Z: -4,
    },
} as const;
