import { Title } from "./HeroScene/Title";
import { Subtitle } from "./HeroScene/Subtitle";
import { ProfessionLabel } from "./HeroScene/ProfessionLabel";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";
import { useHeroLayout } from "@/context/HeroLayoutContext";
import { useAnimationContext } from "@/context/AnimationContext";
import { useHeroTransition } from "@/context/HeroTransitionContext";
import { heroContent } from "@/data/content";
import { CONFIG } from "../config/constants";

const LABEL_EXIT_START = CONFIG.heroText.LABEL_EXIT_START;
const LABEL_EXIT_END = CONFIG.heroText.LABEL_EXIT_END;

export function HeroText() {
  const {
    viewport,
    pxTo3DWidth,
    pxTo3DHeight,
    marginX,
    marginY,
    leftX,
    rightX,
    row3TopY,
    row3BottomY,
    titleFontSize,
    titleY,
  } = useHeroLayout();
  const { startTrigger } = useAnimationContext();
  const { progressRef } = useHeroTransition();
  const titleGroupRef = useRef<Group>(null);
  const subtitleGroupRef = useRef<Group>(null);
  const heroGroupRef = useRef<Group>(null);

  useFrame(() => {
    const heroExit = progressRef.current;
    const titleYOffset = heroExit * viewport.height * CONFIG.heroLayout.TITLE_Y_MULTIPLIER;
    const subtitleProgress = 1 - Math.pow(1 - heroExit, CONFIG.heroLayout.SUBTITLE_PROGRESS_POWER);
    const subtitleYOffset = subtitleProgress * viewport.height * CONFIG.heroLayout.SUBTITLE_Y_MULTIPLIER;
    const heroYOffset = heroExit * viewport.height * CONFIG.heroLayout.HERO_Y_MULTIPLIER;

    if (titleGroupRef.current) {
      titleGroupRef.current.position.y = titleYOffset;
    }
    if (subtitleGroupRef.current) {
      subtitleGroupRef.current.position.y = subtitleYOffset;
    }
    if (heroGroupRef.current) {
      heroGroupRef.current.position.y = heroYOffset;
    }
  });

  const titlePixelFontSize = titleFontSize / pxTo3DWidth;

  const subtitleY = viewport.height / 2 - marginY;
  const subtitleAvailableWidth = viewport.width - 2 * marginX;
  const subtitleFontSize = subtitleAvailableWidth * CONFIG.heroLayout.SUBTITLE_FONT_SIZE;
  const subtitlePixelFontSize = subtitleFontSize / pxTo3DWidth;

  const professionAvailableWidth = viewport.width - 2 * marginX;
  const professionFontSize = professionAvailableWidth * CONFIG.heroLayout.PROFESSION_FONT_SIZE;
  const professionPixelFontSize = professionFontSize / pxTo3DWidth;
  const professionPaddingY = CONFIG.heroLayout.PROFESSION_PADDING_Y * pxTo3DHeight;
  const professionLineThickness = CONFIG.heroLayout.PROFESSION_LINE_THICKNESS * pxTo3DHeight;
  const professionLineWidth = viewport.width * CONFIG.heroLayout.PROFESSION_LINE_WIDTH;
  const professionExitDistance = viewport.width * CONFIG.heroLayout.PROFESSION_EXIT_DISTANCE;

  return (
    <>
      <group position={[0, 0, 0]} ref={titleGroupRef}>
        <Title
          startTrigger={startTrigger}
          viewportWidth={viewport.width}
          marginX={marginX}
          y={titleY}
          calculatedFontSize={titleFontSize}
          pixelFontSize={titlePixelFontSize}
          scrollProgressRef={progressRef}
          transitionStart={LABEL_EXIT_START}
          transitionEnd={LABEL_EXIT_END}
          stackedFontSize={professionFontSize}
        >
          {heroContent.title}
        </Title>
      </group>
      <group position={[0, 0, 0]} ref={subtitleGroupRef}>
        <Subtitle
          startTrigger={startTrigger}
          y={subtitleY}
          calculatedFontSize={subtitleFontSize}
          pixelFontSize={subtitlePixelFontSize}
        >
          {heroContent.subtitle}
        </Subtitle>
      </group>
      <group position={[0, 0, 0]} ref={heroGroupRef}>
        <ProfessionLabel
          position={[leftX, row3TopY, 0]}
          align="left"
          verticalPos="below"
          direction="leftToRight"
          startTrigger={startTrigger}
          viewportWidth={viewport.width}
          fontSize={professionFontSize}
          pixelFontSize={professionPixelFontSize}
          paddingY={professionPaddingY}
          lineThickness={professionLineThickness}
          lineWidth={professionLineWidth}
          scrollProgressRef={progressRef}
          exitStart={LABEL_EXIT_START}
          exitEnd={LABEL_EXIT_END}
          exitDistance={professionExitDistance}
        >
          {heroContent.professions[0]}
        </ProfessionLabel>

        <ProfessionLabel
          position={[rightX, row3BottomY, 0]}
          align="right"
          verticalPos="above"
          direction="rightToLeft"
          startTrigger={startTrigger}
          viewportWidth={viewport.width}
          fontSize={professionFontSize}
          pixelFontSize={professionPixelFontSize}
          paddingY={professionPaddingY}
          lineThickness={professionLineThickness}
          lineWidth={professionLineWidth}
          scrollProgressRef={progressRef}
          exitStart={LABEL_EXIT_START}
          exitEnd={LABEL_EXIT_END}
          exitDistance={professionExitDistance}
        >
          {heroContent.professions[1]}
        </ProfessionLabel>
      </group>
    </>
  );
}
