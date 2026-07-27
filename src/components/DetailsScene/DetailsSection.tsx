"use client";

import { DetailsText } from "./DetailsText";
import { DetailsLink } from "./DetailsLink";
import { CONFIG, THEME, FONTS } from "@/config/constants";

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
}: DetailsSectionProps) {
    return (
        <>
            <DetailsText
                text={heading}
                position={[headingX, headingY, 0]}
                anchorX="left"
                anchorY="top"
                calculatedFontSize={headingFontSize}
                pixelFontSize={headingFontSize / pxTo3DWidth}
                font={FONTS.karlaLight}
                fontWeightClass="font-light"
                color={THEME.white}
                blockColor={THEME.white}
                selectionBgColor={THEME.white}
                selectionColor={THEME.darkest}
                startTrigger={startTrigger}
                delay={CONFIG.detailsTimings.HEADING_DELAY}
                direction={direction}
                lineHeight={1}
                letterSpacing={CONFIG.detailsLayout.LETTER_SPACING}
            />

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
                    color: THEME.light,
                    blockColor: THEME.light,
                    selectionBgColor: THEME.light,
                    selectionColor: THEME.darkest,
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
                        {...shared}
                    />
                ) : (
                    <DetailsText key={item.text} {...shared} />
                );
            })}
        </>
    );
}
