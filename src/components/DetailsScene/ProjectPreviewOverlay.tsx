"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import * as THREE from "three";
import { PROJECT_PREVIEW_SOURCES } from "@/data/content";
import { applyCurlShader } from "@/lib/detailsCurl";
import { useDebugSettings } from "@/context/DebugSettingsContext";
import { useHeroTransition } from "@/context/HeroTransitionContext";
import {
    useHoveredPreview,
    useProjectHoverActions,
} from "@/context/ProjectHoverContext";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { CONFIG } from "@/config/constants";

/**
 * Written every frame from the plate's own travel. Module scope because there
 * is exactly one preview plate, matching how the details curl shares its
 * uniforms.
 */
const previewUniforms = {
    /** Signed lag of the plate's centre on each axis, in local units. */
    uPreviewBend: { value: new THREE.Vector2() },
    /** Signed per-channel UV split on each axis. */
    uPreviewSplit: { value: new THREE.Vector2() },
    /** Glitch intensity: slice offset, extra split and band flicker. */
    uPreviewGlitch: { value: 0 },
    /** How much of the band pattern has snapped in, 0→1. */
    uPreviewReveal: { value: 0 },
    uPreviewTime: { value: 0 },
    /** Bands, peak slice offset and peak glitch split. */
    uPreviewGlitchParams: { value: new THREE.Vector3() },
    uPreviewTune: { value: new THREE.Vector3(1, 1, 1) },
};

const VERTEX_DEFS = /* glsl */ `
uniform vec2 uPreviewBend;
varying vec2 vPreviewUv;
`;

// The edges lead and the middle trails on both axes, so the plate bows against
// the pointer instead of sliding rigidly.
const VERTEX_BEND = /* glsl */ `
#include <begin_vertex>
transformed.y += uPreviewBend.y * sin(uv.x * 3.141592653589793);
transformed.x += uPreviewBend.x * sin(uv.y * 3.141592653589793);
`;

const FRAGMENT_DEFS = /* glsl */ `
uniform vec2 uPreviewRadiusUv;
uniform vec2 uPreviewSplit;
uniform float uPreviewGlitch;
uniform float uPreviewReveal;
uniform float uPreviewTime;
uniform vec3 uPreviewGlitchParams;
uniform vec3 uPreviewTune;
varying vec2 vPreviewUv;

float previewHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float previewBand() {
  return floor(vPreviewUv.y * uPreviewGlitchParams.x);
}
`;

// Channels smear along the direction of travel, strongest where the plate is
// bending hardest; the glitch cuts the image into bands and slides them apart.
const FRAGMENT_MAP = /* glsl */ `
#ifdef USE_MAP
{
  float band = previewBand();
  float tick = floor(uPreviewTime * ${CONFIG.projectPreview.GLITCH_HZ.toFixed(1)});
  float gate = step(0.55, previewHash(vec2(band + 13.0, tick)));
  float jitter = previewHash(vec2(band, tick)) * 2.0 - 1.0;
  float slice = jitter * gate * uPreviewGlitch * uPreviewGlitchParams.y;

  vec2 uv = vMapUv + vec2(slice, 0.0);
  vec2 offset = vec2(
    uPreviewSplit.x * sin(vPreviewUv.y * 3.141592653589793)
      + uPreviewGlitch * uPreviewGlitchParams.z,
    uPreviewSplit.y * sin(vPreviewUv.x * 3.141592653589793)
  );

  vec4 centerSample = texture2D(map, uv);
  diffuseColor *= vec4(
    texture2D(map, uv + offset).r,
    centerSample.g,
    texture2D(map, uv - offset).b,
    centerSample.a
  );
}
#endif
`;

// Rounded corners, then the band reveal: every band carries its own threshold,
// so the plate snaps in and out strip by strip instead of fading.
const FRAGMENT_ALPHA = /* glsl */ `
{
  float previewLum = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  diffuseColor.rgb = mix(vec3(previewLum), diffuseColor.rgb, uPreviewTune.x);
  diffuseColor.rgb = (diffuseColor.rgb - 0.5) * uPreviewTune.y + 0.5;
  diffuseColor.rgb = max(diffuseColor.rgb * uPreviewTune.z, 0.0);

  vec2 corner =
    max(abs(vPreviewUv - 0.5) - (0.5 - uPreviewRadiusUv), 0.0) / uPreviewRadiusUv;
  float dist = length(corner) - 1.0;
  float edge = clamp(fwidth(dist), 1e-5, 0.5);
  diffuseColor.a *= 1.0 - smoothstep(-edge, edge, dist);
  diffuseColor.a *= step(previewHash(vec2(previewBand(), 7.13)) * 0.9, uPreviewReveal);
}
#include <opaque_fragment>
`;

