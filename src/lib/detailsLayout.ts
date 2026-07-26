import { CONFIG } from "@/config/constants";
import {
    experienceData,
    projectsData,
    educationData,
    skillsData,
    bioVariants,
    DEFAULT_BIO_VARIANT,
    type BioVariant,
} from "@/data/content";
import { calculateHeroSafeZone } from "./heroSafeZone";
import { measureTextWidth, wrapParagraphs } from "./textMetrics";

export type DetailsColumn = "left" | "right";

export interface DetailsSectionOffsets {
    headingY: number;
    bodyY: number;
}

export interface DetailsLayout {
    headingFontSize: number;
    bodyFontSize: number;
    bodyLineHeight: number;
    bodyTopOffset: number;
    bodyColumnOffset: number;
    bodyMaxWidth: number;
    bioLines: string[];
    sections: Record<string, DetailsSectionOffsets>;
    contentHeight: number;
    usableHeight: number;
    overflow: number;
}

interface DetailsLayoutInput {
    viewportWidth: number;
    viewportHeight: number;
    bioVariant?: BioVariant;
    fontsReady?: boolean;
}

export const SECTION_HEADINGS = {
    experience: "Experience",
    projects: "Featured Projects",
    education: "Education",
    bio: "Bio",
    skills: "Skills",
} as const;

const LEFT_COLUMN = ["experience", "projects", "education", "bio"] as const;

export const DETAILS_SECTION_KEYS = [...LEFT_COLUMN, "skills"] as const;

export function calculateDetailsLayout({
    viewportWidth,
    viewportHeight,
    bioVariant = DEFAULT_BIO_VARIANT,
    fontsReady = false,
}: DetailsLayoutInput): DetailsLayout {
    const { marginX, marginY } = calculateHeroSafeZone({
        viewportWidth,
        viewportHeight,
    });

    const L = CONFIG.detailsLayout;
    const contentWidth = viewportWidth - marginX * 2;

    const headingFontSize = Math.min(
        Math.max(contentWidth * L.HEADING_SIZE_MULT, L.HEADING_MIN_PX),
        L.HEADING_MAX_PX,
    );
    const bodyFontSize = headingFontSize * L.BODY_SIZE_MULT;
    const bodyLineHeight = bodyFontSize * L.BODY_LINE_HEIGHT_MULT;
    const bodyTopOffset = headingFontSize * L.BODY_TOP_OFFSET_MULT;
    const sectionGap = headingFontSize * L.SECTION_GAP_MULT;

    const widestHeading = LEFT_COLUMN.reduce(
        (max, key) =>
            Math.max(
                max,
                measureTextWidth(
                    SECTION_HEADINGS[key],
                    headingFontSize,
                    L.LETTER_SPACING,
                    fontsReady,
                ),
            ),
        0,
    );

    const bodyColumnOffset = widestHeading + viewportWidth * L.GAP_MULT;
    const bodyMaxWidth = contentWidth - bodyColumnOffset;

    const bioLines = wrapParagraphs(
        bioVariants[bioVariant],
        bodyMaxWidth,
        bodyFontSize,
        L.LETTER_SPACING,
        fontsReady,
    );

    const lineCounts: Record<string, number> = {
        experience: experienceData.length,
        projects: projectsData.length,
        education: educationData.length,
        bio: bioLines.length,
        skills: skillsData.length,
    };

    const cursors: Record<DetailsColumn, number> = { left: 0, right: 0 };
    const offsets: Record<string, DetailsSectionOffsets> = {};

    const place = (key: string, column: DetailsColumn) => {
        const top = cursors[column];
        offsets[key] = { headingY: top, bodyY: top + bodyTopOffset };

        const height = Math.max(
            headingFontSize,
            bodyTopOffset + lineCounts[key] * bodyLineHeight,
        );
        cursors[column] = top + height + sectionGap;
    };

    for (const key of LEFT_COLUMN) place(key, "left");
    place("skills", "right");

    const contentHeight = Math.max(
        0,
        Math.max(cursors.left, cursors.right) - sectionGap,
    );

    const topInset =
        viewportHeight * -L.TARGET_BASE_Y_MULT + marginY * L.SECTION_TOP_OFF_MULT;
    const bottomInset = marginY * L.SECTION_TOP_OFF_MULT;
    const usableHeight = Math.max(0, viewportHeight - topInset - bottomInset);

    return {
        headingFontSize,
        bodyFontSize,
        bodyLineHeight,
        bodyTopOffset,
        bodyColumnOffset,
        bodyMaxWidth,
        bioLines,
        sections: offsets,
        contentHeight,
        usableHeight,
        overflow: Math.max(0, contentHeight - usableHeight),
    };
}

export function calculateDetailsOverflowViewports({
    viewportWidth,
    viewportHeight,
    bioVariant,
    fontsReady,
}: DetailsLayoutInput): number {
    if (viewportHeight <= 0) return 0;

    const { overflow } = calculateDetailsLayout({
        viewportWidth,
        viewportHeight,
        bioVariant,
        fontsReady,
    });
    return overflow / viewportHeight;
}
