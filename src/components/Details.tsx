"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useHeroLayout } from "@/context/HeroLayoutContext";
import { useDebugSettings } from "@/context/DebugSettingsContext";
import { Group, MathUtils } from "three";
import { useAnimationContext } from "@/context/AnimationContext";
import { useHeroTransition } from "@/context/HeroTransitionContext";
import { useFontsReady } from "@/hooks/useFontsReady";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import {
  DetailsSection,
  type DetailsSectionItem,
} from "./DetailsScene/DetailsSection";
import { BioSection } from "./DetailsScene/BioSection";
import {
  experienceData,
  projectsData,
  educationData,
  coursesData,
  skillsData,
  DEFAULT_BIO_VARIANT,
  type BioVariant,
} from "@/data/content";
import {
  SECTION_HEADINGS,
  DETAILS_SECTION_KEYS,
  headingBlockHeight,
  calculateDetailsLayout,
} from "@/lib/detailsLayout";
import { caseStudyStage } from "@/lib/caseStudyStage";
import { applyCurlSettings, curlUniforms } from "@/lib/detailsCurl";
import { CONFIG } from "../config/constants";
import { useSceneCapabilities } from "@/context/SceneCapabilitiesContext";
import { useProjectHoverActions } from "@/context/ProjectHoverContext";