function previewShader(radiusUv: { value: THREE.Vector2 }) {
    return (shader: THREE.WebGLProgramParametersWithUniforms) => {
        // First, so the bend lands inside the curl's own begin_vertex: the
        // plate bends for the pointer, then that bent shape rolls around the
        // sheet's fold. Without the curl's fade — the gradient scrim already
        // covers both ends, and the plate is meant to stay solid under it.
        applyCurlShader(shader, false);

        shader.uniforms.uPreviewRadiusUv = radiusUv;
        shader.uniforms.uPreviewBend = previewUniforms.uPreviewBend;
        shader.uniforms.uPreviewSplit = previewUniforms.uPreviewSplit;
        shader.uniforms.uPreviewGlitch = previewUniforms.uPreviewGlitch;
        shader.uniforms.uPreviewReveal = previewUniforms.uPreviewReveal;
        shader.uniforms.uPreviewTime = previewUniforms.uPreviewTime;
        shader.uniforms.uPreviewGlitchParams =
            previewUniforms.uPreviewGlitchParams;
        shader.uniforms.uPreviewTune = previewUniforms.uPreviewTune;

        shader.vertexShader = VERTEX_DEFS + shader.vertexShader;
        shader.vertexShader = shader.vertexShader
            .replace("void main() {", "void main() {\n  vPreviewUv = uv;")
            .replace("#include <begin_vertex>", VERTEX_BEND);

        shader.fragmentShader = FRAGMENT_DEFS + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader
            .replace("#include <map_fragment>", FRAGMENT_MAP)
            .replace("#include <opaque_fragment>", FRAGMENT_ALPHA);
    };
}

/**
 * Loads every project preview up front. Hovering a row must show the plate on
 * the same frame, and a texture fetch started then would arrive late.
 */
function useProjectPreviewTextures() {
    const [textures, setTextures] = useState<Record<string, THREE.Texture>>({});

    useEffect(() => {
        const loader = new THREE.TextureLoader();
        const loaded: Record<string, THREE.Texture> = {};
        let cancelled = false;

        for (const src of PROJECT_PREVIEW_SOURCES) {
            loader.load(src, (texture) => {
                if (cancelled) {
                    texture.dispose();
                    return;
                }
                texture.colorSpace = THREE.SRGBColorSpace;
                loaded[src] = texture;
                setTextures({ ...loaded });
            });
        }

        return () => {
            cancelled = true;
            for (const texture of Object.values(loaded)) texture.dispose();
        };
    }, []);

    return textures;
}

