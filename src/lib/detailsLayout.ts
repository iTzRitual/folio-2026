import { CONFIG } from "@/config/constants";
import {
    experienceData,
    projectsData,
    educationData,
    coursesData,
    skillsData,
    bioVariants,
    DEFAULT_BIO_VARIANT,
    type BioVariant,
} from "@/data/content";
import { calculateHeroSafeZone } from "./heroSafeZone";
import { measureTextWidth, wrapParagraphs, wrapText } from "./textMetrics";
import {
    calculateSceneLayoutCapabilities,
    type SceneLayoutMode,
} from "./responsiveScene";

export type DetailsColumn = "left" | "right";

export interface DetailsSectionOffsets {
    headingY: number;
    bodyY: number;
    bottomY: number;
}

export interface DetailsLayout {
    layoutMode: SceneLayoutMode;
    compactHeight: boolean;
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
    bioImageXOffset: number;
    bioImageY: number;
    bioTextOffset: number;
    bioTextMaxWidth: number;
    modelGapCenterPx: number;
    modelAnchorY: number;
    modelInterludeHeight: number;
    skillsColumns: number;
    skillsColumnWidth: number;
    sectionLines: Record<string, string[]>;
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
    courses: "Courses\n& Certifications",
    bio: "About me",
    skills: "Skills",
} as const;

export function headingLines(heading: string): string[] {
    return heading.split("\n");
}

export function headingBlockHeight(
    heading: string,
    headingFontSize: number,
): number {
    const lines = headingLines(heading).length;
    return (
        headingFontSize *
        (1 +
            (lines - 1) * CONFIG.detailsLayout.HEADING_LINE_HEIGHT_MULT)
    );
}

const STACKED_SECTIONS = [
    "experience",
    "projects",
    "education",
    "courses",
] as const;

export const DETAILS_SECTION_KEYS = [
    ...STACKED_SECTIONS,
    "bio",
    "skills",
] as const;

