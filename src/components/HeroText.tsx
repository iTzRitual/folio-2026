import { Title } from "./HeroScene/Title";
import { Subtitle } from "./HeroScene/Subtitle";
import { ProfessionLabel } from "./HeroScene/ProfessionLabel";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";
import { useHeroLayout } from "@/context/HeroLayoutContext";
import { useAnimationContext } from "@/context/AnimationContext";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

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
  const progressRef = useRef(0);
  const titleGroupRef = useRef<Group>(null);
  const subtitleGroupRef = useRef<Group>(null);
  const heroGroupRef = useRef<Group>(null);

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

  useFrame(() => {
    const heroExit = progressRef.current;
    const titleYOffset = heroExit * viewport.height * 0.7;
    const subtitleProgress = 1 - Math.pow(1 - heroExit, 1.05);
    const subtitleYOffset = subtitleProgress * viewport.height * 0.22;
    const heroYOffset = heroExit * viewport.height * 1.05;

    if (titleGroupRef.current) {
      titleGroupRef.current.position.y = titleYOffset;
    }
    if (subtitleGroupRef.current) {
      subtitleGroupRef.current.position.y = subtitleYOffset;
    }
    if (heroGroupRef.current) {
      heroGroupRef.current.position.y = heroYOffset;
      heroGroupRef.current.visible = heroExit < 0.98;
    }
  });

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
  const scrollHintOpacity = 1;

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
          scrollHintOpacity={scrollHintOpacity}
        >
          Natan Mokrzycki
        </Title>
      </group>
      <group position={[0, 0, 0]} ref={subtitleGroupRef}>
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
