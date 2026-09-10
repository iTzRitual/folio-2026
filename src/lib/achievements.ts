import { achievementContent } from "@/data/content";

export type AchievementId = keyof typeof achievementContent;

const listeners = new Set<(id: AchievementId) => void>();

export function showAchievement(id: AchievementId) {
  for (const listener of listeners) listener(id);
}

export function subscribeAchievements(listener: (id: AchievementId) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
