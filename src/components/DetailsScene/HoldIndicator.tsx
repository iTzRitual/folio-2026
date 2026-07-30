"use client";

import {
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type MutableRefObject,
} from "react";
import { Text } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import * as THREE from "three";
import { CONFIG, FONTS } from "@/config/constants";
import { useTheme } from "@/context/ThemeContext";
import {
    useHoveredPreview,
    useProjectHoverActions,
} from "@/context/ProjectHoverContext";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const ringUniforms = {
    uCharge: { value: 0 },
    uOpacity: { value: 0 },
    uThickness: { value: 0 },
    uTrackOpacity: { value: 0 },
    uColor: { value: new THREE.Color() },
    uHalo: { value: 0 },
    uHaloOpacity: { value: 0 },
    uHaloColor: { value: new THREE.Color() },
};

const RING_VERTEX = /* glsl */ `
varying vec2 vRingUv;
void main() {
  vRingUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const RING_FRAGMENT = /* glsl */ `
uniform float uCharge;
uniform float uOpacity;
uniform float uThickness;
uniform float uTrackOpacity;
uniform vec3 uColor;
uniform float uHalo;
uniform float uHaloOpacity;
uniform vec3 uHaloColor;
varying vec2 vRingUv;

const float TAU = 6.283185307179586;

