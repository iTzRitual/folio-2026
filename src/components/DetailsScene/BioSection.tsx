"use client";

import { Suspense } from "react";
import { DetailsText } from "./DetailsText";
import { AnimatedRevealImage } from "./AnimatedRevealImage";
import { CONFIG, THEME, FONTS } from "@/config/constants";
import { bioImage } from "@/data/content";

interface BioSectionProps {
    heading: string;
    lines: readonly string[];
    imageX: number;
    headingY: number;
    contentY: number;
    imageWidth: number;
    imageHeight: number;
    textX: number;
    headingFontSize: number;
    bodyFontSize: number;
    bodyLineHeight: number;
    pxTo3DWidth: number;
    startTrigger: boolean;
}

export function BioSection({
    heading,
    lines,
    imageX,
    headingY,
    contentY,
    imageWidth,
    imageHeight,
    textX,
    headingFontSize,
    bodyFontSize,
    bodyLineHeight,
    pxTo3DWidth,
    startTrigger,
}: BioSectionProps) {
    return (
        <>
            <DetailsText
                text={heading}
                position={[textX, headingY, 0]}
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
                direction="leftToRight"
                lineHeight={1}
                letterSpacing={CONFIG.detailsLayout.LETTER_SPACING}
            />

            <Suspense fallback={null}>
                <AnimatedRevealImage
                    src={bioImage.src}
                    width={imageWidth}
                    height={imageHeight}
                    position={[imageX, contentY, 0]}
                    delay={CONFIG.detailsTimings.BODY_DELAY}
                    stagger={CONFIG.detailsTimings.BODY_STAGGER_STEP}
                    startTrigger={startTrigger}
                />
            </Suspense>

            {lines.map((line, index) =>
                line === "" ? null : (
                    <DetailsText
                        key={index}
                        text={line}
                        position={[textX, contentY - index * bodyLineHeight, 0]}
                        anchorX="left"
                        anchorY="top"
                        calculatedFontSize={bodyFontSize}
                        pixelFontSize={bodyFontSize / pxTo3DWidth}
                        font={FONTS.karlaLight}
                        fontWeightClass="font-light"
                        color={THEME.light}
                        blockColor={THEME.light}
                        selectionBgColor={THEME.light}
                        selectionColor={THEME.darkest}
                        startTrigger={startTrigger}
                        delay={
                            CONFIG.detailsTimings.BODY_DELAY +
                            index * CONFIG.detailsTimings.BODY_STAGGER_STEP
                        }
                        direction="leftToRight"
                        lineHeight={1}
                        letterSpacing={CONFIG.detailsLayout.LETTER_SPACING}
                    />
                ),
            )}
        </>
    );
}
