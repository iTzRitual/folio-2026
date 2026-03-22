"use client";

import { useEffect, useState } from "react";
import { calculateHeroSafeZone } from "@/lib/heroSafeZone";

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
  const [marginX, setMarginX] = useState(60);

  useEffect(() => {
    const handleResize = () => {
      const safeZone = calculateHeroSafeZone({
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      });

      setMarginX(safeZone.marginX);
    };

    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <section
      className="font-aeonik bg-[#1D1D1D] text-white pb-40 flex justify-between text-large"
      style={{ paddingLeft: marginX, paddingRight: marginX }}
    >
      <div className="flex flex-col gap-20">
        <div className="flex gap-20 ">
          <h3 className="text-5xl">Experience</h3>
          <ul className="mt-6">
            {experience.map((exp, index) => (
              <li key={index}>
                <span className="font-bold">{exp.duration}</span> /{" "}
                {exp.position} @ <span className="italic">{exp.company}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex gap-20 ">
          <h3 className="text-5xl">Featured Projects</h3>
          <ul className="mt-6">
            {projects.map((project, index) => (
              <li key={index}>
                <span className="font-bold">{project.name}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex gap-20 ">
          <h3 className="text-5xl">Education</h3>
          <ul className="mt-6">
            {education.map((edu, index) => (
              <li key={index}>
                {edu.field} ({edu.degree}) @{" "}
                <span className="italic">{edu.institution}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="flex gap-20">
        <h3 className="text-5xl">Skills</h3>
        <ul className="mt-6">
          {skills.map((skill, index) => (
            <li key={index}>{skill}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
