"use client";

import type { RefObject } from "react";
import type { Group } from "three";
import { DetailsText } from "./DetailsText";
import { DetailsLink } from "./DetailsLink";
import { CONFIG, FONTS } from "@/config/constants";
import type { ThemeRole } from "@/context/ThemeContext";
import { headingLines } from "@/lib/detailsLayout";

export interface DetailsSectionItem {
    text: string;
    href?: string;
    previewImage?: string;
    /** Index into projectsData of the case study a click opens. */
    caseStudyIndex?: number;
}

interface DetailsSectionProps {
    heading: string;
    items: readonly DetailsSectionItem[];
    headingX: number;
    headingY: number;
    bodyX: number;
    bodyY: number;
    bodyAnchorX: "left" | "right";
    direction: "leftToRight" | "rightToLeft";
    headingFontSize: number;
    bodyFontSize: number;
    bodyLineHeight: number;
    pxTo3DWidth: number;
    startTrigger: boolean;
    staggerStep: number;
    headingGroupRef?: RefObject<Group | null>;
    columns?: number;
    columnWidth?: number;
    activeItemIndex?: number | null;
}

export function DetailsSection({
    heading,
    items,
    headingX,
    headingY,
    bodyX,
    bodyY,
    bodyAnchorX,
    direction,
    headingFontSize,
    bodyFontSize,
    bodyLineHeight,
    pxTo3DWidth,
    startTrigger,
    staggerStep,
    headingGroupRef,
    columns = 1,
    columnWidth = 0,
    activeItemIndex = null,
}: DetailsSectionProps) {
    const rows = Math.ceil(items.length / columns);

    return (
        <>
            <group ref={headingGroupRef}>
                {headingLines(heading).map((line, index) => (
                    <DetailsText
                        key={`${heading}-${index}`}
                        text={line}
                        position={[
                            headingX,
                            headingY -
                                index *
                                    headingFontSize *
                                    CONFIG.detailsLayout.HEADING_LINE_HEIGHT_MULT,
                            0,
                        ]}
                        anchorX="left"
                        anchorY="top"
                        calculatedFontSize={headingFontSize}
                        pixelFontSize={headingFontSize / pxTo3DWidth}
                        font={FONTS.karlaLight}
                        fontWeightClass="font-light"
                        role="textPrimary"
                        startTrigger={startTrigger}
                        delay={CONFIG.detailsTimings.HEADING_DELAY}
                        direction={direction}
                        lineHeight={1}
                        letterSpacing={CONFIG.detailsLayout.LETTER_SPACING}
                    />
                ))}
            </group>

            {items.map((item, index) => {
                const column = Math.floor(index / rows);
                const row = index % rows;
                const shared = {
                    text: item.text,
                    position: [
                        bodyX + column * columnWidth,
                        bodyY - row * bodyLineHeight,
                        0,
                    ] as [
                        number,
                        number,
                        number,
                    ],
                    anchorX: bodyAnchorX,
                    anchorY: "top" as const,
                    calculatedFontSize: bodyFontSize,
                    pixelFontSize: bodyFontSize / pxTo3DWidth,
                    font: FONTS.karlaLight,
                    fontWeightClass: "font-light" as const,
                    role: (item.href ? "bg" : "textBody") as ThemeRole,
                    blockRole: (item.href
                        ? "textPrimary"
                        : "textBody") as ThemeRole,
                    startTrigger,
                    delay: CONFIG.detailsTimings.BODY_DELAY + index * staggerStep,
                    direction,
                    lineHeight: 1,
                    letterSpacing: CONFIG.detailsLayout.LETTER_SPACING,
                };

                return item.href ? (
                    <DetailsLink
                        key={`${heading}-${index}`}
                        href={item.href}
                        previewImage={item.previewImage}
                        caseStudyIndex={item.caseStudyIndex}
                        active={activeItemIndex === index}
                        rowPitchEm={bodyLineHeight / bodyFontSize}
                        {...shared}
                    />
                ) : (
                    <DetailsText key={`${heading}-${index}`} {...shared} />
                );
            })}
        </>
    );
}
