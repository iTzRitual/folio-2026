"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFrame, useStore, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { gsap } from "gsap";
import * as THREE from "three";
import { CONFIG } from "@/config/constants";
import { projectsData } from "@/data/content";
import {
    useCaseStudyActions,
    useOpenCaseStudy,
} from "@/context/CaseStudyContext";
import { useDebugSettings } from "@/context/DebugSettingsContext";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { caseStudyStage } from "@/lib/caseStudyStage";
import { curlUniforms } from "@/lib/detailsCurl";
import { CaseStudyCopy, useCaseStudyLayout } from "./CaseStudyCopy";
import { CaseStudyReturn } from "./CaseStudyReturn";
import { CaseStudyExternalLink } from "./CaseStudyExternalLink";
import { useSceneCapabilities } from "@/context/SceneCapabilitiesContext";
import { useHeroLayout } from "@/context/HeroLayoutContext";

const cfg = CONFIG.caseStudy;

/**
 * Opening a case study flies the camera into the hovered preview plate. The
 * plate never moves: the camera translates to it and pushes in until it fills
 * the frame, which is what makes the thumbnail the study's opening image rather
 * than a picture of one. Everything that belongs to the list — the rows, the
 * model, the sheet's fold and its scrim — leaves on the way past.
 */
export function CaseStudyScene() {
    const openIndex = useOpenCaseStudy();
    const { close } = useCaseStudyActions();
    const { camera, viewport, size } = useThree();
    const prefersReducedMotion = usePrefersReducedMotion();
    const { layoutMode, compactHeight, inputMode } = useSceneCapabilities();
    const { leftX, rightX } = useHeroLayout();
    const narrowStudy = layoutMode === "narrow";
    const nativeStudyScroll = narrowStudy && inputMode === "coarse";
    const tuning = useDebugSettings().projectPreview;

    // Kept past the close, so the copy fading out is still the copy that was
    // opened and its measured height stops moving under the exit.
    const [shown, setShown] = useState<number | null>(null);
    if (openIndex !== null && openIndex !== shown) setShown(openIndex);
    const study = shown !== null ? projectsData[shown] : null;

    const anchor = useRef(new THREE.Vector3());
    const scroll = useRef(0);
    const scrollTarget = useRef(0);
    const reveal = useRef(0);
    const engaged = useRef(false);
    const contentRef = useRef<THREE.Group>(null);
    const stickyOffsetRef = useRef(0);
    const externalPositionRef = useRef(new THREE.Vector3());
    const scrollSurfaceRef = useRef<HTMLDivElement>(null);
    const calculateScrollPosition = useCallback(
        (
            _element: THREE.Object3D,
            _camera: THREE.Camera,
            currentSize: { width: number; height: number },
        ) => [currentSize.width / 2, currentSize.height / 2],
        [],
    );

    // The frame the camera lands in, which every measurement below is authored
    // against: the plate stays the same size in world units the whole way, so
    // the frame is only ever a matter of how close the camera gets to it.
    const plateWidth =
        (narrowStudy
            ? (rightX - leftX) *
              (compactHeight
                  ? CONFIG.projectPreview.MOBILE_COMPACT_WIDTH_FRACTION
                  : CONFIG.projectPreview.MOBILE_WIDTH_FRACTION)
            : viewport.width * CONFIG.projectPreview.WIDTH_FRACTION) *
        tuning.sizeMult;
    const plateHeight = plateWidth / CONFIG.projectPreview.ASPECT;
    const fill = narrowStudy ? cfg.MOBILE_FILL : cfg.FILL;
    const distance =
        (cfg.CAMERA_REST_Z * plateWidth) / (fill * viewport.width);
    const frameWidth = plateWidth / fill;
    const frameHeight = frameWidth / (viewport.width / viewport.height);
    const em = frameWidth * (narrowStudy ? cfg.MOBILE_EM_MULT : cfg.EM_MULT);
    const textWidth =
        frameWidth *
        (narrowStudy ? cfg.MOBILE_TEXT_WIDTH_MULT : cfg.TEXT_WIDTH_MULT);
    const pxPerUnit = frameWidth > 0 ? size.width / frameWidth : 0;

    const layout = useCaseStudyLayout(study, em, textWidth, pxPerUnit);
    const limit = Math.max(
        layout.height + frameHeight * cfg.SCROLL_OVERSHOOT_MULT,
        0,
    );

    useEffect(() => {
        if (openIndex === null) {
            gsap.to(caseStudyStage, {
                progress: 0,
                duration: prefersReducedMotion
                    ? 0
                    : narrowStudy
                      ? cfg.MOBILE_CLOSE_DURATION
                      : cfg.CLOSE_DURATION,
                ease: "power3.inOut",
                overwrite: true,
            });
            return;
        }

        const instant = caseStudyStage.instant;
        caseStudyStage.instant = false;

        anchor.current.copy(caseStudyStage.pose);
        scroll.current = 0;
        scrollTarget.current = 0;
        gsap.fromTo(
            caseStudyStage,
            { progress: 0 },
            {
                progress: 1,
                duration:
                    prefersReducedMotion || instant
                        ? 0
                        : narrowStudy
                          ? cfg.MOBILE_FLIGHT_DURATION
                          : cfg.FLIGHT_DURATION,
                ease: "power3.inOut",
                overwrite: true,
            },
        );
    }, [openIndex, prefersReducedMotion, narrowStudy]);

    useEffect(() => {
        if (openIndex === null || !nativeStudyScroll) return;
        scroll.current = 0;
        scrollTarget.current = 0;
        scrollSurfaceRef.current?.scrollTo(0, 0);
    }, [openIndex, nativeStudyScroll]);

    useEffect(() => {
        if (openIndex === null) return;

        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") close();
        };

        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [openIndex, close]);

    // The page scroll drives the details sheet, so leaving it live would slide
    // the sheet out from under a camera that is no longer looking at it. Handed
    // back from the frame loop rather than from this effect's cleanup: the
    // cleanup runs when the close *starts*, and the sheet has to hold still all
    // the way through the return flight.
    const scrollLock = useRef<{ scrollY: number; overflow: string } | null>(null);

    const releaseScroll = useCallback(() => {
        const lock = scrollLock.current;
        if (!lock) return;
        scrollLock.current = null;
        document.documentElement.style.overflow = lock.overflow;
        window.scrollTo(0, lock.scrollY);
    }, []);

    useEffect(() => {
        if (openIndex === null) return;
        const root = document.documentElement;
        scrollLock.current ??= {
            scrollY: window.scrollY,
            overflow: root.style.overflow,
        };
        root.style.overflow = "hidden";
    }, [openIndex]);

    // R3F derives the world size of a screen from the camera's live distance to
    // the origin, and re-derives it whenever the canvas is measured — a resize,
    // a scroll, anything. Measured mid-flight it would hand the whole scene —
    // the sheet, the hero, the model — a viewport half the size of the one they
    // are laid out against, and leave it that way until the next resize. So any
    // measurement taken while the camera is away is redone from where the rest
    // of the site believes it is.
    const store = useStore();
    useEffect(
        () =>
            store.subscribe((state) => {
                if (state.viewport.distance === cfg.CAMERA_REST_Z) return;

                const { x, y, z } = camera.position;
                camera.position.set(0, 0, cfg.CAMERA_REST_Z);
                camera.updateMatrixWorld();
                // Re-entrant, but only once: the camera is at rest for this
                // call, so the pass it triggers takes the branch above.
                state.setSize(
                    state.size.width,
                    state.size.height,
                    state.size.top,
                    state.size.left,
                );
                camera.position.set(x, y, z);
                camera.updateMatrixWorld();
            }),
        [store, camera],
    );

    // Nothing else owns the camera, the bend or the lock, so going away
    // mid-flight would leave the scene wherever the flight had got to.
    useEffect(
        () => () => {
            gsap.killTweensOf(caseStudyStage);
            caseStudyStage.progress = 0;
            caseStudyStage.dim = 0;
            caseStudyStage.plate.mode = "cursor";
            caseStudyStage.plate.follow = 1;
            curlUniforms.uCurlDim.value = 0;
            releaseScroll();
        },
        [releaseScroll],
    );

    useEffect(() => {
        if (openIndex === null || nativeStudyScroll) return;
        // Capture phase, and stopped for good: the page's smooth-scroll runner
        // listens on window and scrolls the document itself, which `overflow:
        // hidden` does nothing about. Taking the event before it reaches anyone
        // is the only way to keep the wheel without tearing that runner down.
        const onWheel = (event: WheelEvent) => {
            // Only the vertical half. A sideways two-finger flick is the
            // browser's own back gesture, and a better way out of a case study
            // than anything worth reimplementing here. It is still taken off
            // the smooth-scroll runner, which cancels anything carrying a
            // vertical component and would swallow the gesture with it, but
            // deliberately not cancelled here: the browser is the one that
            // should act on it.
            if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
                event.stopPropagation();
                event.stopImmediatePropagation();
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            scrollTarget.current = THREE.MathUtils.clamp(
                scrollTarget.current + (event.deltaY / size.height) * frameHeight,
                0,
                limit,
            );
        };

        window.addEventListener("wheel", onWheel, {
            capture: true,
            passive: false,
        });
        return () =>
            window.removeEventListener("wheel", onWheel, { capture: true });
    }, [openIndex, size.height, frameHeight, layout.height, nativeStudyScroll, limit]);

    // Ahead of everything that reads what it writes, so the plate, the curl and
    // the sheet all act on this frame's flight rather than the last one's.
    useFrame((_, delta) => {
        const p = caseStudyStage.progress;
        const flying = openIndex !== null || p > 1e-4;
        // One last pass at rest hands the camera, the plate and the curl back
        // in their resting state; after that the scene is none of our business.
        if (!flying && !engaged.current) return;
        engaged.current = flying;

        const dt = Math.min(delta, 1 / 30);
        scroll.current = THREE.MathUtils.damp(
            scroll.current,
            scrollTarget.current,
            cfg.SCROLL_DAMPING,
            dt,
        );

        const target = anchor.current;
        const plateY =
            target.y + cfg.PLATE_OFFSET * frameHeight + scroll.current * p;
        stickyOffsetRef.current = scroll.current * p;

        camera.position.set(
            THREE.MathUtils.lerp(0, target.x, p),
            THREE.MathUtils.lerp(0, target.y, p),
            THREE.MathUtils.lerp(cfg.CAMERA_REST_Z, target.z + distance, p),
        );
        camera.updateMatrixWorld();

        const control = caseStudyStage.plate;
        if (!flying) {
            control.mode = "cursor";
            control.follow = 1;
            control.width = 0;
            releaseScroll();
        } else {
            control.mode = "placed";
            // Ramped rather than cut, so the plate's hover grade and resting
            // glitch leave over the flight instead of on the click.
            control.follow = 1 - p;
            control.width = 0;
            control.x = target.x;
            control.y = plateY;
            control.z = target.z;
        }

        caseStudyStage.dim = THREE.MathUtils.clamp(
            (p - cfg.LIST_DIM_START) / cfg.LIST_DIM_SPAN,
            0,
            1,
        );
        curlUniforms.uCurlDim.value = caseStudyStage.dim;
        // A plate about to fill the frame cannot stay rolled around the sheet's
        // fold. Written every frame, which takes the bend off the layout effect
        // that owns it at rest — the value at p = 0 is the same one.
        curlUniforms.uCurlBend.value = prefersReducedMotion ? 0 : 1 - p;

        reveal.current = THREE.MathUtils.clamp(
            (p - cfg.COPY_START) / cfg.COPY_RAMP,
            0,
            1,
        );

        const content = contentRef.current;
        if (content) {
            content.position.set(
                target.x - textWidth / 2,
                plateY - plateHeight / 2 - frameHeight * cfg.COPY_GAP_MULT,
                target.z,
            );
            content.visible = p > 1e-3;
        }

        const ctaFontSize = em * cfg.MOBILE_CTA_SIZE_EM;
        const ctaWidth = ctaFontSize * 7.8;
        const ctaHeight = ctaFontSize * 2.45;
        const ctaInset = em * cfg.MOBILE_CTA_INSET_EM;
        externalPositionRef.current.set(
            target.x + plateWidth / 2 - ctaWidth / 2 - ctaInset,
            plateY - plateHeight / 2 + ctaHeight / 2 + ctaInset,
            target.z + 0.01,
        );
    }, -1);

    return (
        <>
        <group ref={contentRef} visible={false}>
            {study && (
                <>
                    <CaseStudyCopy
                        layout={layout}
                        progressRef={reveal}
                        pxPerUnit={pxPerUnit}
                    />
                    {/*
                      Above the image rather than pinned to the frame: it is
                      the study's own masthead, and it leaves with the image
                      the copy scrolls up past.
                    */}
                    <CaseStudyReturn
                        position={[
                            (textWidth - plateWidth) / 2,
                            plateHeight +
                                frameHeight *
                                    (cfg.COPY_GAP_MULT + cfg.MARK_GAP_MULT),
                            0,
                        ]}
                        progressRef={reveal}
                        blocks={layout.blocks}
                        em={em}
                        width={plateWidth}
                        pxPerUnit={pxPerUnit}
                        stickyOffsetRef={narrowStudy ? stickyOffsetRef : undefined}
                    />
                </>
            )}
        </group>
        {narrowStudy && study && (
            <CaseStudyExternalLink
                href={study.link}
                positionRef={externalPositionRef}
                progressRef={reveal}
                em={em}
                pxPerUnit={pxPerUnit}
            />
        )}
        {nativeStudyScroll && openIndex !== null && (
            <Html
                fullscreen
                calculatePosition={calculateScrollPosition}
                zIndexRange={[
                    cfg.MOBILE_SCROLL_Z_INDEX,
                    cfg.MOBILE_SCROLL_Z_INDEX,
                ]}
                className="pointer-events-none"
            >
                <div
                    ref={scrollSurfaceRef}
                    aria-hidden
                    className="absolute inset-0 overflow-y-auto overflow-x-hidden pointer-events-auto"
                    style={{
                        touchAction: "pan-y",
                        overscrollBehaviorY: "contain",
                    }}
                    onScroll={(event) => {
                        scrollTarget.current = THREE.MathUtils.clamp(
                            event.currentTarget.scrollTop / Math.max(pxPerUnit, 1),
                            0,
                            limit,
                        );
                    }}
                >
                    <div
                        className="pointer-events-none w-px"
                        style={{
                            height: `${size.height + limit * pxPerUnit}px`,
                        }}
                    />
                </div>
            </Html>
        )}
        </>
    );
}
