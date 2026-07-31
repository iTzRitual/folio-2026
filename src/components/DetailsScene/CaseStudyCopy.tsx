"use client";

import { useCallback, useMemo, useRef, type RefObject } from "react";
import { Html, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CONFIG, FONTS } from "@/config/constants";
import { useSweptColor } from "@/context/ThemeContext";
import { useFontsReady } from "@/hooks/useFontsReady";
import { wrapText } from "@/lib/textMetrics";
import type { CaseStudy } from "@/data/content";

/** The three roles the copy is set in, top to bottom. */
type CopyRole = "textPrimary" | "textHint" | "textBody";

interface CaseStudyLine {
    text: string;
    /** Vertical middle of the line, in world units under the block's origin. */
    y: number;
    size: number;
    bold: boolean;
    role: CopyRole;
    /** Reading-order index of the paragraph this line belongs to. */
    block: number;
}

export interface CaseStudyLayout {
    lines: CaseStudyLine[];
    /** Total height of the block, so a scroller knows where the copy ends. */
    height: number;
}

export const EMPTY_CASE_STUDY_LAYOUT: CaseStudyLayout = { lines: [], height: 0 };

const cfg = CONFIG.caseStudy;
const LETTER_SPACING = CONFIG.detailsLayout.LETTER_SPACING;
// Troika and the browser disagree slightly on tracking; the details twins carry
// the same correction so the selection sits on top of the glyphs.
const HTML_LETTER_SPACING_OFFSET = -0.004;

/**
 * Wraps through the site's own measurer rather than troika's maxWidth, so the
 * copy breaks where the rest of the page would break it. That measurer works in
 * pixels, hence the conversion — everything else here is world units.
 */
export function useCaseStudyLayout(
    study: CaseStudy | null,
    em: number,
    maxWidth: number,
    pxPerUnit: number,
): CaseStudyLayout {
    const fontsReady = useFontsReady();

    return useMemo(() => {
        if (!study || em <= 0) return EMPTY_CASE_STUDY_LAYOUT;

        const lines: CaseStudyLine[] = [];
        let cursor = 0;
        let block = 0;

        const push = (
            text: string,
            size: number,
            bold: boolean,
            role: CopyRole,
            lineHeight: number,
            width = maxWidth,
        ) => {
            const wrapped = wrapText(
                text,
                width * pxPerUnit,
                size * pxPerUnit,
                LETTER_SPACING,
                fontsReady,
            );
            for (const line of wrapped) {
                cursor -= size * lineHeight;
                lines.push({
                    text: line,
                    y: cursor + size * lineHeight * 0.5,
                    size,
                    bold,
                    role,
                    block,
                });
            }
            block += 1;
        };

        const gap = (amount: number) => {
            cursor -= em * amount;
        };

        push(
            study.title,
            em * cfg.TITLE_SIZE_EM,
            true,
            "textPrimary",
            cfg.TITLE_LINE_HEIGHT,
        );
        gap(cfg.GAP_AFTER_TITLE_EM);
        push(
            `${study.role}  ·  ${study.year}  ·  ${study.stack}`,
            em * cfg.META_SIZE_EM,
            false,
            "textHint",
            cfg.META_LINE_HEIGHT,
            maxWidth * cfg.META_WIDTH_MULT,
        );
        gap(cfg.GAP_AFTER_META_EM);
        push(
            study.lede,
            em * cfg.LEDE_SIZE_EM,
            false,
            "textPrimary",
            cfg.LEDE_LINE_HEIGHT,
        );
        gap(cfg.GAP_AFTER_LEDE_EM);
        for (const paragraph of study.body) {
            push(paragraph, em, false, "textBody", cfg.BODY_LINE_HEIGHT);
            gap(cfg.GAP_AFTER_PARAGRAPH_EM);
        }

        return { lines, height: -cursor };
    }, [study, em, maxWidth, pxPerUnit, fontsReady]);
}

/**
 * The case study's copy: WebGL lines that arrive in reading order off a single
 * 0→1 ref, and one DOM block behind them carrying the same text so the study is
 * selectable and readable by a screen reader like everything else on the site.
 */
