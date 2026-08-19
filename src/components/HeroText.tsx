import { Title } from "./HeroScene/Title";
import { NarrowTitle } from "./HeroScene/NarrowTitle";
import { NarrowSubtitle } from "./HeroScene/NarrowSubtitle";
import { NarrowProfessionStack } from "./HeroScene/NarrowProfessionStack";
import { Subtitle } from "./HeroScene/Subtitle";
import { ProfessionLabel } from "./HeroScene/ProfessionLabel";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";
import { useHeroLayout } from "@/context/HeroLayoutContext";
import { useAnimationContext } from "@/context/AnimationContext";
import { useHeroTransition } from "@/context/HeroTransitionContext";
import { heroContent } from "@/data/content";
import { caseStudyStage } from "@/lib/caseStudyStage";
import { CONFIG } from "../config/constants";
import { useSceneCapabilities } from "@/context/SceneCapabilitiesContext";
import { useFontsReady } from "@/hooks/useFontsReady";
import { wrapText } from "@/lib/textMetrics";

const LABEL_EXIT_START = CONFIG.heroText.LABEL_EXIT_START;
const LABEL_EXIT_END = CONFIG.heroText.LABEL_EXIT_END;

export function HeroText() {
  const {
    size,
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
    titleSettledFontSize,
    titleY,
  } = useHeroLayout();
  const { startTrigger } = useAnimationContext();
  const { layoutMode, compactHeight } = useSceneCapabilities();
  const fontsReady = useFontsReady();
  const { progressRef } = useHeroTransition();
  const titleGroupRef = useRef<Group>(null);
  const subtitleGroupRef = useRef<Group>(null);
  const heroGroupRef = useRef<Group>(null);

  useFrame(() => {
    const heroExit = progressRef.current;
    const titleYOffset =
      layoutMode === "narrow"
        ? 0
        : heroExit * viewport.height * CONFIG.heroLayout.TITLE_Y_MULTIPLIER;
    const subtitleProgress = 1 - Math.pow(1 - heroExit, CONFIG.heroLayout.SUBTITLE_PROGRESS_POWER);
    const subtitleYOffset =
      layoutMode === "narrow"
        ? 0
        : subtitleProgress * viewport.height * CONFIG.heroLayout.SUBTITLE_Y_MULTIPLIER;
    const heroYOffset =
      layoutMode === "narrow"
        ? 0
        : heroExit * viewport.height * CONFIG.heroLayout.HERO_Y_MULTIPLIER;

    if (titleGroupRef.current) {
      titleGroupRef.current.position.y = titleYOffset;
    }
    // A case study reached through its own URL opens over an unscrolled hero,
    // which the flight would otherwise magnify into the frame around the
    // opening image. The title looks after itself; the rest of the hero has
    // nothing to say up there either.
    const present = caseStudyStage.dim < 1;

    if (subtitleGroupRef.current) {
      subtitleGroupRef.current.position.y = subtitleYOffset;
      subtitleGroupRef.current.visible = present;
    }
    if (heroGroupRef.current) {
      heroGroupRef.current.position.y = heroYOffset;
      heroGroupRef.current.visible = present;
    }
  });

  const titlePixelFontSize = titleFontSize / pxTo3DWidth;

  const narrowSubtitleTopPx = compactHeight
    ? CONFIG.heroLayout.NARROW_SUBTITLE_COMPACT_TOP_PX
    : Math.min(
        Math.max(
          size.height * CONFIG.heroLayout.NARROW_SUBTITLE_TOP_MULT,
          CONFIG.heroLayout.NARROW_SUBTITLE_TOP_MIN_PX,
        ),
        CONFIG.heroLayout.NARROW_SUBTITLE_TOP_MAX_PX,
      );
  const subtitleY =
    layoutMode === "narrow"
      ? viewport.height / 2 - narrowSubtitleTopPx * pxTo3DHeight
      : viewport.height / 2 - marginY;
  const subtitleAvailableWidth = viewport.width - 2 * marginX;
  const subtitlePixelTarget = Math.min(
    Math.max(
      size.width * CONFIG.heroLayout.NARROW_SUBTITLE_FONT_SIZE,
      CONFIG.heroLayout.NARROW_SUBTITLE_MIN_PX,
    ),
    CONFIG.heroLayout.NARROW_SUBTITLE_MAX_PX,
  );
  const subtitleFontSize =
    layoutMode === "narrow"
      ? subtitlePixelTarget * pxTo3DWidth
      : subtitleAvailableWidth * CONFIG.heroLayout.SUBTITLE_FONT_SIZE;
  const subtitlePixelFontSize = subtitleFontSize / pxTo3DWidth;
  const subtitleText = useMemo(
    () =>
      layoutMode === "narrow"
        ? wrapText(
            heroContent.subtitle,
            subtitleAvailableWidth / pxTo3DWidth,
            subtitlePixelFontSize,
            CONFIG.subtitle.LETTER_SPACING,
            fontsReady,
          ).join("\n")
        : heroContent.subtitle,
    [
      layoutMode,
      subtitleAvailableWidth,
      pxTo3DWidth,
      subtitlePixelFontSize,
      fontsReady,
    ],
  );

  const narrowTitleGapPx = compactHeight
    ? CONFIG.heroLayout.NARROW_TITLE_COMPACT_GAP_PX
    : CONFIG.heroLayout.NARROW_TITLE_GAP_PX;
  const narrowTitleInitialY =
    subtitleY -
    subtitleFontSize * CONFIG.heroLayout.NARROW_SUBTITLE_LINE_HEIGHT * 2 -
    narrowTitleGapPx * pxTo3DHeight;
  const narrowStickyTitleTopPx = compactHeight
    ? CONFIG.heroLayout.NARROW_STICKY_TITLE_COMPACT_TOP_PX
    : CONFIG.heroLayout.NARROW_STICKY_TITLE_TOP_PX;
  const narrowTitleSettledY =
    viewport.height / 2 - narrowStickyTitleTopPx * pxTo3DHeight;

  const professionAvailableWidth = viewport.width - 2 * marginX;
  const professionPixelTarget = Math.min(
    Math.max(
      size.width * CONFIG.heroLayout.NARROW_PROFESSION_FONT_SIZE,
      CONFIG.heroLayout.NARROW_PROFESSION_MIN_PX,
    ),
    CONFIG.heroLayout.NARROW_PROFESSION_MAX_PX,
  );
  const professionFontSize =
    layoutMode === "narrow"
      ? professionPixelTarget * pxTo3DWidth
      : professionAvailableWidth * CONFIG.heroLayout.PROFESSION_FONT_SIZE;
  const professionPixelFontSize = professionFontSize / pxTo3DWidth;
  const professionPaddingY = CONFIG.heroLayout.PROFESSION_PADDING_Y * pxTo3DHeight;
  const professionLineThickness = CONFIG.heroLayout.PROFESSION_LINE_THICKNESS * pxTo3DHeight;
  const professionLineWidth = viewport.width * CONFIG.heroLayout.PROFESSION_LINE_WIDTH;
  const professionExitDistance = viewport.width * CONFIG.heroLayout.PROFESSION_EXIT_DISTANCE;
  const narrowRolePixelTarget = Math.min(
    Math.max(
      size.width * CONFIG.heroLayout.NARROW_ROLE_FONT_SIZE,
      CONFIG.heroLayout.NARROW_ROLE_FONT_MIN_PX,
    ),
    CONFIG.heroLayout.NARROW_ROLE_FONT_MAX_PX,
  );
  const narrowRoleFontSize = narrowRolePixelTarget * pxTo3DWidth;
  const narrowRoleBottomPx = compactHeight
    ? CONFIG.heroLayout.NARROW_ROLE_COMPACT_BOTTOM_PX
    : CONFIG.heroLayout.NARROW_ROLE_BOTTOM_PX;
  const narrowRoleInitialY =
    -viewport.height / 2 +
    (narrowRoleBottomPx +
      CONFIG.heroLayout.NARROW_ROLE_ROW_PITCH_PX * 2) *
      pxTo3DHeight;
  const narrowRoleInset = compactHeight
    ? CONFIG.heroLayout.NARROW_ROLE_COMPACT_INSET_PX * pxTo3DWidth
    : 0;
  const narrowRoleSettledY =
    narrowTitleSettledY -
    titleSettledFontSize -
    CONFIG.heroLayout.NARROW_ROLE_STICKY_GAP_PX * pxTo3DHeight;

  return (
    <>
      <group position={[0, 0, 0]} ref={titleGroupRef}>
        {layoutMode === "narrow" ? (
          <NarrowTitle
            text={heroContent.title}
            startTrigger={startTrigger}
            x={leftX}
            initialY={narrowTitleInitialY}
            settledY={narrowTitleSettledY}
            openingFontSize={titleFontSize}
            openingPixelFontSize={titlePixelFontSize}
            settledFontSize={titleSettledFontSize}
            scrollProgressRef={progressRef}
            transitionStart={CONFIG.heroLayout.NARROW_TITLE_TRANSITION_START}
            transitionEnd={CONFIG.heroLayout.NARROW_TITLE_TRANSITION_END}
          />
        ) : (
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
        )}
      </group>
      <group position={[0, 0, 0]} ref={subtitleGroupRef}>
        {layoutMode === "narrow" ? (
          <NarrowSubtitle
            text={heroContent.subtitle}
            startTrigger={startTrigger}
            x={leftX}
            y={subtitleY}
            width={subtitleAvailableWidth}
            pixelWidth={subtitleAvailableWidth / pxTo3DWidth}
            fontSize={subtitleFontSize}
            pixelFontSize={subtitlePixelFontSize}
            fontsReady={fontsReady}
            viewportHeight={viewport.height}
            scrollProgressRef={progressRef}
          />
        ) : (
          <Subtitle
            startTrigger={startTrigger}
            y={subtitleY}
            calculatedFontSize={subtitleFontSize}
            pixelFontSize={subtitlePixelFontSize}
          >
            {subtitleText}
          </Subtitle>
        )}
      </group>
      <group position={[0, 0, 0]} ref={heroGroupRef}>
        {layoutMode === "narrow" ? (
          <NarrowProfessionStack
            roles={heroContent.professions}
            startTrigger={startTrigger}
            x={leftX + narrowRoleInset}
            initialY={narrowRoleInitialY}
            settledY={narrowRoleSettledY}
            width={professionAvailableWidth - narrowRoleInset}
            pixelWidth={
              (professionAvailableWidth - narrowRoleInset) / pxTo3DWidth
            }
            fontSize={narrowRoleFontSize}
            pixelFontSize={narrowRolePixelTarget}
            settledPixelFontSize={CONFIG.heroLayout.NARROW_ROLE_SETTLED_PX}
            pxTo3DWidth={pxTo3DWidth}
            pxTo3DHeight={pxTo3DHeight}
            scrollProgressRef={progressRef}
            transitionStart={CONFIG.heroLayout.NARROW_TITLE_TRANSITION_START}
            transitionEnd={CONFIG.heroLayout.NARROW_TITLE_TRANSITION_END}
          />
        ) : (
          <>
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
          </>
        )}
      </group>
    </>
  );
}
