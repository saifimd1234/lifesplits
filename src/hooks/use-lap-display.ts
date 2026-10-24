import { useMemo } from 'react';

import { useLifeColors, useTheme } from '@/hooks/use-theme';
import { categoryLabel } from '@/lib/emoji';
import type { Lap } from '@/lib/types';
import { useAppStore } from '@/store/app-store';

/** Name and color for a lap: goal color if it counts toward a goal, a neutral otherwise. */
export function useLapDisplay() {
  const t = useTheme();
  const life = useLifeColors();
  const goals = useAppStore((s) => s.goals);
  const categories = useAppStore((s) => s.categories);
  return useMemo(() => {
    const goalById = new Map(goals.map((g) => [g.id, g]));
    const catById = new Map(categories.map((c) => [c.id, c]));
    return {
      goalById,
      catById,
      name: (lap: Lap) => {
        const cat = lap.categoryId ? catById.get(lap.categoryId) : undefined;
        return cat ? categoryLabel(cat) : 'Unlabeled';
      },
      color: (lap: Lap) => {
        const goal = lap.goalId ? goalById.get(lap.goalId) : undefined;
        if (goal) return goal.color;
        const cat = lap.categoryId ? catById.get(lap.categoryId) : undefined;
        return cat ? life[cat.group] : t.fillStrong;
      },
      goal: (lap: Lap) => (lap.goalId ? goalById.get(lap.goalId) : undefined),
    };
  }, [goals, categories, life, t.fillStrong]);
}