function calculateWideDetailsLayout({
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
            headingLines(SECTION_HEADINGS[key]).reduce(
                (lineMax, line) =>
                    Math.max(
                        lineMax,
                        measureTextWidth(
                            line,
                            headingFontSize,
                            L.LETTER_SPACING,
                            fontsReady,
                        ),
                    ),
                max,
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
        courses: coursesData.length,
        skills: skillsData.length,
    };

    const lineHeights: Record<string, number> = {
        experience: bodyLineHeight,
        projects: projectLineHeight,
        education: bodyLineHeight,
        courses: bodyLineHeight,
        skills: bodyLineHeight,
    };

    const cursors: Record<DetailsColumn, number> = { left: 0, right: 0 };
    const offsets: Record<string, DetailsSectionOffsets> = {};

    const place = (key: string, column: DetailsColumn) => {
        const top = cursors[column];
        const headingHeight = headingBlockHeight(
            SECTION_HEADINGS[key as keyof typeof SECTION_HEADINGS],
            headingFontSize,
        );
        const height = Math.max(
            headingHeight,
            bodyTopOffset + lineCounts[key] * lineHeights[key],
        );
        const inkHeight = Math.max(
            headingHeight,
            bodyTopOffset +
                (lineCounts[key] - 1) * lineHeights[key] +
                bodyLineHeight,
        );

        offsets[key] = {
            headingY: top,
            bodyY: top + bodyTopOffset,
            bottomY: top + inkHeight,
        };
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

    const bioHeight = Math.max(
        bioImageHeight,
        bioTextY - bioTopY + bioLines.length * bodyLineHeight,
    );
    offsets.bio = {
        headingY: bioTopY,
        bodyY: bioTextY,
        bottomY: bioTopY + bioHeight,
    };
    const bioOverflow = Math.max(0, bioHeight - usableHeight);

    const contentHeight = bioTopY + bioHeight;
    const overflow = bioTopY + bioOverflow;

    return {
        layoutMode: "wide",
        compactHeight: false,
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
        bioImageXOffset: 0,
        bioImageY: bioTopY,
        bioTextOffset,
        bioTextMaxWidth,
        modelGapCenterPx,
        modelAnchorY:
            offsets.projects.bodyY +
            (projectsData.length * projectLineHeight) / 2,
        modelInterludeHeight: 0,
        skillsColumns: 1,
        skillsColumnWidth: bodyMaxWidth,
        sectionLines: {
            experience: experienceData.map(
                (exp) => `${exp.duration} / ${exp.position} @ ${exp.company}`,
            ),
            projects: projectsData.map((project) => project.name),
            education: educationData.map(
                (edu) => `${edu.field} (${edu.degree}) @ ${edu.institution}`,
            ),
            courses: coursesData.map(
                (course) =>
                    `${course.date} / ${course.title} @ ${course.issuer}`,
            ),
            skills: [...skillsData],
        },
        sections: offsets,
        contentHeight,
        usableHeight,
        overflow,
    };
}

function calculateNarrowDetailsLayout({
    viewportWidth,
    viewportHeight,
    bioVariant = DEFAULT_BIO_VARIANT,
    fontsReady = false,
}: DetailsLayoutInput): DetailsLayout {
    const { compactHeight } = calculateSceneLayoutCapabilities(
        viewportWidth,
        viewportHeight,
    );
    const { marginX, marginY } = calculateHeroSafeZone({
        viewportWidth,
        viewportHeight,
    });
    const L = CONFIG.detailsLayout;
    const contentWidth = Math.max(0, viewportWidth - marginX * 2);
    const headingFontSize = Math.min(
        Math.max(
            contentWidth * L.NARROW_HEADING_SIZE_MULT,
            L.NARROW_HEADING_MIN_PX,
        ),
        compactHeight
            ? Math.min(L.NARROW_HEADING_MAX_PX, 34)
            : L.NARROW_HEADING_MAX_PX,
    );
    const bodyFontSize = Math.min(
        Math.max(
            headingFontSize * L.NARROW_BODY_SIZE_MULT,
            L.NARROW_BODY_MIN_PX,
        ),
        L.NARROW_BODY_MAX_PX,
    );
    const bodyLineHeight = bodyFontSize * L.NARROW_BODY_LINE_HEIGHT_MULT;
    const projectLineHeight = bodyLineHeight * L.PROJECT_ROW_PITCH_MULT;
    const bodyTopOffset = headingFontSize * L.NARROW_BODY_GAP_MULT;
    const sectionGap = headingFontSize * L.NARROW_SECTION_GAP_MULT;
    const skillsColumnGap = viewportWidth * L.NARROW_SKILLS_COLUMN_GAP_MULT;
    const widestSkill = skillsData.reduce(
        (max, skill) =>
            Math.max(
                max,
                measureTextWidth(
                    skill,
                    bodyFontSize,
                    L.LETTER_SPACING,
                    fontsReady,
                ),
            ),
        0,
    );
    const skillsColumns =
        widestSkill * 2 + skillsColumnGap <= contentWidth ? 2 : 1;
    const skillsColumnWidth =
        (contentWidth - skillsColumnGap * (skillsColumns - 1)) / skillsColumns;
    const wrapItems = (items: readonly string[]) =>
        items.flatMap((item) =>
            wrapText(
                item,
                contentWidth,
                bodyFontSize,
                L.LETTER_SPACING,
                fontsReady,
            ),
        );
    const sectionLines = {
        experience: wrapItems(
            experienceData.map(
                (exp) => `${exp.duration} / ${exp.position} @ ${exp.company}`,
            ),
        ),
        projects: projectsData.map((project) => project.title),
        education: wrapItems(
            educationData.map(
                (edu) => `${edu.field} (${edu.degree}) @ ${edu.institution}`,
            ),
        ),
        courses: wrapItems(
            coursesData.map(
                (course) =>
                    `${course.date} / ${course.title} @ ${course.issuer}`,
            ),
        ),
        skills: [...skillsData],
    };
    const offsets: Record<string, DetailsSectionOffsets> = {};
    let cursor = 0;

    const place = (key: string, rows: number, lineHeight: number) => {
        const top = cursor;
        const headingHeight = headingBlockHeight(
            SECTION_HEADINGS[key as keyof typeof SECTION_HEADINGS],
            headingFontSize,
        );
        const bodyY = top + headingHeight + bodyTopOffset;
        const inkHeight =
            rows > 0 ? (rows - 1) * lineHeight + bodyFontSize : 0;
        offsets[key] = {
            headingY: top,
            bodyY,
            bottomY: bodyY + inkHeight,
        };
        cursor = offsets[key].bottomY + sectionGap;
    };

    place("experience", sectionLines.experience.length, bodyLineHeight);
    place("skills", Math.ceil(skillsData.length / skillsColumns), bodyLineHeight);

    const modelInterludeHeight = Math.min(
        Math.max(
            viewportHeight *
                (compactHeight
                    ? L.NARROW_MODEL_INTERLUDE_COMPACT_MULT
                    : L.NARROW_MODEL_INTERLUDE_MULT),
            L.NARROW_MODEL_INTERLUDE_MIN_PX,
        ),
        L.NARROW_MODEL_INTERLUDE_MAX_PX,
    );
    const modelAnchorY = cursor + modelInterludeHeight / 2;
    cursor += modelInterludeHeight + sectionGap;

    place("projects", projectsData.length, projectLineHeight);
    place("education", sectionLines.education.length, bodyLineHeight);
    place("courses", sectionLines.courses.length, bodyLineHeight);

    const topInset =
        viewportHeight * -L.TARGET_BASE_Y_MULT +
        marginY * L.SECTION_TOP_OFF_MULT;
    const bottomInset = marginY * L.SECTION_TOP_OFF_MULT;
    const usableHeight = Math.max(0, viewportHeight - topInset - bottomInset);
    const detailsHeight = Math.max(0, cursor - sectionGap);
    const detailsOverflow = Math.max(0, detailsHeight - usableHeight);
    const bioTopY = detailsOverflow + viewportHeight;
    const bioHeadingHeight = headingBlockHeight(
        SECTION_HEADINGS.bio,
        headingFontSize,
    );
    const bioImageWidth = contentWidth * L.NARROW_BIO_IMAGE_WIDTH_MULT;
    const bioImageHeight = bioImageWidth * L.BIO_IMAGE_ASPECT;
    const bioImageY = bioTopY + bioHeadingHeight + bodyTopOffset;
    const bioTextY =
        bioImageY +
        bioImageHeight +
        headingFontSize * L.NARROW_BIO_IMAGE_GAP_MULT;
    const bioLines = wrapParagraphs(
        bioVariants[bioVariant],
        contentWidth,
        bodyFontSize,
        L.LETTER_SPACING,
        fontsReady,
    );
    const bioHeight =
        bioTextY - bioTopY + bioLines.length * bodyLineHeight;
    offsets.bio = {
        headingY: bioTopY,
        bodyY: bioTextY,
        bottomY: bioTopY + bioHeight,
    };
    const bioOverflow = Math.max(0, bioHeight - usableHeight);
    const contentHeight = bioTopY + bioHeight;
    const overflow = bioTopY + bioOverflow;

    return {
        layoutMode: "narrow",
        compactHeight,
        headingFontSize,
        bodyFontSize,
        bodyLineHeight,
        projectLineHeight,
        bodyTopOffset,
        bodyColumnOffset: 0,
        bodyMaxWidth: contentWidth,
        bioLines,
        bioImageWidth,
        bioImageHeight,
        bioImageXOffset: contentWidth - bioImageWidth,
        bioImageY,
        bioTextOffset: 0,
        bioTextMaxWidth: contentWidth,
        modelGapCenterPx: viewportWidth / 2,
        modelAnchorY,
        modelInterludeHeight,
        skillsColumns,
        skillsColumnWidth,
        sectionLines,
        sections: offsets,
        contentHeight,
        usableHeight,
        overflow,
    };
}

export function calculateDetailsLayout(
    input: DetailsLayoutInput,
): DetailsLayout {
    const { layoutMode } = calculateSceneLayoutCapabilities(
        input.viewportWidth,
        input.viewportHeight,
    );
    return layoutMode === "narrow"
        ? calculateNarrowDetailsLayout(input)
        : calculateWideDetailsLayout(input);
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
