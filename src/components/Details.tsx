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
        end: "+=50%",
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

  const headingSize = (viewport.width - marginX * 2) * 0.03;
  const bodySize = headingSize * 0.5;
  const headingPixelSize = headingSize / pxTo3DWidth;
  const bodyPixelSize = bodySize / pxTo3DWidth;

  const sectionTravel = viewport.height * 1.16;
  const targetBaseY = -viewport.height * 0.25;

  useFrame(() => {
    const detailsProgress = progressRef.current;
    const baseY =
      -sectionTravel + (sectionTravel + targetBaseY) * detailsProgress;

    if (rootGroupRef.current) {
      rootGroupRef.current.position.y = baseY;
    }
  });

  const sectionTop = viewport.height / 2 - marginY * 0.35;
  const sectionSpacing = viewport.height * 0.25;

  const leftTitleX = leftX;
  const rightTitleX = rightX - viewport.width * 0.2;
  const rightBodyX = rightX;

  const gap = viewport.width * 0.08;
  const bodyTopOffset = headingSize * 0.38;
  const bodyLineHeight = bodySize * 1.5;

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
        color="#FFFFFF"
        blockColor="#FFFFFF"
        selectionClassName="selection:bg-[#FFFFFF] selection:text-[#1D1D1D]"
        startTrigger={startTrigger}
        delay={0.1}
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
          color="#D6D6D6"
          blockColor="#D6D6D6"
          selectionClassName="selection:bg-[#D6D6D6] selection:text-[#1D1D1D]"
          startTrigger={startTrigger}
          delay={0.18 + index * 0.07}
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
        color="#FFFFFF"
        blockColor="#FFFFFF"
        selectionClassName="selection:bg-[#FFFFFF] selection:text-[#1D1D1D]"
        startTrigger={startTrigger}
        delay={0.3}
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
          color="#D6D6D6"
          blockColor="#D6D6D6"
          selectionClassName="selection:bg-[#D6D6D6] selection:text-[#1D1D1D]"
          startTrigger={startTrigger}
          delay={0.38 + index * 0.07}
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
        color="#FFFFFF"
        blockColor="#FFFFFF"
        selectionClassName="selection:bg-[#FFFFFF] selection:text-[#1D1D1D]"
        startTrigger={startTrigger}
        delay={0.5}
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
          color="#D6D6D6"
          blockColor="#D6D6D6"
          selectionClassName="selection:bg-[#D6D6D6] selection:text-[#1D1D1D]"
          startTrigger={startTrigger}
          delay={0.58 + index * 0.07}
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
        color="#FFFFFF"
        blockColor="#FFFFFF"
        selectionClassName="selection:bg-[#FFFFFF] selection:text-[#1D1D1D]"
        startTrigger={startTrigger}
        delay={0.12}
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
          color="#D6D6D6"
          blockColor="#D6D6D6"
          selectionClassName="selection:bg-[#D6D6D6] selection:text-[#1D1D1D]"
          startTrigger={startTrigger}
          delay={0.2 + index * 0.06}
          direction="rightToLeft"
          lineHeight={1}
        />
      ))}
    </group>
  );
}
