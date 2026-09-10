"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { CONFIG } from "@/config/constants";
import { achievementContent } from "@/data/content";
import { subscribeAchievements, type AchievementId } from "@/lib/achievements";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import styles from "./AchievementToast.module.css";

const tuning = CONFIG.achievement;
const variables = {
  "--achievement-width": `${tuning.WIDTH}px`,
  "--achievement-height": `${tuning.HEIGHT}px`,
  "--achievement-bottom": `${tuning.BOTTOM}px`,
  "--achievement-background": tuning.BACKGROUND,
  "--achievement-accent": tuning.ACCENT,
  "--achievement-foreground": tuning.FOREGROUND,
} as CSSProperties;

export function AchievementToast() {
  const [queue, setQueue] = useState<{ id: AchievementId; sequence: number }[]>([]);
  const sequence = useRef(0);
  const root = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const active = queue[0];

  useEffect(() => subscribeAchievements(id => {
    const entry = { id, sequence: sequence.current++ };
    setQueue(previous => [...previous, entry]);
  }), []);

  useLayoutEffect(() => {
    const element = root.current;
    if (!active || !element) return;
    const animations: Animation[] = [];
    const animate = (selector: string, frames: (Keyframe & { at: number })[]) => {
      const target = element.querySelector<HTMLElement>(selector);
      if (!target) return;
      const animation = target.animate(frames.map(({ at, ...frame }) => ({
        ...frame, offset: at / tuning.DURATION,
      })), { duration: tuning.DURATION, fill: "both" });
      animations.push(animation);
      return animation;
    };
    const halfTravel = (tuning.WIDTH - tuning.HEIGHT) / 2;
    const capsuleClip = (inset: number) => `inset(0 ${inset / tuning.WIDTH * 100}% round 9999px)`;
    const badgePosition = (inset: number) => `translateX(${inset / tuning.HEIGHT * 100}%)`;
    const circle = capsuleClip(halfTravel);
    const widthSamples = tuning.WIDTH_SAMPLES.map(([at, width]) => ({
      at,
      inset: halfTravel * (1 - (width - tuning.REFERENCE_CIRCLE) /
        (tuning.REFERENCE_WIDTH - tuning.REFERENCE_CIRCLE)),
    }));
    const lifetime = animate('[data-part="lifetime"]', reducedMotion ? [
      { at: 0, transform: "none" },
      { at: tuning.DURATION, transform: "none" },
    ] : [
      { at: 0, transform: "scale(0)" },
      { at: tuning.APPEAR, transform: "scale(0)", easing: tuning.EASE },
      { at: tuning.SETTLE - 200, transform: "scale(1.08)", easing: "ease-out" },
      { at: tuning.SETTLE, transform: "scale(1)" },
      { at: tuning.DISAPPEAR, transform: "scale(1)", easing: "ease-in-out" },
      { at: tuning.DURATION, transform: "scale(0)" },
    ]);
    if (!reducedMotion) {
      animate('[data-part="capsule"]', [
        { at: 0, clipPath: circle },
        ...widthSamples.map(({ at, inset }) => ({
          at, clipPath: capsuleClip(inset),
        })),
        { at: tuning.DURATION, clipPath: circle },
      ]);
      animate('[data-part="badge"]', [
        { at: 0, transform: badgePosition(halfTravel) },
        ...widthSamples.filter(({ at }) => at <= tuning.EXPANDED).map(({ at, inset }) => ({
          at, transform: badgePosition(inset),
        })),
        { at: tuning.TEXT_OUT, transform: badgePosition(0), easing: "ease-in-out" },
        { at: tuning.RECENTER, transform: badgePosition(halfTravel) },
        { at: tuning.DURATION, transform: badgePosition(halfTravel) },
      ]);
      animate('[data-part="copy"]', [
        { at: 0, clipPath: "inset(0 100% 0 0)" },
        { at: tuning.TEXT_IN, clipPath: "inset(0 100% 0 0)" },
        { at: tuning.TEXT_VISIBLE, clipPath: "inset(0 0% 0 0)" },
        { at: tuning.TEXT_OUT, clipPath: "inset(0 0% 0 0)" },
        { at: tuning.TEXT_HIDDEN, clipPath: "inset(0 100% 0 0)" },
        { at: tuning.DURATION, clipPath: "inset(0 100% 0 0)" },
      ]);
    }
    if (lifetime) lifetime.onfinish = () => {
      setQueue(previous => previous.filter(entry => entry.sequence !== active.sequence));
    };
    return () => animations.forEach(animation => {
      animation.onfinish = null;
      animation.cancel();
    });
  }, [active, reducedMotion]);

  const content = active ? achievementContent[active.id] : null;

  return <div className={styles.region} style={variables} role="status" aria-live="polite" aria-atomic="true">
    {content && active && <div key={active.sequence} ref={root} className={styles.viewport}>
      <span className={styles.srOnly}>{content.title}. {content.points} / {content.total} points.</span>
      <div className={styles.lifetime} data-part="lifetime" aria-hidden="true">
        <div className={styles.capsule} data-part="capsule">
          <div className={styles.badge} data-part="badge">
            <div className={styles.accent} data-part="accent" />
            <span className={styles.logo} />
          </div>
          <div className={styles.copy} data-part="copy">
            <div className={styles.title}>{content.title}</div>
            <div className={styles.points}><span className={styles.gamerscore}>G</span>{content.points}/{content.total}</div>
          </div>
        </div>
      </div>
    </div>}
  </div>;
}
