"use client";

import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import { useHeroLayout } from "@/context/HeroLayoutContext";
import { Group, Mesh } from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

const experience = [
  {
    company: "Nowa Lukasz Walter",
    position: "Frontend Engineer",
    duration: "2024 - Present",
  },
  {
    company: "Galactic Reborn",
    position: "Co-Founder",
    duration: "2023 - 2024",
  },
  {
    company: "Nowa Lukasz Walter",
    position: "Frontend Developer",
    duration: "2020 - 2024",
  },
  {
    company: "Nowa Lukasz Walter",
    position: "Junior Frontend Developer",
    duration: "2018 - 2020",
  },
];

const projects = [
  {
    name: "3D Interactive Configurator",
  },
  {
    name: "MagScan Warehouse App",
  },
  {
    name: "E-commerce Transformations",
  },
];

const education = [
  {
    institution: "DSW University of Lower Silesia",
    degree: "Master's degree",
    field: "Creative Media: Game and 3D Animation Design",
  },
  {
    institution: "WSB Merito University Wroclaw",
    degree: "Bachelor of Engineering",
    field: "Computer Science",
  },
];

const skills = [
  "Visual Design",
  "UI/UX Design",
  "React",
  "React Native",
  "Three.js",
  "React Three Fiber",
  "GSAP",
  "Blender",
  "JavaScript",
  "TypeScript",
  "Liquid",
  "Figma",
  "After Effects",
];

export function Details() {
  const { viewport, marginX, marginY, leftX, rightX } = useHeroLayout();
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

  const experienceTitleRef = useRef(null);
  const projectsTitleRef = useRef(null);
  const educationTitleRef = useRef(null);

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

        setTitleWidths((prev) => ({ ...prev, [titleKey]: width }));
      }
    }
  };

  const headingSize = (viewport.width - marginX * 2) * 0.03;
  const bodySize = headingSize * 0.5;

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

  const textWidthLeft = viewport.width * 0.37;
  const textWidthRight = viewport.width * 0.18;

  const gap = viewport.width * 0.08;

  const bodyPositions = useMemo(() => {
    return {
      experience: leftTitleX + titleWidths.experience + gap,
      projects: leftTitleX + titleWidths.projects + gap,
      education: leftTitleX + titleWidths.education + gap,
    };
  }, [leftTitleX, titleWidths, gap]);

  const experienceText = useMemo(
    () =>
      experience
        .map((exp) => `${exp.duration} / ${exp.position} @ ${exp.company}`)
        .join("\n"),
    [],
  );

  const projectsText = useMemo(
    () => projects.map((project) => `${project.name}`).join("\n"),
    [],
  );

  const educationText = useMemo(
    () =>
      education
        .map((edu) => `${edu.field} (${edu.degree}) @ ${edu.institution}`)
        .join("\n"),
    [],
  );

  const skillsText = useMemo(() => skills.join("\n"), []);

  return (
    <group position={[0, -sectionTravel, -0.05]} ref={rootGroupRef}>
      <Text
        ref={experienceTitleRef}
        position={[leftTitleX, sectionTop, 0]}
        anchorX="left"
        anchorY="top"
        fontSize={headingSize}
        lineHeight={1}
        font="fonts/Aeonik-Light.otf"
        color="#FFFFFF"
        onSync={handleTitleSync("experience")}
      >
        Experience
      </Text>
      <Text
        position={[
          bodyPositions.experience,
          sectionTop - headingSize * 0.38,
          0,
        ]}
        anchorX="left"
        anchorY="top"
        maxWidth={textWidthLeft}
        fontSize={bodySize}
        lineHeight={1.5}
        font="fonts/Aeonik-Light.otf"
        color="#D6D6D6"
      >
        {experienceText}
      </Text>

      <Text
        ref={projectsTitleRef}
        position={[leftTitleX, sectionTop - sectionSpacing, 0]}
        anchorX="left"
        anchorY="top"
        fontSize={headingSize}
        lineHeight={1}
        font="fonts/Aeonik-Light.otf"
        color="#FFFFFF"
        onSync={handleTitleSync("projects")}
      >
        Featured Projects
      </Text>
      <Text
        position={[
          bodyPositions.projects,
          sectionTop - sectionSpacing - headingSize * 0.38,
          0,
        ]}
        anchorX="left"
        anchorY="top"
        maxWidth={textWidthLeft}
        fontSize={bodySize}
        lineHeight={1.5}
        font="fonts/Aeonik-Light.otf"
        color="#D6D6D6"
      >
        {projectsText}
      </Text>

      <Text
        ref={educationTitleRef}
        position={[leftTitleX, sectionTop - sectionSpacing * 2, 0]}
        anchorX="left"
        anchorY="top"
        fontSize={headingSize}
        lineHeight={1}
        font="fonts/Aeonik-Light.otf"
        color="#FFFFFF"
        onSync={handleTitleSync("education")}
      >
        Education
      </Text>
      <Text
        position={[
          bodyPositions.education,
          sectionTop - sectionSpacing * 2 - headingSize * 0.38,
          0,
        ]}
        anchorX="left"
        anchorY="top"
        maxWidth={viewport.width * 0.75}
        fontSize={bodySize}
        lineHeight={1.5}
        font="fonts/Aeonik-Light.otf"
        color="#D6D6D6"
      >
        {educationText}
      </Text>

      <Text
        position={[rightTitleX, sectionTop, 0]}
        anchorX="left"
        anchorY="top"
        fontSize={headingSize}
        lineHeight={1}
        font="fonts/Aeonik-Light.otf"
        color="#FFFFFF"
      >
        Skills
      </Text>
      <Text
        position={[rightBodyX, sectionTop - headingSize * 0.38, 0]}
        anchorX="right"
        anchorY="top"
        maxWidth={textWidthRight}
        textAlign="left"
        fontSize={bodySize}
        lineHeight={1.5}
        font="fonts/Aeonik-Light.otf"
        color="#D6D6D6"
      >
        {skillsText}
      </Text>
    </group>
  );
}