void main() {
  vec2 p = vRingUv - 0.5;
  float mid = 0.5 - uThickness * 0.5 - uHalo;
  float d = abs(length(p) - mid) - uThickness * 0.5;
  float edge = fwidth(d);
  float band = 1.0 - smoothstep(-edge, edge, d);
  float halo = 1.0 - smoothstep(-edge, edge, d - uHalo);

  float angle = atan(p.x, p.y);
  angle += step(angle, 0.0) * TAU;
  float feather = min(fwidth(angle), 0.12);
  float filled =
    1.0 - smoothstep(uCharge * TAU - feather, uCharge * TAU + feather, angle);

  float ink = band * mix(uTrackOpacity, 1.0, filled);
  float backing = halo * uHaloOpacity * (1.0 - band);
  float alpha = (ink + backing) * uOpacity;
  if (alpha <= 0.001) discard;

  vec3 color = (uColor * ink + uHaloColor * backing) / max(ink + backing, 1e-4);
  gl_FragColor = vec4(color, alpha);
}
`;

const CLICK_LEAD = "CLICK";
const CLICK_LINE = "CLICK — CASE STUDY";
const HOLD_LEAD = "HOLD";
const HOLD_LINE = "HOLD — LIVE SITE";
const OPENING_LEAD = "OPENING";
const OPENING_LINE = "OPENING — LIVE SITE";

type TroikaText = THREE.Mesh & { outlineOpacity: number };

interface LabelLineProps {
    line: string;
    lead: string;
    x: number;
    y: number;
    fontSize: number;
    leadColor: string;
    lineColor: string;
    outlineColor: string;
    opacityRef: MutableRefObject<number>;
}

function LabelLine({
    line,
    lead,
    x,
    y,
    fontSize,
    leadColor,
    lineColor,
    outlineColor,
    opacityRef,
}: LabelLineProps) {
    const lineMaterial = useRef<THREE.MeshBasicMaterial>(null);
    const leadMaterial = useRef<THREE.MeshBasicMaterial>(null);
    const lineText = useRef<TroikaText>(null);
    const leadText = useRef<TroikaText>(null);
    const cfg = CONFIG.holdIndicator;

    useFrame(() => {
        const opacity = opacityRef.current;
        const outline = opacity * cfg.LABEL_OUTLINE_OPACITY;
        if (lineMaterial.current) lineMaterial.current.opacity = opacity;
        if (leadMaterial.current) leadMaterial.current.opacity = opacity;
        if (lineText.current) lineText.current.outlineOpacity = outline;
        if (leadText.current) leadText.current.outlineOpacity = outline;
    });

    const shared = {
        position: [x, y, 0] as [number, number, number],
        anchorX: "left" as const,
        anchorY: "middle" as const,
        fontSize,
        font: FONTS.karlaExtraBold,
        letterSpacing: cfg.LABEL_LETTER_SPACING,
        outlineWidth: fontSize * cfg.LABEL_OUTLINE_EM,
        outlineBlur: fontSize * cfg.LABEL_OUTLINE_BLUR_EM,
        outlineColor,
        outlineOpacity: 0,
    };

    return (
        <>
            <Text ref={lineText} {...shared} renderOrder={cfg.RENDER_ORDER}>
                {line}
                <meshBasicMaterial
                    ref={lineMaterial}
                    color={lineColor}
                    transparent
                    opacity={0}
                    depthTest={false}
                    depthWrite={false}
                    toneMapped={false}
                />
            </Text>
            <Text ref={leadText} {...shared} renderOrder={cfg.RENDER_ORDER + 1}>
                {lead}
                <meshBasicMaterial
                    ref={leadMaterial}
                    color={leadColor}
                    transparent
                    opacity={0}
                    depthTest={false}
                    depthWrite={false}
                    toneMapped={false}
                />
            </Text>
        </>
    );
}

export function HoldIndicator() {
    const { palette } = useTheme();
    const { viewport, camera, size } = useThree();
    const prefersReducedMotion = usePrefersReducedMotion();
    const { chargeRef } = useProjectHoverActions();
    const active = useHoveredPreview() !== null;
    const [opening, setOpening] = useState(false);

    const cfg = CONFIG.holdIndicator;
    const groupRef = useRef<THREE.Group>(null);
    const ringRef = useRef<THREE.Mesh>(null);
    const opacityRef = useRef(0);
    const proxy = useRef({ opacity: 0 });
    const depth = useMemo(
        () => new THREE.Vector3(0, 0, CONFIG.scene.DETAILS_GROUP_Z),
        [],
    );

    useLayoutEffect(() => {
        ringUniforms.uThickness.value =
            cfg.RING_THICKNESS_PX / cfg.RING_DIAMETER_PX;
        ringUniforms.uTrackOpacity.value = cfg.RING_TRACK_OPACITY;
        ringUniforms.uColor.value.set(palette.textPrimary);
        ringUniforms.uHalo.value = cfg.RING_HALO_PX / cfg.RING_DIAMETER_PX;
        ringUniforms.uHaloOpacity.value = cfg.RING_HALO_OPACITY;
        ringUniforms.uHaloColor.value.set(palette.bg);
    }, [
        cfg.RING_THICKNESS_PX,
        cfg.RING_DIAMETER_PX,
        cfg.RING_TRACK_OPACITY,
        cfg.RING_HALO_PX,
        cfg.RING_HALO_OPACITY,
        palette.textPrimary,
        palette.bg,
    ]);

    const plateViewport = viewport.getCurrentViewport(camera, depth);
    const unitsPerPx = plateViewport.width / size.width;
    const diameter = cfg.RING_DIAMETER_PX * unitsPerPx;
    const labelX = cfg.LABEL_OFFSET_PX[0] * unitsPerPx;
    const labelY = -cfg.LABEL_OFFSET_PX[1] * unitsPerPx;
    const fontSize = cfg.LABEL_FONT_PX * unitsPerPx;

    useGSAP(
        () => {
            gsap.killTweensOf(proxy.current);
            gsap.to(proxy.current, {
                opacity: active ? 1 : 0,
                duration: cfg.FADE_DURATION,
                ease: "power2.out",
            });
            if (!active) setOpening(false);
        },
        { dependencies: [active, cfg.FADE_DURATION] },
    );

    useFrame((state) => {
        const group = groupRef.current;
        if (!group) return;

        opacityRef.current = proxy.current.opacity;
        ringUniforms.uOpacity.value = proxy.current.opacity;
        group.visible = proxy.current.opacity > 1e-3;

        const view = state.viewport.getCurrentViewport(state.camera, depth);
        group.position.set(
            (state.pointer.x * view.width) / 2,
            (state.pointer.y * view.height) / 2,
            CONFIG.scene.DETAILS_GROUP_Z,
        );

        const charge = chargeRef.current;
        const shown = prefersReducedMotion
            ? Math.round(charge * 5) / 5
            : charge;
        ringUniforms.uCharge.value = shown;
        ringRef.current?.scale.setScalar(
            THREE.MathUtils.lerp(cfg.RING_SCALE[0], cfg.RING_SCALE[1], shown),
        );

        if (charge >= 1 && !opening) setOpening(true);
        else if (charge <= 0 && opening) setOpening(false);
    });

    return (
        <group ref={groupRef} visible={false}>
            <mesh ref={ringRef} renderOrder={cfg.RENDER_ORDER}>
                <planeGeometry args={[diameter, diameter]} />
                <shaderMaterial
                    vertexShader={RING_VERTEX}
                    fragmentShader={RING_FRAGMENT}
                    uniforms={ringUniforms}
                    transparent
                    depthTest={false}
                    depthWrite={false}
                />
            </mesh>

            <LabelLine
                line={CLICK_LINE}
                lead={CLICK_LEAD}
                x={labelX}
                y={labelY}
                fontSize={fontSize}
                leadColor={palette.textPrimary}
                lineColor={palette.textHint}
                outlineColor={palette.bg}
                opacityRef={opacityRef}
            />
            <LabelLine
                line={opening ? OPENING_LINE : HOLD_LINE}
                lead={opening ? OPENING_LEAD : HOLD_LEAD}
                x={labelX}
                y={labelY - cfg.LABEL_LINE_PX * unitsPerPx}
                fontSize={fontSize}
                leadColor={palette.textPrimary}
                lineColor={palette.textHint}
                outlineColor={palette.bg}
                opacityRef={opacityRef}
            />
        </group>
    );
}
