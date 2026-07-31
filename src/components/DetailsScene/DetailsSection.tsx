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
}: DetailsSectionProps) {
    return (
        <>
            <group ref={headingGroupRef}>
                {headingLines(heading).map((line, index) => (
                    <DetailsText
                        key={line}
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
                const shared = {
                    text: item.text,
                    position: [bodyX, bodyY - index * bodyLineHeight, 0] as [
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
                        key={item.text}
                        href={item.href}
                        previewImage={item.previewImage}
                        rowPitchEm={bodyLineHeight / bodyFontSize}
                        {...shared}
                    />
                ) : (
                    <DetailsText key={item.text} {...shared} />
                );
            })}
        </>
    );
}
