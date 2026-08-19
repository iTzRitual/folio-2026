"use client";

import { useCallback, useRef, type RefObject } from "react";
import { Html, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import { CONFIG, FONTS } from "@/config/constants";
import { useCaseStudyActions } from "@/context/CaseStudyContext";
import { useSweptColor } from "@/context/ThemeContext";
import { heroContent } from "@/data/content";
import { mixHex } from "@/lib/oklab";
import { blockReveal } from "./CaseStudyCopy";
import { useSceneCapabilities } from "@/context/SceneCapabilitiesContext";

const cfg = CONFIG.caseStudy;
const LETTER_SPACING = CONFIG.detailsLayout.LETTER_SPACING;

/**
 * The way out of a case study. The site's own name mark returns to the list,
 * with the keyboard's way out named beside it — deliberately just those two
 * things rather than the header, which lives on its own layer and belongs to
 * the page the reader has left.
 */
export function CaseStudyReturn({
    position,
    progressRef,
    blocks,
    em,
    width,
    pxPerUnit,
    stickyOffsetRef,
}: {
    position: [number, number, number];
    /** 0→1 reveal shared with the copy. */
    progressRef: RefObject<number>;
    /** Blocks in the copy, so this lands on the beat of its first line. */
    blocks: number;
    em: number;
    /** Distance between the mark and the hint: the image's own width. */
    width: number;
    /** Pixels per world unit in the landed frame, for the DOM twin. */
    pxPerUnit: number;
    stickyOffsetRef?: RefObject<number>;
}) {
    const { layoutMode } = useSceneCapabilities();
    const sticky = layoutMode === "narrow" && stickyOffsetRef !== undefined;
    const { close } = useCaseStudyActions();
    const groupRef = useRef<THREE.Group>(null);
    const riseRef = useRef<THREE.Group>(null);
    const markRef = useRef<THREE.MeshBasicMaterial>(null);
    const hintRef = useRef<THREE.MeshBasicMaterial>(null);
    const twinRef = useRef<HTMLDivElement>(null);
    const twinHiddenRef = useRef(true);
    const hoveredRef = useRef(false);
    const hoverCursor = useRef(0);
    const restHex = useRef("");
    const hoverHex = useRef("");

    const restColor = useSweptColor(
        "textSecondary",
        groupRef,
        useCallback((hex: string) => {
            restHex.current = hex;
        }, []),
    );
    const hoverColor = useSweptColor(
        "hover",
        groupRef,
        useCallback((hex: string) => {
            hoverHex.current = hex;
        }, []),
    );
    const hintColor = useSweptColor(
        "textHint",
        groupRef,
        useCallback((hex: string) => {
            hintRef.current?.color.set(hex);
        }, []),
    );

    const markSize = em * cfg.MARK_SIZE_EM;
    const hintSize = em * cfg.META_SIZE_EM;

    // Focus drives the same treatment as the pointer: the twin carries no
    // outline, so lighting the mark itself is the only thing a keyboard user
    // has to go on.
    const engage = () => {
        hoveredRef.current = true;
        document.body.style.cursor = "pointer";
    };
    const disengage = () => {
        hoveredRef.current = false;
        document.body.style.cursor = "auto";
    };

    useFrame((_, delta) => {
        if (groupRef.current && stickyOffsetRef) {
            groupRef.current.position.y =
                position[1] - stickyOffsetRef.current;
        }
        const eased = blockReveal(progressRef.current, 0, blocks);
        if (markRef.current) markRef.current.opacity = eased;
        if (hintRef.current) hintRef.current.opacity = sticky ? 0 : eased;
        if (riseRef.current) {
            riseRef.current.position.y =
                (1 - eased) * cfg.COPY_REVEAL_RISE * markSize;
        }

        const step = delta / CONFIG.header.HOVER_DURATION;
        const wanted = hoveredRef.current ? 1 : 0;
        hoverCursor.current =
            wanted > hoverCursor.current
                ? Math.min(wanted, hoverCursor.current + step)
                : Math.max(wanted, hoverCursor.current - step);
        const t = hoverCursor.current;
        markRef.current?.color.set(
            mixHex(
                restHex.current || restColor,
                hoverHex.current || hoverColor,
                t * t * (3 - 2 * t),
            ),
        );

        // Only reachable once the flight has landed: mid-flight the twin is
        // laid out for a frame that is not on screen yet, and a study that is
        // closed must not leave a button sitting over the list.
        const hidden = progressRef.current < 1;
        if (hidden === twinHiddenRef.current) return;
        twinHiddenRef.current = hidden;
        const twin = twinRef.current;
        if (twin) {
            twin.style.visibility = hidden ? "hidden" : "";
            twin.style.pointerEvents = hidden ? "none" : "";
        }
        // Hiding the twin under the pointer fires no leave of its own.
        if (hidden && hoveredRef.current) disengage();
    });

    const twinLetterSpacing = `${
        LETTER_SPACING + cfg.HTML_LETTER_SPACING_OFFSET
    }em`;

    return (
        <group ref={groupRef} position={position}>
            <group ref={riseRef}>
                {!sticky && <Text
                    renderOrder={cfg.RENDER_ORDER}
                    anchorX="left"
                    anchorY="middle"
                    fontSize={markSize}
                    font={FONTS.karlaExtraBold}
                    letterSpacing={LETTER_SPACING}
                    lineHeight={1}
                    glyphGeometryDetail={CONFIG.detailsCurl.GLYPH_DETAIL}
                >
                    {heroContent.title}
                    <meshBasicMaterial
                        ref={markRef}
                        color={restColor}
                        transparent
                        opacity={0}
                        toneMapped={false}
                        depthTest={false}
                        depthWrite={false}
                    />
                </Text>}

                <Text
                    position={[width, 0, 0]}
                    renderOrder={cfg.RENDER_ORDER}
                    anchorX="right"
                    anchorY="middle"
                    fontSize={hintSize}
                    font={FONTS.karlaLight}
                    letterSpacing={LETTER_SPACING}
                    lineHeight={1}
                    glyphGeometryDetail={CONFIG.detailsCurl.GLYPH_DETAIL}
                >
                    {cfg.RETURN_HINT}
                    <meshBasicMaterial
                        ref={hintRef}
                        color={hintColor}
                        transparent
                        opacity={0}
                        toneMapped={false}
                        depthTest={false}
                        depthWrite={false}
                    />
                </Text>

                <Html
                    as="div"
                    className="left-0 top-0"
                    zIndexRange={
                        sticky
                            ? [cfg.MOBILE_CONTROL_Z_INDEX, cfg.MOBILE_CONTROL_Z_INDEX]
                            : undefined
                    }
                >
                    <div
                        ref={twinRef}
                        className="relative font-karla"
                        style={{ visibility: "hidden", pointerEvents: "none" }}
                    >
                        <button
                            type="button"
                            aria-label={`${heroContent.title}, back to projects`}
                            onClick={close}
                            onMouseEnter={engage}
                            onMouseLeave={disengage}
                            onFocus={engage}
                            onBlur={disengage}
                            className="absolute left-0 top-0 m-0 flex min-h-11 min-w-11 cursor-pointer items-center whitespace-nowrap border-0 bg-transparent p-0 font-extrabold leading-none outline-none pointer-events-auto"
                            style={{
                                transform: "translateY(-50%)",
                                fontSize: `${markSize * pxPerUnit}px`,
                                letterSpacing: twinLetterSpacing,
                                color: "transparent",
                            }}
                        >
                            <span
                                aria-hidden
                                className="absolute block"
                                style={{ inset: `${-cfg.MARK_HIT_PAD_EM}em` }}
                            />
                            {heroContent.title}
                        </button>

                        {!sticky && <span
                            className="absolute top-0 m-0 block whitespace-nowrap p-0 font-light leading-none"
                            style={{
                                left: `${width * pxPerUnit}px`,
                                transform: "translate(-100%, -50%)",
                                fontSize: `${hintSize * pxPerUnit}px`,
                                letterSpacing: twinLetterSpacing,
                                color: "transparent",
                            }}
                        >
                            {cfg.RETURN_HINT}
                        </span>}
                    </div>
                </Html>
            </group>
        </group>
    );
}
