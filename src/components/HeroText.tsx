import { Title } from "./HeroScene/Title";
import { Subtitle } from "./HeroScene/Subtitle";
import { ProfessionLabel } from "./HeroScene/ProfessionLabel";
import { useHeroLayout } from "@/context/HeroLayoutContext";
import { useAnimationContext } from "@/context/AnimationContext";

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

  const titleY = -viewport.height / 2 + 240 * pxTo3DHeight;
  const titleAvailableWidth = viewport.width - 2 * marginX;
  const titleFontSize = titleAvailableWidth * 0.125;
  const titlePixelFontSize = titleFontSize / pxTo3DWidth;

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

  return (
    <>
      <Title
        startTrigger={startTrigger}
        viewportWidth={viewport.width}
        marginX={marginX}
        y={titleY}
        calculatedFontSize={titleFontSize}
        pixelFontSize={titlePixelFontSize}
      >
        Natan Mokrzycki
      </Title>
      <Subtitle
        startTrigger={startTrigger}
        y={subtitleY}
        calculatedFontSize={subtitleFontSize}
        pixelFontSize={subtitlePixelFontSize}
      >
        Bridging the gap between technical performance and high-end visual
        aesthetics.
      </Subtitle>
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
    </>
  );
}
