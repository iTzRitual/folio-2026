"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import { useHeroLayout } from "@/context/HeroLayoutContext";
import { Group, Mesh } from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useAnimationContext } from "@/context/AnimationContext";
import { SelectableRevealText } from "./DetailsScene/SelectableRevealText";
import {
  experienceData,
  projectsData,
  educationData,
  skillsData,
} from "@/data/content";
import { CONFIG, THEME } from "../config/constants";

gsap.registerPlugin(ScrollTrigger);

export function Details() {
  const { viewport, marginX, marginY, leftX, rightX, pxTo3DWidth } =
    useHeroLayout();
  const { startTrigger } = useAnimationContext();
  const progressRef = useRef(0);
  const rootGroupRef = useRef<Group>(null);

  useGSAP(() => {
    const scrollState = { progress: 0 };

    const tween = gsap.to(scrollState, {
      progress: 1,
      ease: "none",
      scrollTrigger: {
        trigger: document.body,
        start: "top top",
        end: CONFIG.detailsLayout.SCROLL_TRIGGER_END,
        scrub: true,
      },
      onUpdate: () => {
        progressRef.current = Math.min(Math.max(scrollState.progress, 0), 1);
      },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  const [titleWidths, setTitleWidths] = useState({
    experience: 0,
    projects: 0,
    education: 0,
  });

  const handleTitleSync = (titleKey: string) => (mesh: Mesh) => {
    if (mesh?.geometry) {
      mesh.geometry.computeBoundingBox();

      if (mesh.geometry.boundingBox) {
        const { max, min } = mesh.geometry.boundingBox;
        const width = max.x - min.x;

        setTitleWidths((prev) => {
          if (prev[titleKey as keyof typeof prev] === width) return prev;
          return { ...prev, [titleKey]: width };
        });
      }
    }
  };

  const headingSize = (viewport.width - marginX * 2) * CONFIG.detailsLayout.HEADING_SIZE_MULT;
  const bodySize = headingSize * CONFIG.detailsLayout.BODY_SIZE_MULT;
  const headingPixelSize = headingSize / pxTo3DWidth;
  const bodyPixelSize = bodySize / pxTo3DWidth;

  const sectionTravel = viewport.height * CONFIG.detailsLayout.SECTION_TRAVEL_MULT;
  const targetBaseY = viewport.height * CONFIG.detailsLayout.TARGET_BASE_Y_MULT;

  useFrame(() => {
    const detailsProgress = progressRef.current;
    const baseY =
      -sectionTravel + (sectionTravel + targetBaseY) * detailsProgress;

    if (rootGroupRef.current) {
      rootGroupRef.current.position.y = baseY;
    }
  });

  const sectionTop = viewport.height / 2 - marginY * CONFIG.detailsLayout.SECTION_TOP_OFF_MULT;
  const sectionSpacing = viewport.height * CONFIG.detailsLayout.SECTION_SPACING_MULT;

  const leftTitleX = leftX;
  const rightTitleX = rightX - viewport.width * CONFIG.detailsLayout.RIGHT_TITLE_OFFSET_MULT;
  const rightBodyX = rightX;

  const gap = viewport.width * CONFIG.detailsLayout.GAP_MULT;
  const bodyTopOffset = headingSize * CONFIG.detailsLayout.BODY_TOP_OFFSET_MULT;
  const bodyLineHeight = bodySize * CONFIG.detailsLayout.BODY_LINE_HEIGHT_MULT;

  const bodyPositions = useMemo(() => {
    return {
      experience: leftTitleX + titleWidths.experience + gap,
      projects: leftTitleX + titleWidths.projects + gap,
      education: leftTitleX + titleWidths.education + gap,
    };
  }, [leftTitleX, titleWidths, gap]);

  const experienceText = useMemo(
    () =>
      experienceData
        .map((exp) => `${exp.duration} / ${exp.position} @ ${exp.company}`)
        .join("\n")
        .split("\n"),
    [],
  );

  const projectsText = useMemo(
    () => projectsData.map((project) => `${project.name}`),
    [],
  );

  const educationText = useMemo(
    () =>
      educationData
        .map((edu) => `${edu.field} (${edu.degree}) @ ${edu.institution}`)
        .join("\n")
        .split("\n"),
    [],
  );

  const skillsText = useMemo(() => skillsData.join("\n").split("\n"), []);

  return (
    <group position={[0, -sectionTravel, -0.05]} ref={rootGroupRef}>
      <SelectableRevealText
        text="Experience"
        position={[leftTitleX, sectionTop, 0]}
        anchorX="left"
        anchorY="top"
        calculatedFontSize={headingSize}
        pixelFontSize={headingPixelSize}
        font="fonts/Aeonik-Light.otf"
        fontWeightClass="font-light"
        color={THEME.white}
        blockColor={THEME.white}
        selectionClassName={`selection:bg-[${THEME.white}] selection:text-[${THEME.darkest}]`}
        startTrigger={startTrigger}
        delay={CONFIG.detailsTimings.EXPERIENCE_HEADING_DELAY}
        direction="leftToRight"
        lineHeight={1}
        onSync={handleTitleSync("experience")}
      />

      {experienceText.map((line, index) => (
        <SelectableRevealText
          key={`exp-${line}`}
          text={line}
          position={[
            bodyPositions.experience,
            sectionTop - bodyTopOffset - index * bodyLineHeight,
            0,
          ]}
          anchorX="left"
          anchorY="top"
          calculatedFontSize={bodySize}
          pixelFontSize={bodyPixelSize}
          font="fonts/Aeonik-Light.otf"
          fontWeightClass="font-light"
          color={THEME.light}
          blockColor={THEME.light}
          selectionClassName={`selection:bg-[${THEME.light}] selection:text-[${THEME.darkest}]`}
          startTrigger={startTrigger}
          delay={CONFIG.detailsTimings.EXPERIENCE_BODY_DELAY + index * CONFIG.detailsTimings.BODY_STAGGER_STEP}
          direction="leftToRight"
          lineHeight={1}
        />
      ))}

      <SelectableRevealText
        text="Featured Projects"
        position={[leftTitleX, sectionTop - sectionSpacing, 0]}
        anchorX="left"
        anchorY="top"
        calculatedFontSize={headingSize}
        pixelFontSize={headingPixelSize}
        font="fonts/Aeonik-Light.otf"
        fontWeightClass="font-light"
        color={THEME.white}
        blockColor={THEME.white}
        selectionClassName={`selection:bg-[${THEME.white}] selection:text-[${THEME.darkest}]`}
        startTrigger={startTrigger}
        delay={CONFIG.detailsTimings.PROJECTS_HEADING_DELAY}
        direction="leftToRight"
        lineHeight={1}
        onSync={handleTitleSync("projects")}
      />

      {projectsText.map((line, index) => (
        <SelectableRevealText
          key={`proj-${line}`}
          text={line}
          position={[
            bodyPositions.projects,
            sectionTop -
              sectionSpacing -
              bodyTopOffset -
              index * bodyLineHeight,
            0,
          ]}
          anchorX="left"
          anchorY="top"
          calculatedFontSize={bodySize}
          pixelFontSize={bodyPixelSize}
          font="fonts/Aeonik-Light.otf"
          fontWeightClass="font-light"
          color={THEME.light}
          blockColor={THEME.light}
          selectionClassName={`selection:bg-[${THEME.light}] selection:text-[${THEME.darkest}]`}
          startTrigger={startTrigger}
          delay={CONFIG.detailsTimings.PROJECTS_BODY_DELAY + index * CONFIG.detailsTimings.BODY_STAGGER_STEP}
          direction="leftToRight"
          lineHeight={1}
        />
      ))}

      <SelectableRevealText
        text="Education"
        position={[leftTitleX, sectionTop - sectionSpacing * 2, 0]}
        anchorX="left"
        anchorY="top"
        calculatedFontSize={headingSize}
        pixelFontSize={headingPixelSize}
        font="fonts/Aeonik-Light.otf"
        fontWeightClass="font-light"
        color={THEME.white}
        blockColor={THEME.white}
        selectionClassName={`selection:bg-[${THEME.white}] selection:text-[${THEME.darkest}]`}
        startTrigger={startTrigger}
        delay={CONFIG.detailsTimings.EDUCATION_HEADING_DELAY}
        direction="leftToRight"
        lineHeight={1}
        onSync={handleTitleSync("education")}
      />

      {educationText.map((line, index) => (
        <SelectableRevealText
          key={`edu-${line}`}
          text={line}
          position={[
            bodyPositions.education,
            sectionTop -
              sectionSpacing * 2 -
              bodyTopOffset -
              index * bodyLineHeight,
            0,
          ]}
          anchorX="left"
          anchorY="top"
          calculatedFontSize={bodySize}
          pixelFontSize={bodyPixelSize}
          font="fonts/Aeonik-Light.otf"
          fontWeightClass="font-light"
          color={THEME.light}
          blockColor={THEME.light}
          selectionClassName={`selection:bg-[${THEME.light}] selection:text-[${THEME.darkest}]`}
          startTrigger={startTrigger}
          delay={CONFIG.detailsTimings.EDUCATION_BODY_DELAY + index * CONFIG.detailsTimings.BODY_STAGGER_STEP}
          direction="leftToRight"
          lineHeight={1}
        />
      ))}

      <SelectableRevealText
        text="Skills"
        position={[rightTitleX, sectionTop, 0]}
        anchorX="left"
        anchorY="top"
        calculatedFontSize={headingSize}
        pixelFontSize={headingPixelSize}
        font="fonts/Aeonik-Light.otf"
        fontWeightClass="font-light"
        color={THEME.white}
        blockColor={THEME.white}
        selectionClassName={`selection:bg-[${THEME.white}] selection:text-[${THEME.darkest}]`}
        startTrigger={startTrigger}
        delay={CONFIG.detailsTimings.SKILLS_HEADING_DELAY}
        direction="rightToLeft"
        lineHeight={1}
      />

      {skillsText.map((line, index) => (
        <SelectableRevealText
          key={`skill-${line}`}
          text={line}
          position={[
            rightBodyX,
            sectionTop - bodyTopOffset - index * bodyLineHeight,
            0,
          ]}
          anchorX="right"
          anchorY="top"
          calculatedFontSize={bodySize}
          pixelFontSize={bodyPixelSize}
          font="fonts/Aeonik-Light.otf"
          fontWeightClass="font-light"
          color={THEME.light}
          blockColor={THEME.light}
          selectionClassName={`selection:bg-[${THEME.light}] selection:text-[${THEME.darkest}]`}
          startTrigger={startTrigger}
          delay={CONFIG.detailsTimings.SKILLS_BODY_DELAY + index * CONFIG.detailsTimings.SKILLS_STAGGER_STEP}
          direction="rightToLeft"
          lineHeight={1}
        />
      ))}
    </group>
  );
}
