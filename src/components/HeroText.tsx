import { Title } from "./HeroScene/Title";
import { Subtitle } from "./HeroScene/Subtitle";
import { ProfessionLabel } from "./HeroScene/ProfessionLabel";
import { useHeroLayout } from "@/context/HeroLayoutContext";
import { useAnimationContext } from "@/context/AnimationContext";
import { useScrollTimeline } from "@/context/ScrollTimelineContext";

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
  } = useHeroLayout();
  const { startTrigger } = useAnimationContext();
  const { progress, getSegmentProgress, sections } = useScrollTimeline();

  const heroExit = getSegmentProgress(
    sections.heroHoldEnd,
    sections.detailsEnterEnd,
  );

  const heroYOffset = heroExit * viewport.height * 1.05;
  const titleYOffset = heroExit * viewport.height * 0.7;
  const subtitleProgress = 1 - Math.pow(1 - heroExit, 1.05);
  const subtitleYOffset = subtitleProgress * viewport.height * 0.22;
  const heroOpacity = 1 - heroExit;

  const titleAvailableWidth = viewport.width - 2 * marginX;
  const titleFontSize = titleAvailableWidth * 0.125;
  const titlePixelFontSize = titleFontSize / pxTo3DWidth;
  const fontVisualOffset = titleFontSize * 0.1;

  const titleY = -viewport.height / 2 + marginY + fontVisualOffset;

  const subtitleY = viewport.height / 2 - marginY;
  const subtitleAvailableWidth = viewport.width - 2 * marginX;
  const subtitleFontSize = subtitleAvailableWidth * 0.0257;
  const subtitlePixelFontSize = subtitleFontSize / pxTo3DWidth;

  const professionAvailableWidth = viewport.width - 2 * marginX;
  const professionFontSize = professionAvailableWidth * 0.02;
  const professionPixelFontSize = professionFontSize / pxTo3DWidth;
  const professionPaddingY = 8 * pxTo3DHeight;
  const professionLineThickness = 1 * pxTo3DHeight;
  const professionLineWidth = viewport.width * 0.9;
  const scrollHintOpacity = Math.max(0, 1 - progress / 0.08);

  return (
    <>
      <group position={[0, titleYOffset, 0]}>
        <Title
          startTrigger={startTrigger}
          viewportWidth={viewport.width}
          marginX={marginX}
          y={titleY}
          calculatedFontSize={titleFontSize}
          pixelFontSize={titlePixelFontSize}
          scrollHintOpacity={scrollHintOpacity}
        >
          Natan Mokrzycki
        </Title>
      </group>
      <group position={[0, subtitleYOffset, 0]}>
        <Subtitle
          startTrigger={startTrigger}
          y={subtitleY}
          calculatedFontSize={subtitleFontSize}
          pixelFontSize={subtitlePixelFontSize}
        >
          Bridging the gap between technical performance and high-end visual
          aesthetics.
        </Subtitle>
      </group>
      <group position={[0, heroYOffset, 0]} visible={heroOpacity > 0.02}>
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
        >
          Software Engineer
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
        >
          Creative Technologist
        </ProfessionLabel>
      </group>
    </>
  );
}
