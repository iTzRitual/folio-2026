"use client";

import { useRef, useLayoutEffect } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { CONFIG } from "../config/constants";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

gsap.registerPlugin(SplitText, ScrollTrigger);

interface AnimatedRevealTextProps {
  children: React.ReactNode;
  animateOnScroll?: boolean;
  delay?: number;
  blockColor?: string;
  stagger?: number;
  duration?: number;
  onReveal?: (index: number) => void;
  direction?: "leftToRight" | "rightToLeft";
  startTrigger?: boolean;
}

export function AnimatedRevealText({
  children,
  animateOnScroll = false,
  delay = 0,
  blockColor = "#ffffff",
  stagger = CONFIG.copy.STAGGER,
  duration = CONFIG.copy.DURATION,
  onReveal,
  direction = "leftToRight",
  startTrigger = true,
}: AnimatedRevealTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const onRevealRef = useRef(onReveal);
  useLayoutEffect(() => {
    onRevealRef.current = onReveal;
  }, [onReveal]);
  const splitRefs = useRef<SplitText[]>([]);
  const lines = useRef<Element[]>([]);
  const blocks = useRef<HTMLDivElement[]>([]);
  const scrollTriggersRef = useRef<ScrollTrigger[]>([]);
  const visibilityRafRef = useRef<number | null>(null);

  useGSAP(
    () => {
      if (!containerRef.current) return;

      if (prefersReducedMotion) {
        if (!startTrigger) return;
        const call = gsap.delayedCall(delay, () => {
          onRevealRef.current?.(0);
        });
        return () => call.kill();
      }

      splitRefs.current = [];
      lines.current = [];
      blocks.current = [];
      scrollTriggersRef.current.forEach((trigger) => trigger.kill());
      scrollTriggersRef.current = [];
      if (visibilityRafRef.current !== null) {
        cancelAnimationFrame(visibilityRafRef.current);
        visibilityRafRef.current = null;
      }

      let elements: Element[] = [];

      if (containerRef.current.hasAttribute("data-copy-wrapper")) {
        elements = Array.from(containerRef.current.children);
      } else {
        elements = [containerRef.current];
      }

      elements.forEach((element) => {
        const split = SplitText.create(element, {
          type: "lines",
          linesClass: "block-line++",
          lineThreshold: CONFIG.copy.LINE_THRESHOLD,
        });

        splitRefs.current.push(split);
        split.lines.forEach((line) => {
          const wrapper = document.createElement("div");
          wrapper.className = "block-line-wrapper";
          if (line.parentNode) {
            line.parentNode.insertBefore(wrapper, line);
          }
          wrapper.appendChild(line);

          const block = document.createElement("div");
          block.className = "block-revealer";
          block.style.backgroundColor = blockColor;
          wrapper.appendChild(block);

          lines.current.push(line);
          blocks.current.push(block);
        });
      });

      const initialOrigin =
        direction === "leftToRight" ? "left center" : "right center";
      const exitOrigin =
        direction === "leftToRight" ? "right center" : "left center";

      gsap.set(lines.current, { opacity: 0 });
      gsap.set(blocks.current, { scaleX: 0, transformOrigin: initialOrigin });

      const createBlockRevealAnimation = (
        block: HTMLDivElement,
        line: Element,
        index: number,
      ) => {
        const tl = gsap.timeline({ delay: delay + index * stagger });

        tl.to(block, { scaleX: 1, duration: duration, ease: "power4.inOut" });
        tl.set(line, { opacity: 1 });
        tl.call(() => {
          if (onRevealRef.current) onRevealRef.current(index);
        });
        tl.set(block, { transformOrigin: exitOrigin });
        tl.to(block, { scaleX: 0, duration: duration, ease: "power4.inOut" });

        return tl;
      };

      if (animateOnScroll) {
        const timelines: gsap.core.Timeline[] = [];

        const playAllReveals = () => {
          timelines.forEach((timeline) => {
            if (timeline.progress() === 0) {
              timeline.play();
            }
          });

          scrollTriggersRef.current.forEach((trigger) => trigger.kill(false));
          scrollTriggersRef.current = [];

          if (visibilityRafRef.current !== null) {
            cancelAnimationFrame(visibilityRafRef.current);
            visibilityRafRef.current = null;
          }
        };

        const isContainerVisible = () => {
          const rect = containerRef.current?.getBoundingClientRect();
          if (!rect) return false;

          return rect.top <= window.innerHeight && rect.bottom >= 0;
        };

        blocks.current.forEach((block, index) => {
          const tl = createBlockRevealAnimation(
            block,
            lines.current[index],
            index,
          );
          tl.pause();
          timelines.push(tl);

          const trigger = ScrollTrigger.create({
            trigger: containerRef.current,
            start: "top bottom",
            end: "bottom top",
            once: true,
            onEnter: playAllReveals,
            onEnterBack: playAllReveals,
            onRefresh: (self) => {
              if (isContainerVisible()) {
                playAllReveals();
                self.kill(false);
              }
            },
          });

          scrollTriggersRef.current.push(trigger);
        });

        if (isContainerVisible()) {
          playAllReveals();
        } else {
          const pollUntilVisible = () => {
            if (isContainerVisible()) {
              playAllReveals();
              return;
            }

            visibilityRafRef.current = requestAnimationFrame(pollUntilVisible);
          };

          visibilityRafRef.current = requestAnimationFrame(pollUntilVisible);
        }
      } else {
        blocks.current.forEach((block, index) => {
          const tl = createBlockRevealAnimation(
            block,
            lines.current[index],
            index,
          );

          if (!startTrigger) {
            tl.pause();
          }
        });
      }

      return () => {
        scrollTriggersRef.current.forEach((trigger) => trigger.kill());
        scrollTriggersRef.current = [];
        if (visibilityRafRef.current !== null) {
          cancelAnimationFrame(visibilityRafRef.current);
          visibilityRafRef.current = null;
        }

        splitRefs.current.forEach((split) => split?.revert());

        const wrappers = containerRef.current?.querySelectorAll(
          ".block-line-wrapper",
        );
        wrappers?.forEach((wrapper) => {
          if (wrapper.parentNode && wrapper.firstChild) {
            wrapper.parentNode.insertBefore(wrapper.firstChild, wrapper);
            wrapper.remove();
          }
        });
      };
    },
    {
      scope: containerRef,
      dependencies: [
        animateOnScroll,
        delay,
        blockColor,
        stagger,
        duration,
        direction,
        startTrigger,
        prefersReducedMotion,
      ],
    },
  );

  return (
    <div ref={containerRef} data-copy-wrapper="true">
      {children}
    </div>
  );
}
