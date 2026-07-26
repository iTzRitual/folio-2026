import { CONFIG } from "@/config/constants";
import {
    experienceData,
    projectsData,
    educationData,
    skillsData,
    bioData,
} from "@/data/content";
import { calculateHeroSafeZone } from "./heroSafeZone";

export type DetailsColumn = "left" | "right";

export interface DetailsSectionSpec {
    key: string;
    lineCount: number;
    column: DetailsColumn;
}

export interface DetailsSectionOffsets {
    headingY: number;
    bodyY: number;
}

export interface DetailsLayout {
    headingFontSize: number;
    bodyFontSize: number;
    bodyLineHeight: number;
    bodyTopOffset: number;
    sections: Record<string, DetailsSectionOffsets>;
    contentHeight: number;
    usableHeight: number;
    overflow: number;
}

interface DetailsLayoutInput {
    viewportWidth: number;
    viewportHeight: number;
    sections?: readonly DetailsSectionSpec[];
}

export const DETAILS_SECTIONS: readonly DetailsSectionSpec[] = [
    { key: "experience", lineCount: experienceData.length, column: "left" },
    { key: "projects", lineCount: projectsData.length, column: "left" },
    { key: "education", lineCount: educationData.length, column: "left" },
    { key: "bio", lineCount: bioData.length, column: "left" },
    { key: "skills", lineCount: skillsData.length, column: "right" },
];

export function calculateDetailsLayout({
    viewportWidth,
    viewportHeight,
    sections = DETAILS_SECTIONS,
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

    const cursors: Record<DetailsColumn, number> = { left: 0, right: 0 };
    const offsets: Record<string, DetailsSectionOffsets> = {};

    for (const section of sections) {
        const top = cursors[section.column];
        offsets[section.key] = { headingY: top, bodyY: top + bodyTopOffset };

        const height = Math.max(
            headingFontSize,
            bodyTopOffset + section.lineCount * bodyLineHeight,
        );
        cursors[section.column] = top + height + sectionGap;
    }

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
        sections: offsets,
        contentHeight,
        usableHeight,
        overflow: Math.max(0, contentHeight - usableHeight),
    };
}

export function calculateDetailsOverflowViewports({
    viewportWidth,
    viewportHeight,
}: Omit<DetailsLayoutInput, "sections">): number {
    if (viewportHeight <= 0) return 0;

    const { overflow } = calculateDetailsLayout({ viewportWidth, viewportHeight });
    return overflow / viewportHeight;
}
