"use client";

import { useEffect, useRef } from "react";
import type { MeshBasicMaterial } from "three";
import { DetailsText } from "./DetailsText";
import { CONFIG, THEME, FONTS } from "@/config/constants";
import { applyCurlShader } from "@/lib/detailsCurl";
import { useCurlFade } from "./useCurlFade";

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
    const imageMaterialRef = useRef<MeshBasicMaterial>(null);

    const { groupRef: imageGroupRef, revealedRef: imageRevealedRef } =
        useCurlFade((opacity) => {
            if (imageMaterialRef.current)
                imageMaterialRef.current.opacity = opacity;
        });

    useEffect(() => {
        imageRevealedRef.current = true;
    }, [imageRevealedRef]);

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

            <group
                ref={imageGroupRef}
                position={[headingX + imageWidth / 2, contentY, 0]}
            >
                <mesh position={[0, -imageHeight / 2, 0]}>
                    <planeGeometry
                        args={[
                            imageWidth,
                            imageHeight,
                            1,
                            CONFIG.detailsCurl.IMAGE_SEGMENTS,
                        ]}
                    />
                    <meshBasicMaterial
                        ref={imageMaterialRef}
                        color={THEME.stacked}
                        transparent
                        opacity={0}
                        onBeforeCompile={applyCurlShader}
                    />
                </mesh>
            </group>

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
