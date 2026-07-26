"use client";

import { DetailsText } from "./DetailsText";
import { CONFIG, THEME, FONTS } from "@/config/constants";

interface BioSectionProps {
    heading: string;
    lines: readonly string[];
    headingX: number;
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
    headingX,
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
                direction="leftToRight"
                lineHeight={1}
                letterSpacing={CONFIG.detailsLayout.LETTER_SPACING}
            />

            <mesh
                position={[
                    headingX + imageWidth / 2,
                    contentY - imageHeight / 2,
                    0,
                ]}
            >
                <planeGeometry args={[imageWidth, imageHeight]} />
                <meshBasicMaterial color={THEME.stacked} />
            </mesh>

            {lines.map((line, index) => (
                <DetailsText
                    key={line}
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
            ))}
        </>
    );
}
