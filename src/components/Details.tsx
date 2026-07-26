"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useControls } from "leva";
import { useHeroLayout } from "@/context/HeroLayoutContext";
import { Group } from "three";
import { useAnimationContext } from "@/context/AnimationContext";
import { useHeroTransition } from "@/context/HeroTransitionContext";
import { useFontsReady } from "@/hooks/useFontsReady";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import {
  DetailsSection,
  type DetailsSectionItem,
} from "./DetailsScene/DetailsSection";
import { BioSection } from "./DetailsScene/BioSection";
import {
  experienceData,
  projectsData,
  educationData,
  skillsData,
  DEFAULT_BIO_VARIANT,
  type BioVariant,
} from "@/data/content";
import {
  SECTION_HEADINGS,
  DETAILS_SECTION_KEYS,
  calculateDetailsLayout,
} from "@/lib/detailsLayout";
import { applyCurlSettings, type CurlSettings } from "@/lib/detailsCurl";
import { CONFIG } from "../config/constants";

const CURL_DEFAULTS: CurlSettings = {
  foldOffsetMult: CONFIG.detailsCurl.FOLD_OFFSET_MULT,
  radiusMult: CONFIG.detailsCurl.RADIUS_MULT,
  maxAngle: CONFIG.detailsCurl.MAX_ANGLE,
  fadeAngleStart: CONFIG.detailsCurl.FADE_ANGLE_START,
  fadeAngleEnd: CONFIG.detailsCurl.FADE_ANGLE_END,
  bend: 1,
};

const CURL_LEVA_SCHEMA = {
  foldOffsetMult: {
    value: CURL_DEFAULTS.foldOffsetMult,
    min: -0.3,
    max: 0.3,
    step: 0.005,
  },
  radiusMult: {
    value: CURL_DEFAULTS.radiusMult,
    min: 0.03,
    max: 1,
    step: 0.005,
  },
  maxAngle: { value: CURL_DEFAULTS.maxAngle, min: 0.2, max: 3, step: 0.01 },
  fadeAngleStart: {
    value: CURL_DEFAULTS.fadeAngleStart,
    min: 0,
    max: 2,
    step: 0.01,
  },
  fadeAngleEnd: {
    value: CURL_DEFAULTS.fadeAngleEnd,
    min: 0.05,
    max: 3,
    step: 0.01,
  },
};

