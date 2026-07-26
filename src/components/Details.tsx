"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import { useHeroLayout } from "@/context/HeroLayoutContext";
import { Group } from "three";
import { useAnimationContext } from "@/context/AnimationContext";
import { useHeroTransition } from "@/context/HeroTransitionContext";
import { useFontsReady } from "@/hooks/useFontsReady";
import {
  DetailsSection,
  type DetailsSectionItem,
} from "./DetailsScene/DetailsSection";
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
  calculateDetailsLayout,
} from "@/lib/detailsLayout";
import { CONFIG } from "../config/constants";

export function Details({
  bioVariant = DEFAULT_BIO_VARIANT,
}: {
  bioVariant?: BioVariant;
}) {
  const {
    size,
    viewport,
    marginY,
    leftX,
    rightX,
    pxTo3DWidth,
    pxTo3DHeight,
  } = useHeroLayout();
  const { startTrigger } = useAnimationContext();
  const { progressRef, detailsScrollRef } = useHeroTransition();
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

    const revealEdge =
      -viewport.height / 2 +
      viewport.height * CONFIG.detailsLayout.REVEAL_MARGIN_MULT;

    let changed = false;
    for (const key of Object.keys(layout.sections)) {
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

  const bioItems: DetailsSectionItem[] = useMemo(
    () => layout.bioLines.map((line) => ({ text: line })),
    [layout.bioLines],
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

      <DetailsSection
        heading={SECTION_HEADINGS.bio}
        items={bioItems}
        headingX={leftX}
        headingY={sectionY("bio").headingY}
        bodyX={bodyColumnX}
        bodyY={sectionY("bio").bodyY}
        bodyAnchorX="left"
        direction="leftToRight"
        startTrigger={startTrigger && !!revealed.bio}
        staggerStep={CONFIG.detailsTimings.BODY_STAGGER_STEP}
        {...shared}
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