export function CaseStudyCopy({
    layout,
    progressRef,
    pxPerUnit,
}: {
    layout: CaseStudyLayout;
    /** 0→1 reveal, driven by the flight. */
    progressRef: RefObject<number>;
    /** Pixels per world unit in the landed frame, for the DOM twin. */
    pxPerUnit: number;
}) {
    const groupRef = useRef<THREE.Group>(null);
    const materials = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
    const lineGroups = useRef<(THREE.Group | null)[]>([]);
    const twinRef = useRef<HTMLDivElement>(null);
    const twinHiddenRef = useRef(true);

    // One sweep target per role rather than per line: the block is small enough
    // on screen that the front crosses all of it inside a frame or two, and a
    // registration per line would churn the sweep's set on every reflow.
    const paint = useCallback(
        (role: CopyRole, hex: string) => {
            layout.lines.forEach((line, index) => {
                if (line.role === role) materials.current[index]?.color.set(hex);
            });
        },
        [layout],
    );

    const primaryColor = useSweptColor(
        "textPrimary",
        groupRef,
        useCallback((hex: string) => paint("textPrimary", hex), [paint]),
    );
    const hintColor = useSweptColor(
        "textHint",
        groupRef,
        useCallback((hex: string) => paint("textHint", hex), [paint]),
    );
    const bodyColor = useSweptColor(
        "textBody",
        groupRef,
        useCallback((hex: string) => paint("textBody", hex), [paint]),
    );
    const settled: Record<CopyRole, string> = {
        textPrimary: primaryColor,
        textHint: hintColor,
        textBody: bodyColor,
    };

    // Normalised, so a 0→1 progress always finishes every block however long
    // the stagger tail has grown.
    const blocks = layout.lines.length
        ? layout.lines[layout.lines.length - 1].block
        : 0;
    const total = blocks * cfg.COPY_REVEAL_STAGGER + cfg.COPY_REVEAL_SPAN;

    useFrame(() => {
        const progress = progressRef.current * total;

        layout.lines.forEach((line, index) => {
            const start = line.block * cfg.COPY_REVEAL_STAGGER;
            const t = THREE.MathUtils.clamp(
                (progress - start) / cfg.COPY_REVEAL_SPAN,
                0,
                1,
            );
            const eased = 1 - Math.pow(1 - t, 3);
            const material = materials.current[index];
            if (material) material.opacity = eased;
            const group = lineGroups.current[index];
            if (group) {
                group.position.y =
                    line.y + (1 - eased) * cfg.COPY_REVEAL_RISE * line.size;
            }
        });

        // The twin is laid out for the landed frame only; mid-flight its glyphs
        // are the wrong size, so a drag then would select text that is nowhere
        // near what it looks like it is over.
        const hidden = progressRef.current < 1;
        if (hidden === twinHiddenRef.current) return;
        twinHiddenRef.current = hidden;
        const twin = twinRef.current;
        if (twin) {
            twin.style.visibility = hidden ? "hidden" : "";
            twin.style.pointerEvents = hidden ? "none" : "";
        }
    });

    return (
        <group ref={groupRef}>
            {layout.lines.map((line, index) => (
                <group
                    key={`${line.block}-${index}`}
                    ref={(group) => {
                        lineGroups.current[index] = group;
                    }}
                    position={[0, line.y, 0]}
                >
                    <Text
                        renderOrder={cfg.RENDER_ORDER}
                        anchorX="left"
                        anchorY="middle"
                        fontSize={line.size}
                        font={
                            line.bold
                                ? FONTS.karlaExtraBold
                                : FONTS.karlaLight
                        }
                        letterSpacing={LETTER_SPACING}
                        lineHeight={1}
                        glyphGeometryDetail={CONFIG.detailsCurl.GLYPH_DETAIL}
                    >
                        {line.text}
                        <meshBasicMaterial
                            ref={(material) => {
                                materials.current[index] = material;
                            }}
                            color={settled[line.role]}
                            transparent
                            opacity={0}
                            toneMapped={false}
                            depthTest={false}
                            depthWrite={false}
                        />
                    </Text>
                </group>
            ))}

            {/*
              One <Html> for the whole block rather than one per line: every
              line hangs off the same world origin, so a single projection plus
              fixed pixel offsets puts them all where their glyphs are, at a
              React root instead of thirty.
            */}
            <Html as="div" className="left-0 top-0">
                <div
                    ref={twinRef}
                    className="relative font-karla"
                    style={{ visibility: "hidden", pointerEvents: "none" }}
                >
                    {layout.lines.map((line, index) => (
                        <p
                            key={`${line.block}-${index}`}
                            className="absolute left-0 m-0 p-0 whitespace-nowrap leading-none"
                            style={{
                                top: `${-line.y * pxPerUnit}px`,
                                transform: "translateY(-50%)",
                                fontSize: `${line.size * pxPerUnit}px`,
                                fontWeight: line.bold ? 800 : 300,
                                letterSpacing: `${
                                    LETTER_SPACING + HTML_LETTER_SPACING_OFFSET
                                }em`,
                                color: "transparent",
                            }}
                        >
                            {line.text}
                        </p>
                    ))}
                </div>
            </Html>
        </group>
    );
}
