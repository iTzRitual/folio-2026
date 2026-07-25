"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import { useHeroLayout } from "@/context/HeroLayoutContext";
import { Group, Mesh } from "three";
import { useAnimationContext } from "@/context/AnimationContext";
import { useHeroTransition } from "@/context/HeroTransitionContext";
import {
  DetailsSection,
  type DetailsSectionItem,
} from "./DetailsScene/DetailsSection";
import {
  experienceData,
  projectsData,
  educationData,
  skillsData,
} from "@/data/content";
import {
  DETAILS_SECTIONS,
  calculateDetailsLayout,
} from "@/lib/detailsLayout";
import { CONFIG } from "../config/constants";

export function Details() {
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
  const rootGroupRef = useRef<Group>(null);

  const [headingWidths, setHeadingWidths] = useState<Record<string, number>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const revealedRef = useRef<Record<string, boolean>>({});

  const handleHeadingSync = (key: string) => (mesh: Mesh) => {
    if (!mesh?.geometry) return;

    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox;
    if (!box) return;

    const width = box.max.x - box.min.x;
    setHeadingWidths((prev) => (prev[key] === width ? prev : { ...prev, [key]: width }));
  };

  const layout = useMemo(
    () =>
      calculateDetailsLayout({
        viewportWidth: size.width,
        viewportHeight: size.height,
      }),
    [size.width, size.height],
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

  const gap = viewport.width * CONFIG.detailsLayout.GAP_MULT;
  const bodyColumnX = useMemo(() => {
    const widest = DETAILS_SECTIONS.filter((s) => s.column === "left").reduce(
      (max, s) => Math.max(max, headingWidths[s.key] ?? 0),
      0,
    );
    return leftX + widest + gap;
  }, [leftX, gap, headingWidths]);

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
    for (const section of DETAILS_SECTIONS) {
      if (revealedRef.current[section.key]) continue;

      const worldY =
        groupY + sectionTop - layout.sections[section.key].headingY * pxTo3DHeight;

      if (worldY > revealEdge) {
        revealedRef.current[section.key] = true;
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
        heading="Experience"
        items={experienceItems}
        headingX={leftX}
        headingY={sectionY("experience").headingY}
        bodyX={bodyColumnX}
        bodyY={sectionY("experience").bodyY}
        bodyAnchorX="left"
        direction="leftToRight"
        startTrigger={startTrigger && !!revealed.experience}
        staggerStep={CONFIG.detailsTimings.BODY_STAGGER_STEP}
        onHeadingSync={handleHeadingSync("experience")}
        {...shared}
      />

      <DetailsSection
        heading="Featured Projects"
        items={projectItems}
        headingX={leftX}
        headingY={sectionY("projects").headingY}
        bodyX={bodyColumnX}
        bodyY={sectionY("projects").bodyY}
        bodyAnchorX="left"
        direction="leftToRight"
        startTrigger={startTrigger && !!revealed.projects}
        staggerStep={CONFIG.detailsTimings.BODY_STAGGER_STEP}
        onHeadingSync={handleHeadingSync("projects")}
        {...shared}
      />

      <DetailsSection
        heading="Education"
        items={educationItems}
        headingX={leftX}
        headingY={sectionY("education").headingY}
        bodyX={bodyColumnX}
        bodyY={sectionY("education").bodyY}
        bodyAnchorX="left"
        direction="leftToRight"
        startTrigger={startTrigger && !!revealed.education}
        staggerStep={CONFIG.detailsTimings.BODY_STAGGER_STEP}
        onHeadingSync={handleHeadingSync("education")}
        {...shared}
      />

      <DetailsSection
        heading="Skills"
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
