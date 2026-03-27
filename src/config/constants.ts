export const THEME = {
    darkest: "#1D1D1D",
    dark: "#BCBCBC",
    light: "#D6D6D6",
    white: "#FFFFFF",
    selectionBg: "#E2E2E2",
    hint: "#A0A0A0",
    stacked: "#BEBEBE",
} as const;


export const FONTS = {
    karlaLight: "fonts/Karla-Light.ttf",
    karlaExtraBold: "fonts/Karla-ExtraBold.ttf",
} as const;

export const CONFIG = {
    loader: {
        REVEAL_DURATION: 0.5,
        ODOMETER_DURATION: 2,
    },
    model: {
        BASE_MODEL_Y: 0.1,
        INTERACTION_LOCK_EPSILON: 0.001,
        MODEL_UP_TRAVEL_FACTOR: 0.25,
        SCALE_OUT_START: 0.2,
        SCALE_OUT_END: 0.9,
        RETURN_TO_CENTER_SMOOTHNESS: 8,
        RETURN_VELOCITY_DAMPING: 10,
        RETURN_SNAP_EPSILON: 0.002,
        DETAILS_POPUP_START: 0.9,
        DETAILS_POPUP_END: 1.0,
        DETAILS_POPUP_SCALE: 0.6,
        DETAILS_POPUP_X_FACTOR: 0.13,
        DETAILS_POPUP_Y_SECTION_OFFSET: 1.1,
    },
    heroText: {
        LABEL_EXIT_START: 0.001,
        LABEL_EXIT_END: 0.08,
    },
    title: {
        TARGET_SCALE: 0.75,
        HINT_SCROLL_HIDE_EPSILON: 0.0005,
        HINT_SCROLL_SHOW_EPSILON: 0.0001,
        STACKED_FADE_START: 0.12,
        VISUAL_FONT_CORRECTION_X: 0.05,
        // timings
        DELAY_FIRST_RUN: 2.5,
        DURATION_FIRST_RUN: 1.5,
        FADE_DURATION_FIRST_RUN: 1.2,
        FADE_POSITION_FIRST_RUN: 0.8,
    },
    customAberration: {
        COLUMNS: 40.0,
    },
} as const;
