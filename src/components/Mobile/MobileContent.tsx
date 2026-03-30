"use client";

import { ReactNode } from "react";
import { Copy } from "@/components/Copy";
import { experienceData, projectsData, educationData } from "@/data/content";

interface SectionProps {
  title: string;
  delay: number;
  children: ReactNode;
}

const Section = ({ title, delay, children }: SectionProps) => {
  return (
    <div className="mb-12">
      <Copy
        delay={delay}
        blockColor="#FFFFFF"
        direction="leftToRight"
        animateOnScroll={true}
      >
        <h3 className="text-white font-black text-left w-full text-3xl pb-2">
          {title}
        </h3>
      </Copy>
      <Copy
        delay={delay + 0.1}
        blockColor="#BCBCBC"
        direction="leftToRight"
        animateOnScroll={true}
      >
        <ul>{children}</ul>
      </Copy>
    </div>
  );
};

export const MobileContent = () => {
  return (
    <section className="relative w-full max-w-full overflow-x-hidden pointer-events-none px-4 pb-18">
      <Section title="Experience" delay={0.2}>
        {experienceData.map((item, index) => (
          <li
            key={index}
            className="text-white font-karla text-left w-full text-lg"
          >
            - {item.position} at {item.company} ({item.duration})
          </li>
        ))}
      </Section>

      <Section title="Recent Projects" delay={0.4}>
        {projectsData.map((item, index) => (
          <li
            key={index}
            className="text-white font-karla text-left w-full text-lg"
          >
            - {item.name}
          </li>
        ))}
      </Section>

      <Section title="Education" delay={0.6}>
        {educationData.map((item, index) => (
          <li
            key={index}
            className="text-white font-karla text-left w-full text-lg"
          >
            - {item.degree} in {item.field} from {item.institution}
          </li>
        ))}
      </Section>
    </section>
  );
};
