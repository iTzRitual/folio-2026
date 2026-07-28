"use client";

import { AnimatedRevealText } from "@/components/AnimatedRevealText";
import { heroContent } from "@/data/content";

interface MobileHeroProps {
  startScene: boolean;
}

export const MobileHero = ({ startScene }: MobileHeroProps) => {
  return (
    <section className="relative w-full h-screen max-w-full overflow-x-hidden flex flex-col items-start justify-around pointer-events-none font-karla px-4">
      <AnimatedRevealText
        delay={0.1}
        blockColor="var(--text-secondary)"
        direction="rightToLeft"
        startTrigger={startScene}
      >
        <p className="max-w-full wrap-break-word text-(--text-secondary) font-karla font-black text-xl text-left">
          {heroContent.subtitle}
        </p>
      </AnimatedRevealText>
      <AnimatedRevealText
        delay={0}
        blockColor="var(--text-primary)"
        direction="leftToRight"
        startTrigger={startScene}
      >
        <h1 className="w-full max-w-full wrap-break-word text-(--text-primary) font-black text-[clamp(3rem,14vw,4.5rem)] leading-[0.95] text-left mb-2">
          {heroContent.title}
        </h1>
        {heroContent.professions.map((profession, index) => (
          <h3
            key={index}
            className="text-(--text-primary) font-light text-left w-full text-lg"
          >
            {profession}
          </h3>
        ))}
      </AnimatedRevealText>
    </section>
  );
};