export function Details({
  bioVariant = DEFAULT_BIO_VARIANT,
}: {
  bioVariant?: BioVariant;
}) {
  const {
    size,
    viewport,
    marginY,
    leftX,
    rightX,
    pxTo3DWidth,
    pxTo3DHeight,
    titleSettledBottomY,
  } = useHeroLayout();

  const prefersReducedMotion = usePrefersReducedMotion();
  const { layoutMode, inputMode } = useSceneCapabilities();
  const { setHoveredPreview, resetHoveredPreview } =
    useProjectHoverActions();
  const debug = useDebugSettings();
  const anchorCfg = debug.modelAnchor;
  const {
    foldOffsetMult,
    bottomOffsetMult,
    radiusMult,
    maxAngle,
    fadeAngleStart,
    fadeAngleEnd,
  } = debug.curl;

  const { startTrigger } = useAnimationContext();
  const { progressRef, detailsScrollRef, modelAnchorRef } = useHeroTransition();
  const fontsReady = useFontsReady();
  const rootGroupRef = useRef<Group>(null);
  const lastPointerSyncY = useRef(Number.NEGATIVE_INFINITY);

  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const revealedRef = useRef<Record<string, boolean>>({});
  const [activeProjectIndex, setActiveProjectIndex] = useState<number | null>(
    null,
  );
  const activeProjectRef = useRef<number | null>(null);

  const experienceHeadingRef = useRef<Group>(null);
  const projectsHeadingRef = useRef<Group>(null);
  const educationHeadingRef = useRef<Group>(null);
  const coursesHeadingRef = useRef<Group>(null);
  const skillsHeadingRef = useRef<Group>(null);
  const layout = useMemo(
    () =>
      calculateDetailsLayout({
        viewportWidth: size.width,
        viewportHeight: size.height,
        bioVariant,
        fontsReady,
      }),
    [size.width, size.height, bioVariant, fontsReady],
  );

  const headingSize = layout.headingFontSize * pxTo3DWidth;
  const bodySize = layout.bodyFontSize * pxTo3DWidth;
  const bodyLineHeight = layout.bodyLineHeight * pxTo3DHeight;

  const sectionTravel =
    viewport.height * CONFIG.detailsLayout.SECTION_TRAVEL_MULT;
  const targetBaseY = viewport.height * CONFIG.detailsLayout.TARGET_BASE_Y_MULT;
  const sectionTop =
    viewport.height / 2 - marginY * CONFIG.detailsLayout.SECTION_TOP_OFF_MULT;

  const sectionY = (key: string) => {
    const offsets = layout.sections[key];
    return {
      headingY: sectionTop - offsets.headingY * pxTo3DHeight,
      bodyY: sectionTop - offsets.bodyY * pxTo3DHeight,
    };
  };

  const contentRestY = targetBaseY + sectionTop;

  useLayoutEffect(() => {
    applyCurlSettings(viewport.height, titleSettledBottomY, contentRestY, {
      foldOffsetMult,
      bottomOffsetMult,
      radiusMult,
      maxAngle,
      fadeAngleStart,
      fadeAngleEnd,
      bend: prefersReducedMotion ? 0 : 1,
    });
  }, [
    viewport.height,
    titleSettledBottomY,
    contentRestY,
    foldOffsetMult,
    bottomOffsetMult,
    radiusMult,
    maxAngle,
    fadeAngleStart,
    fadeAngleEnd,
    prefersReducedMotion,
  ]);

  const bodyColumnX = leftX + layout.bodyColumnOffset * pxTo3DWidth;

  const rightTitleX =
    rightX - viewport.width * CONFIG.detailsLayout.RIGHT_TITLE_OFFSET_MULT;

  useFrame((state) => {
    const baseY =
      -sectionTravel + (sectionTravel + targetBaseY) * progressRef.current;
    const groupY = baseY + detailsScrollRef.current * pxTo3DHeight;

    if (rootGroupRef.current) {
      rootGroupRef.current.position.y = groupY;
    }

    // A row sliding under a stationary cursor fires no pointer event of its
    // own, so the hover would stay on whichever row happened to be there when
    // the scroll started. Re-running the intersection is what R3F offers for
    // exactly this; it is a no-op until the pointer has been seen once.
    if (
      inputMode === "fine" &&
      Math.abs(groupY - lastPointerSyncY.current) >
      pxTo3DHeight * CONFIG.detailsLayout.POINTER_SYNC_PX
    ) {
      lastPointerSyncY.current = groupY;
      state.events.update?.();
    }

    const foldY = curlUniforms.uCurlFoldY.value;

    const stickHeading = (headingGroup: Group | null, key: string) => {
      if (!headingGroup) return;

      const headingHeight =
        headingBlockHeight(
          SECTION_HEADINGS[key as keyof typeof SECTION_HEADINGS],
          layout.headingFontSize,
        ) * pxTo3DHeight;
      const offsets = layout.sections[key];
      const naturalY = groupY + sectionTop - offsets.headingY * pxTo3DHeight;
      const sectionBottomY =
        groupY + sectionTop - offsets.bottomY * pxTo3DHeight;

      const belowFold = Math.min(
        Math.max(foldY - naturalY, 0),
        foldY - sectionBottomY - headingHeight,
      );

      headingGroup.position.y = foldY - belowFold - naturalY;
    };

    stickHeading(experienceHeadingRef.current, "experience");
    stickHeading(projectsHeadingRef.current, "projects");
    stickHeading(educationHeadingRef.current, "education");
    stickHeading(coursesHeadingRef.current, "courses");
    if (layoutMode === "narrow") {
      stickHeading(skillsHeadingRef.current, "skills");
    }

    const gapX = layout.modelGapCenterPx / size.width - 0.5;
    const gapY =
      (groupY + sectionTop - layout.modelAnchorY * pxTo3DHeight) /
      viewport.height;

    const fadeEnd =
      titleSettledBottomY / viewport.height - anchorCfg.foldFadeClearance;
    const foldFade =
      1 - MathUtils.clamp((gapY - fadeEnd) / anchorCfg.foldFadeSpan + 1, 0, 1);

    // The model hangs a depth in front of the sheet, so a case study's camera
    // flies straight through it. It has to shrink faster than the list fades:
    // its magnification climbs as the camera closes on it, and only a ramp this
    // short outruns that.
    const modelExit = MathUtils.clamp(
      caseStudyStage.progress / CONFIG.caseStudy.MODEL_EXIT_SPAN,
      0,
      1,
    );

    const anchor = modelAnchorRef.current;
    anchor.xFraction = gapX;
    anchor.yFraction = gapY;
    anchor.scale =
      CONFIG.model.DETAILS_POPUP_SCALE * foldFade * (1 - modelExit);

    if (layoutMode === "narrow" && inputMode === "coarse") {
      const projects = layout.sections.projects;
      const activationY =
        viewport.height *
        (0.5 - CONFIG.projectPreview.MOBILE_ACTIVATION_VIEWPORT_Y);
      const firstY =
        groupY + sectionTop - projects.bodyY * pxTo3DHeight;
      const lastY =
        firstY -
        (projectsData.length - 1) *
          layout.projectLineHeight *
          pxTo3DHeight;
      const edgePad = layout.projectLineHeight * pxTo3DHeight * 0.5;
      let nextIndex: number | null = null;

      if (
        activationY <= firstY + edgePad &&
        activationY >= lastY - edgePad
      ) {
        nextIndex = MathUtils.clamp(
          Math.round(
            (firstY - activationY) /
              (layout.projectLineHeight * pxTo3DHeight),
          ),
          0,
          projectsData.length - 1,
        );
      }

      if (nextIndex !== activeProjectRef.current) {
        activeProjectRef.current = nextIndex;
        setActiveProjectIndex(nextIndex);
        if (nextIndex === null) resetHoveredPreview();
        else setHoveredPreview(projectsData[nextIndex].preview);
      }
    } else if (activeProjectRef.current !== null) {
      activeProjectRef.current = null;
      setActiveProjectIndex(null);
      resetHoveredPreview();
    }

    const revealEdge =
      -viewport.height / 2 +
      viewport.height * CONFIG.detailsLayout.REVEAL_MARGIN_MULT;

    let changed = false;
    for (const key of DETAILS_SECTION_KEYS) {
      if (revealedRef.current[key]) continue;

      const worldY =
        groupY + sectionTop - layout.sections[key].headingY * pxTo3DHeight;

      if (worldY > revealEdge) {
        revealedRef.current[key] = true;
        changed = true;
      }
    }

    if (changed) setRevealed({ ...revealedRef.current });
  });

  const experienceItems: DetailsSectionItem[] = useMemo(
    () =>
      layoutMode === "narrow"
        ? layout.sectionLines.experience.map((text) => ({ text }))
        : experienceData.map((exp) => ({
            text: `${exp.duration} / ${exp.position} @ ${exp.company}`,
          })),
    [layoutMode, layout.sectionLines.experience],
  );

  const projectItems: DetailsSectionItem[] = useMemo(
    () =>
      projectsData.map((project, index) => ({
        text: layoutMode === "narrow" ? project.title : project.name,
        href: project.link,
        previewImage: project.preview,
        caseStudyIndex: index,
      })),
    [layoutMode],
  );

  const educationItems: DetailsSectionItem[] = useMemo(
    () =>
      layoutMode === "narrow"
        ? layout.sectionLines.education.map((text) => ({ text }))
        : educationData.map((edu) => ({
            text: `${edu.field} (${edu.degree}) @ ${edu.institution}`,
          })),
    [layoutMode, layout.sectionLines.education],
  );

  const coursesItems: DetailsSectionItem[] = useMemo(
    () =>
      layoutMode === "narrow"
        ? layout.sectionLines.courses.map((text) => ({ text }))
        : coursesData.map((course) => ({
            text: `${course.date} / ${course.title} @ ${course.issuer}`,
          })),
    [layoutMode, layout.sectionLines.courses],
  );

  const skillItems: DetailsSectionItem[] = useMemo(
    () => skillsData.map((skill) => ({ text: skill })),
    [],
  );

  const shared = {
    headingFontSize: headingSize,
    bodyFontSize: bodySize,
    bodyLineHeight,
    pxTo3DWidth,
  };

  return (
    <group
      position={[0, -sectionTravel, CONFIG.scene.DETAILS_GROUP_Z]}
      ref={rootGroupRef}
    >
      <DetailsSection
        heading={SECTION_HEADINGS.experience}
        items={experienceItems}
        headingX={leftX}
        headingY={sectionY("experience").headingY}
        bodyX={bodyColumnX}
        bodyY={sectionY("experience").bodyY}
        bodyAnchorX="left"
        direction="leftToRight"
        startTrigger={startTrigger && !!revealed.experience}
        headingGroupRef={experienceHeadingRef}
        staggerStep={CONFIG.detailsTimings.BODY_STAGGER_STEP}
        {...shared}
      />

      <DetailsSection
        heading={SECTION_HEADINGS.skills}
        items={skillItems}
        headingX={layoutMode === "narrow" ? leftX : rightTitleX}
        headingY={sectionY("skills").headingY}
        bodyX={layoutMode === "narrow" ? leftX : rightX}
        bodyY={sectionY("skills").bodyY}
        bodyAnchorX={layoutMode === "narrow" ? "left" : "right"}
        direction={layoutMode === "narrow" ? "leftToRight" : "rightToLeft"}
        startTrigger={startTrigger && !!revealed.skills}
        headingGroupRef={skillsHeadingRef}
        staggerStep={CONFIG.detailsTimings.SKILLS_STAGGER_STEP}
        columns={layoutMode === "narrow" ? layout.skillsColumns : 1}
        columnWidth={layout.skillsColumnWidth * pxTo3DWidth}
        {...shared}
      />

      <DetailsSection
        heading={SECTION_HEADINGS.projects}
        items={projectItems}
        headingX={leftX}
        headingY={sectionY("projects").headingY}
        bodyX={bodyColumnX}
        bodyY={sectionY("projects").bodyY}
        bodyAnchorX="left"
        direction="leftToRight"
        startTrigger={startTrigger && !!revealed.projects}
        headingGroupRef={projectsHeadingRef}
        activeItemIndex={activeProjectIndex}
        staggerStep={CONFIG.detailsTimings.BODY_STAGGER_STEP}
        {...shared}
        bodyLineHeight={layout.projectLineHeight * pxTo3DHeight}
      />

      <DetailsSection
        heading={SECTION_HEADINGS.education}
        items={educationItems}
        headingX={leftX}
        headingY={sectionY("education").headingY}
        bodyX={bodyColumnX}
        bodyY={sectionY("education").bodyY}
        bodyAnchorX="left"
        direction="leftToRight"
        startTrigger={startTrigger && !!revealed.education}
        headingGroupRef={educationHeadingRef}
        staggerStep={CONFIG.detailsTimings.BODY_STAGGER_STEP}
        {...shared}
      />

      <DetailsSection
        heading={SECTION_HEADINGS.courses}
        items={coursesItems}
        headingX={leftX}
        headingY={sectionY("courses").headingY}
        bodyX={bodyColumnX}
        bodyY={sectionY("courses").bodyY}
        bodyAnchorX="left"
        direction="leftToRight"
        startTrigger={startTrigger && !!revealed.courses}
        headingGroupRef={coursesHeadingRef}
        staggerStep={CONFIG.detailsTimings.BODY_STAGGER_STEP}
        {...shared}
      />

      <BioSection
        heading={SECTION_HEADINGS.bio}
        lines={layout.bioLines}
        imageX={leftX + layout.bioImageXOffset * pxTo3DWidth}
        imageY={sectionTop - layout.bioImageY * pxTo3DHeight}
        headingX={
          layoutMode === "narrow"
            ? leftX
            : leftX + layout.bioTextOffset * pxTo3DWidth
        }
        headingY={sectionY("bio").headingY}
        textY={sectionY("bio").bodyY}
        imageWidth={layout.bioImageWidth * pxTo3DWidth}
        imageHeight={layout.bioImageHeight * pxTo3DHeight}
        textX={leftX + layout.bioTextOffset * pxTo3DWidth}
        headingFontSize={headingSize}
        bodyFontSize={bodySize}
        bodyLineHeight={bodyLineHeight}
        pxTo3DWidth={pxTo3DWidth}
        startTrigger={startTrigger && !!revealed.bio}
      />
    </group>
  );
}