export function Details({
  bioVariant = DEFAULT_BIO_VARIANT,
  isDebug = false,
}: {
  bioVariant?: BioVariant;
  isDebug?: boolean;
}) {
  const {
    size,
    viewport,
    marginY,
    leftX,
    rightX,
    pxTo3DWidth,
    pxTo3DHeight,
    titleSettledBottomY,
  } = useHeroLayout();

  const prefersReducedMotion = usePrefersReducedMotion();
  const levaCurl = useControls("Details curl", CURL_LEVA_SCHEMA);
  const curl = isDebug ? levaCurl : CURL_DEFAULTS;
  const {
    foldOffsetMult,
    radiusMult,
    maxAngle,
    fadeAngleStart,
    fadeAngleEnd,
  } = curl;

  const { startTrigger } = useAnimationContext();
  const { progressRef, detailsScrollRef, modelAnchorRef } = useHeroTransition();
  const fontsReady = useFontsReady();
  const rootGroupRef = useRef<Group>(null);

  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const revealedRef = useRef<Record<string, boolean>>({});

  const layout = useMemo(
    () =>
      calculateDetailsLayout({
        viewportWidth: size.width,
        viewportHeight: size.height,
        bioVariant,
        fontsReady,
      }),
    [size.width, size.height, bioVariant, fontsReady],
  );

  const headingSize = layout.headingFontSize * pxTo3DWidth;
  const bodySize = layout.bodyFontSize * pxTo3DWidth;
  const bodyLineHeight = layout.bodyLineHeight * pxTo3DHeight;

  const sectionTravel =
    viewport.height * CONFIG.detailsLayout.SECTION_TRAVEL_MULT;
  const targetBaseY = viewport.height * CONFIG.detailsLayout.TARGET_BASE_Y_MULT;
  const sectionTop =
    viewport.height / 2 - marginY * CONFIG.detailsLayout.SECTION_TOP_OFF_MULT;

  const sectionY = (key: string) => {
    const offsets = layout.sections[key];
    return {
      headingY: sectionTop - offsets.headingY * pxTo3DHeight,
      bodyY: sectionTop - offsets.bodyY * pxTo3DHeight,
    };
  };

  const contentRestY = targetBaseY + sectionTop;

  useLayoutEffect(() => {
    applyCurlSettings(viewport.height, titleSettledBottomY, contentRestY, {
      foldOffsetMult,
      radiusMult,
      maxAngle,
      fadeAngleStart,
      fadeAngleEnd,
      bend: prefersReducedMotion ? 0 : 1,
    });
  }, [
    viewport.height,
    titleSettledBottomY,
    contentRestY,
    foldOffsetMult,
    radiusMult,
    maxAngle,
    fadeAngleStart,
    fadeAngleEnd,
    prefersReducedMotion,
  ]);

  const bodyColumnX = leftX + layout.bodyColumnOffset * pxTo3DWidth;

  const rightTitleX =
    rightX - viewport.width * CONFIG.detailsLayout.RIGHT_TITLE_OFFSET_MULT;

  useFrame(() => {
    const baseY =
      -sectionTravel + (sectionTravel + targetBaseY) * progressRef.current;
    const groupY = baseY + detailsScrollRef.current * pxTo3DHeight;

    if (rootGroupRef.current) {
      rootGroupRef.current.position.y = groupY;
    }

    const projects = layout.sections.projects;
    const projectsCenter =
      projects.bodyY + (projectsData.length * layout.bodyLineHeight) / 2;

    modelAnchorRef.current.xFraction = CONFIG.model.DETAILS_POPUP_X_FACTOR;
    modelAnchorRef.current.yFraction =
      (groupY + sectionTop - projectsCenter * pxTo3DHeight) / viewport.height;

    const revealEdge =
      -viewport.height / 2 +
      viewport.height * CONFIG.detailsLayout.REVEAL_MARGIN_MULT;

    let changed = false;
    for (const key of DETAILS_SECTION_KEYS) {
      if (revealedRef.current[key]) continue;

      const worldY =
        groupY + sectionTop - layout.sections[key].headingY * pxTo3DHeight;

      if (worldY > revealEdge) {
        revealedRef.current[key] = true;
        changed = true;
      }
    }

    if (changed) setRevealed({ ...revealedRef.current });
  });

  const experienceItems: DetailsSectionItem[] = useMemo(
    () =>
      experienceData.map((exp) => ({
        text: `${exp.duration} / ${exp.position} @ ${exp.company}`,
      })),
    [],
  );

  const projectItems: DetailsSectionItem[] = useMemo(
    () => projectsData.map((project) => ({ text: project.name, href: project.link })),
    [],
  );

  const educationItems: DetailsSectionItem[] = useMemo(
    () =>
      educationData.map((edu) => ({
        text: `${edu.field} (${edu.degree}) @ ${edu.institution}`,
      })),
    [],
  );

  const skillItems: DetailsSectionItem[] = useMemo(
    () => skillsData.map((skill) => ({ text: skill })),
    [],
  );

  const shared = {
    headingFontSize: headingSize,
    bodyFontSize: bodySize,
    bodyLineHeight,
    pxTo3DWidth,
  };

  return (
    <group position={[0, -sectionTravel, -0.05]} ref={rootGroupRef}>
      <DetailsSection
        heading={SECTION_HEADINGS.experience}
        items={experienceItems}
        headingX={leftX}
        headingY={sectionY("experience").headingY}
        bodyX={bodyColumnX}
        bodyY={sectionY("experience").bodyY}
        bodyAnchorX="left"
        direction="leftToRight"
        startTrigger={startTrigger && !!revealed.experience}
        staggerStep={CONFIG.detailsTimings.BODY_STAGGER_STEP}
        {...shared}
      />

      <DetailsSection
        heading={SECTION_HEADINGS.projects}
        items={projectItems}
        headingX={leftX}
        headingY={sectionY("projects").headingY}
        bodyX={bodyColumnX}
        bodyY={sectionY("projects").bodyY}
        bodyAnchorX="left"
        direction="leftToRight"
        startTrigger={startTrigger && !!revealed.projects}
        staggerStep={CONFIG.detailsTimings.BODY_STAGGER_STEP}
        {...shared}
      />

      <DetailsSection
        heading={SECTION_HEADINGS.education}
        items={educationItems}
        headingX={leftX}
        headingY={sectionY("education").headingY}
        bodyX={bodyColumnX}
        bodyY={sectionY("education").bodyY}
        bodyAnchorX="left"
        direction="leftToRight"
        startTrigger={startTrigger && !!revealed.education}
        staggerStep={CONFIG.detailsTimings.BODY_STAGGER_STEP}
        {...shared}
      />

      <BioSection
        heading={SECTION_HEADINGS.bio}
        lines={layout.bioLines}
        headingX={leftX}
        headingY={sectionY("bio").headingY}
        contentY={sectionY("bio").bodyY}
        imageWidth={layout.bioImageWidth * pxTo3DWidth}
        imageHeight={layout.bioImageHeight * pxTo3DHeight}
        textX={leftX + layout.bioTextOffset * pxTo3DWidth}
        headingFontSize={headingSize}
        bodyFontSize={bodySize}
        bodyLineHeight={bodyLineHeight}
        pxTo3DWidth={pxTo3DWidth}
        startTrigger={startTrigger && !!revealed.bio}
      />

      <DetailsSection
        heading={SECTION_HEADINGS.skills}
        items={skillItems}
        headingX={rightTitleX}
        headingY={sectionY("skills").headingY}
        bodyX={rightX}
        bodyY={sectionY("skills").bodyY}
        bodyAnchorX="right"
        direction="rightToLeft"
        startTrigger={startTrigger && !!revealed.skills}
        staggerStep={CONFIG.detailsTimings.SKILLS_STAGGER_STEP}
        {...shared}
      />
    </group>
  );
}
