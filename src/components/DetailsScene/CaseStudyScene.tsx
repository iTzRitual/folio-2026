"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFrame, useStore, useThree } from "@react-three/fiber";
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
    const pushedHistory = useRef(false);
    const contentRef = useRef<THREE.Group>(null);

    // The frame the camera lands in, which every measurement below is authored
    // against: the plate stays the same size in world units the whole way, so
    // the frame is only ever a matter of how close the camera gets to it.
    const plateWidth =
        viewport.width * CONFIG.projectPreview.WIDTH_FRACTION * tuning.sizeMult;
    const plateHeight = plateWidth / CONFIG.projectPreview.ASPECT;
    const distance =
        (cfg.CAMERA_REST_Z * plateWidth) / (cfg.FILL * viewport.width);
    const frameWidth = plateWidth / cfg.FILL;
    const frameHeight = frameWidth / (viewport.width / viewport.height);
    const em = frameWidth * cfg.EM_MULT;
    const textWidth = frameWidth * cfg.TEXT_WIDTH_MULT;
    const pxPerUnit = frameWidth > 0 ? size.width / frameWidth : 0;

    const layout = useCaseStudyLayout(study, em, textWidth, pxPerUnit);

    useEffect(() => {
        if (openIndex === null) {
            gsap.to(caseStudyStage, {
                progress: 0,
                duration: prefersReducedMotion ? 0 : cfg.CLOSE_DURATION,
                ease: "power3.inOut",
                overwrite: true,
            });
            return;
        }

        anchor.current.copy(caseStudyStage.pose);
        scroll.current = 0;
        scrollTarget.current = 0;
        gsap.fromTo(
            caseStudyStage,
            { progress: 0 },
            {
                progress: 1,
                duration: prefersReducedMotion ? 0 : cfg.FLIGHT_DURATION,
                ease: "power3.inOut",
                overwrite: true,
            },
        );
    }, [openIndex, prefersReducedMotion]);

    // The site is one persistent canvas, so a real route change would tear down
    // the scene and the plate's video with it. The URL is rewritten underneath
    // instead, which is enough for the address bar and for browser back.
    useEffect(() => {
        if (openIndex === null) return;

        const { slug } = projectsData[openIndex];
        window.history.pushState(null, "", `/projects/${slug}`);
        pushedHistory.current = true;

        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") close();
        };
        // Back has already popped the entry we pushed, so the close must not
        // try to pop it a second time.
        const onPopState = () => {
            pushedHistory.current = false;
            close();
        };

        window.addEventListener("keydown", onKey);
        window.addEventListener("popstate", onPopState);

        return () => {
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("popstate", onPopState);
            if (!pushedHistory.current) return;
            pushedHistory.current = false;
            window.history.back();
        };
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
        if (openIndex === null) return;

        const limit = Math.max(
            layout.height + frameHeight * cfg.SCROLL_OVERSHOOT_MULT,
            0,
        );
        // Capture phase, and stopped for good: the page's smooth-scroll runner
        // listens on window and scrolls the document itself, which `overflow:
        // hidden` does nothing about. Taking the event before it reaches anyone
        // is the only way to keep the wheel without tearing that runner down.
        const onWheel = (event: WheelEvent) => {
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
    }, [openIndex, size.height, frameHeight, layout.height]);

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
    }, -1);

    return (
        <group ref={contentRef} visible={false}>
            {study && (
                <CaseStudyCopy
                    layout={layout}
                    progressRef={reveal}
                    pxPerUnit={pxPerUnit}
                />
            )}
        </group>
    );
}