export function ProjectPreviewOverlay() {
    const { viewport } = useThree();
    const { progressRef } = useHeroTransition();
    const prefersReducedMotion = usePrefersReducedMotion();
    const debug = useDebugSettings();

    const textures = useProjectPreviewTextures();
    const hoveredPreview = useHoveredPreview();
    const { resetHoveredPreview, chargeRef } = useProjectHoverActions();
    // Keep the last hovered preview around so the plate can glitch back out
    // with the right screenshot still on it.
    const [shownPreview, setShownPreview] = useState<string | null>(null);
    if (hoveredPreview && hoveredPreview !== shownPreview) {
        setShownPreview(hoveredPreview);
    }
    const active = hoveredPreview !== null;

    const groupRef = useRef<THREE.Group>(null);
    const materialRef = useRef<THREE.MeshBasicMaterial>(null);
    const radiusUv = useMemo(() => ({ value: new THREE.Vector2(1, 1) }), []);
    const applyShader = useMemo(() => previewShader(radiusUv), [radiusUv]);

    const cfg = CONFIG.projectPreview;
    const tuning = debug.projectPreview;

    const width = viewport.width * cfg.WIDTH_FRACTION * tuning.sizeMult;
    const height = width / cfg.ASPECT;
    const radius = Math.min(
        height * cfg.CORNER_RADIUS_MULT,
        width / 2,
        height / 2,
    );

    useLayoutEffect(() => {
        radiusUv.value.set(
            Math.max(radius / width, 1e-4),
            Math.max(radius / height, 1e-4),
        );
    }, [radiusUv, radius, width, height]);

    useLayoutEffect(() => {
        previewUniforms.uPreviewGlitchParams.value.set(
            cfg.GLITCH_BANDS,
            tuning.glitchSlice,
            tuning.glitchSplit,
        );
    }, [cfg.GLITCH_BANDS, tuning.glitchSlice, tuning.glitchSplit]);

    // Swapping the map in and out of null changes the program.
    useLayoutEffect(() => {
        if (materialRef.current) materialRef.current.needsUpdate = true;
    }, [shownPreview]);

    const proxy = useRef({ reveal: 0, glitch: 0, opacity: 0, scale: 1 });
    const plateDepth = useRef(
        new THREE.Vector3(0, 0, CONFIG.scene.DETAILS_GROUP_Z),
    );
    const motion = useRef({
        pointer: new THREE.Vector2(),
        velocity: new THREE.Vector2(),
        seeded: false,
    });

    useGSAP(
        () => {
            const state = proxy.current;
            gsap.killTweensOf(state);

            if (prefersReducedMotion) {
                state.reveal = active ? 1 : 0;
                state.glitch = 0;
                state.scale = 1;
                gsap.to(state, { opacity: active ? 1 : 0, duration: 0.2 });
                return;
            }

            if (active) {
                state.opacity = 1;
                gsap.to(state, {
                    reveal: 1,
                    duration: cfg.ENTER_REVEAL_DURATION,
                    ease: "steps(5)",
                });
                gsap.fromTo(
                    state,
                    { glitch: 1 },
                    {
                        glitch: 0,
                        duration: cfg.ENTER_GLITCH_DURATION,
                        ease: "power2.out",
                    },
                );
                gsap.fromTo(
                    state,
                    { scale: cfg.ENTER_SCALE_FROM },
                    {
                        scale: 1,
                        duration: cfg.ENTER_SCALE_DURATION,
                        ease: "back.out(2)",
                    },
                );
                return;
            }

            gsap
                .timeline()
                .to(state, {
                    glitch: 1,
                    duration: cfg.EXIT_GLITCH_DURATION,
                    ease: "power2.in",
                })
                .to(
                    state,
                    {
                        reveal: 0,
                        duration: cfg.EXIT_REVEAL_DURATION,
                        ease: "steps(4)",
                    },
                    0,
                )
                .to(
                    state,
                    {
                        scale: cfg.EXIT_SCALE_TO,
                        duration: cfg.EXIT_REVEAL_DURATION,
                        ease: "power2.in",
                    },
                    0,
                )
                .set(state, { opacity: 0, glitch: 0 }, cfg.EXIT_REVEAL_DURATION);
        },
        // Keyed on whether *any* project is hovered, not on which one — sweeping
        // down the list swaps the screenshot without replaying the entrance.
        { dependencies: [active, prefersReducedMotion] },
    );

    // The screenshot changing under a plate that is already up gets its own
    // short burst, so the swap happens inside the noise rather than as a cut.
    useGSAP(
        () => {
            if (!active || prefersReducedMotion) return;
            const state = proxy.current;
            gsap.fromTo(
                state,
                { glitch: 1 },
                {
                    glitch: 0,
                    duration: cfg.SWAP_GLITCH_DURATION,
                    ease: "power2.out",
                },
            );
        },
        { dependencies: [shownPreview] },
    );

    useFrame((state, delta) => {
        const group = groupRef.current;
        if (!group) return;

        const dt = Math.min(delta, 1 / 30);
        const values = proxy.current;

        // The rows are transform-positioned, so one sliding out from under a
        // stationary cursor can leave the hover held past the list. Nothing
        // outside the details stage may keep the plate on screen.
        if (active && progressRef.current < CONFIG.model.DETAILS_POPUP_START) {
            resetHoveredPreview();
        }

        // The plate sits on the details sheet's own plane, so the curl treats
        // it as part of the sheet rather than as something lifted off it.
        const plateViewport = state.viewport.getCurrentViewport(
            state.camera,
            plateDepth.current,
        );
        const targetX = (state.pointer.x * plateViewport.width) / 2;
        const targetY = (state.pointer.y * plateViewport.height) / 2;

        const move = motion.current;
        if (!move.seeded) {
            group.position.set(targetX, targetY, CONFIG.scene.DETAILS_GROUP_Z);
            move.pointer.set(state.pointer.x, state.pointer.y);
            move.seeded = true;
        }

        group.position.x = THREE.MathUtils.damp(
            group.position.x,
            targetX,
            cfg.FOLLOW_SMOOTHING,
            dt,
        );
        group.position.y = THREE.MathUtils.damp(
            group.position.y,
            targetY,
            cfg.FOLLOW_SMOOTHING,
            dt,
        );

        const charge = chargeRef.current;
        const gain = prefersReducedMotion ? 0 : cfg.CHARGE_SCALE_GAIN * charge;
        group.scale.setScalar(values.scale * (1 + gain));

        const rawX = (state.pointer.x - move.pointer.x) / Math.max(dt, 1e-4);
        const rawY = (state.pointer.y - move.pointer.y) / Math.max(dt, 1e-4);
        move.pointer.set(state.pointer.x, state.pointer.y);

        // Chasing the raw reading rounds off the spikes on the way in and lets
        // the plate spring back on its own once the pointer settles.
        move.velocity.set(
            THREE.MathUtils.damp(
                move.velocity.x,
                rawX,
                tuning.velocitySmoothing,
                dt,
            ),
            THREE.MathUtils.damp(
                move.velocity.y,
                rawY,
                tuning.velocitySmoothing,
                dt,
            ),
        );

        // Not the reveal: that one steps, and the bend would step with it.
        const presence = prefersReducedMotion ? 0 : values.opacity;
        const travelX =
            THREE.MathUtils.clamp(
                move.velocity.x / tuning.velocityFullScale,
                -1,
                1,
            ) * presence;
        const travelY =
            THREE.MathUtils.clamp(
                move.velocity.y / tuning.velocityFullScale,
                -1,
                1,
            ) * presence;

        // Negated: the centre lags behind, so it trails the direction of travel.
        previewUniforms.uPreviewBend.value.set(
            -travelX * tuning.bendMult * width,
            -travelY * tuning.bendMult * height,
        );
        const rest = 1 - charge;
        const restGlitch = prefersReducedMotion ? 0 : rest * cfg.REST_GLITCH;
        previewUniforms.uPreviewSplit.value.set(
            travelX * tuning.aberrationMult + rest * cfg.REST_ABERRATION,
            travelY * tuning.aberrationMult,
        );
        previewUniforms.uPreviewTune.value.set(
            THREE.MathUtils.lerp(
                cfg.TUNE_SATURATION[0],
                cfg.TUNE_SATURATION[1],
                charge,
            ),
            THREE.MathUtils.lerp(
                cfg.TUNE_CONTRAST[0],
                cfg.TUNE_CONTRAST[1],
                charge,
            ),
            THREE.MathUtils.lerp(
                cfg.TUNE_BRIGHTNESS[0],
                cfg.TUNE_BRIGHTNESS[1],
                charge,
            ),
        );
        previewUniforms.uPreviewReveal.value = values.reveal;
        previewUniforms.uPreviewGlitch.value = tuning.pinGlitch
            ? tuning.pinnedGlitch
            : Math.max(values.glitch, restGlitch);
        previewUniforms.uPreviewTime.value = state.clock.getElapsedTime();

        const texture = shownPreview ? (textures[shownPreview] ?? null) : null;
        group.visible = values.opacity > 1e-3 && texture !== null;
        if (materialRef.current) materialRef.current.opacity = values.opacity;
    });

    return (
        <group
            ref={groupRef}
            position={[0, 0, CONFIG.scene.DETAILS_GROUP_Z]}
            visible={false}
        >
            <mesh renderOrder={cfg.RENDER_ORDER} raycast={() => null}>
                <planeGeometry
                    args={[
                        width,
                        height,
                        cfg.BEND_SEGMENTS_X,
                        cfg.BEND_SEGMENTS_Y,
                    ]}
                />
                <meshBasicMaterial
                    ref={materialRef}
                    map={shownPreview ? (textures[shownPreview] ?? null) : null}
                    toneMapped={false}
                    transparent
                    opacity={0}
                    depthTest={false}
                    depthWrite={false}
                    onBeforeCompile={applyShader}
                />
            </mesh>
        </group>
    );
}
