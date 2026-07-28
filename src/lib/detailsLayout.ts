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
    projectLineHeight: number;
    bodyTopOffset: number;
    bodyColumnOffset: number;
    bodyMaxWidth: number;
    bioLines: string[];
    bioImageWidth: number;
    bioImageHeight: number;
    bioTextOffset: number;
    bioTextMaxWidth: number;
    modelGapCenterPx: number;
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
    bio: "About me",
    skills: "Skills",
} as const;

const STACKED_SECTIONS = ["experience", "projects", "education"] as const;

export const DETAILS_SECTION_KEYS = [
    ...STACKED_SECTIONS,
    "bio",
    "skills",
] as const;

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
    const projectLineHeight = bodyLineHeight * L.PROJECT_ROW_PITCH_MULT;
    const bodyTopOffset = headingFontSize * L.BODY_TOP_OFFSET_MULT;
    const sectionGap = headingFontSize * L.SECTION_GAP_MULT;

    const widestHeading = STACKED_SECTIONS.reduce(
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

    const bioImageWidth = contentWidth * L.BIO_IMAGE_WIDTH_MULT;
    const bioImageHeight = bioImageWidth * L.BIO_IMAGE_ASPECT;
    const bioTextOffset = bioImageWidth + viewportWidth * L.BIO_COLUMN_GAP_MULT;
    const bioTextMaxWidth = contentWidth - bioTextOffset;

    const bioLines = wrapParagraphs(
        bioVariants[bioVariant],
        bioTextMaxWidth,
        bodyFontSize,
        L.LETTER_SPACING,
        fontsReady,
    );

    const widestProject = projectsData.reduce(
        (max, project) =>
            Math.max(
                max,
                measureTextWidth(
                    project.name,
                    bodyFontSize,
                    L.LETTER_SPACING,
                    fontsReady,
                ),
            ),
        0,
    );

    const widestSkill = skillsData.reduce(
        (max, skill) =>
            Math.max(
                max,
                measureTextWidth(skill, bodyFontSize, L.LETTER_SPACING, fontsReady),
            ),
        0,
    );

    const linkArrowWidth =
        bodyFontSize * (CONFIG.detailsLink.ARROW_GAP_MULT + CONFIG.detailsLink.ARROW_SIZE_MULT);
    const buttonPadWidth = bodyFontSize * CONFIG.detailsLink.BUTTON_PAD_X_EM * 2;
    const projectsRightEdge =
        marginX + bodyColumnOffset + widestProject + linkArrowWidth + buttonPadWidth;
    const skillsLeftEdge = viewportWidth - marginX - widestSkill;
    const modelGapCenterPx = (projectsRightEdge + skillsLeftEdge) / 2;

    const lineCounts: Record<string, number> = {
        experience: experienceData.length,
        projects: projectsData.length,
        education: educationData.length,
        skills: skillsData.length,
    };

    const lineHeights: Record<string, number> = {
        experience: bodyLineHeight,
        projects: projectLineHeight,
        education: bodyLineHeight,
        skills: bodyLineHeight,
    };

    const cursors: Record<DetailsColumn, number> = { left: 0, right: 0 };
    const offsets: Record<string, DetailsSectionOffsets> = {};

    const place = (key: string, column: DetailsColumn) => {
        const top = cursors[column];
        offsets[key] = { headingY: top, bodyY: top + bodyTopOffset };

        const height = Math.max(
            headingFontSize,
            bodyTopOffset + lineCounts[key] * lineHeights[key],
        );
        cursors[column] = top + height + sectionGap;
    };

    for (const key of STACKED_SECTIONS) place(key, "left");
    place("skills", "right");

    const topInset =
        viewportHeight * -L.TARGET_BASE_Y_MULT + marginY * L.SECTION_TOP_OFF_MULT;
    const bottomInset = marginY * L.SECTION_TOP_OFF_MULT;
    const usableHeight = Math.max(0, viewportHeight - topInset - bottomInset);

    const detailsHeight = Math.max(
        0,
        Math.max(cursors.left, cursors.right) - sectionGap,
    );
    const detailsOverflow = Math.max(0, detailsHeight - usableHeight);

    const bioTopY = detailsOverflow + viewportHeight;
    const bioTextY = bioTopY + headingFontSize * L.BIO_CONTENT_TOP_MULT;
    offsets.bio = { headingY: bioTopY, bodyY: bioTextY };

    const bioHeight = Math.max(
        bioImageHeight,
        bioTextY - bioTopY + bioLines.length * bodyLineHeight,
    );
    const bioOverflow = Math.max(0, bioHeight - usableHeight);

    const contentHeight = bioTopY + bioHeight;
    const overflow = bioTopY + bioOverflow;

    return {
        headingFontSize,
        bodyFontSize,
        bodyLineHeight,
        projectLineHeight,
        bodyTopOffset,
        bodyColumnOffset,
        bodyMaxWidth,
        bioLines,
        bioImageWidth,
        bioImageHeight,
        bioTextOffset,
        bioTextMaxWidth,
        modelGapCenterPx,
        sections: offsets,
        contentHeight,
        usableHeight,
        overflow,
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
