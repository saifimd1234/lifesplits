import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { LifeGroup } from '@/constants/theme';
import { startOfDay } from '@/lib/time';
import type { Category, Goal, Lap, Session } from '@/lib/types';
import { buildSampleData } from '@/store/sample-data';
import { persistStorage } from '@/store/storage';

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const DEFAULT_CATEGORIES: [string, LifeGroup][] = [
  ['Getting ready', 'routine'],
  ['Breakfast', 'routine'],
  ['Work', 'work'],
  ['Commute', 'commute'],
  ['Lunch', 'routine'],
  ['Chores', 'routine'],
  ['Dinner', 'routine'],
  ['Scrolling', 'leisure'],
  ['TV', 'leisure'],
  ['Break', 'other'],
];

export const defaultCategories = (): Category[] =>
  DEFAULT_CATEGORIES.map(([name, group]) => ({ id: newId(), name, group, goalId: null }));

export type TipKey = 'today' | 'goals' | 'review' | 'lapSheet';

type Data = {
  onboarded: boolean;
  seenTips: Partial<Record<TipKey, boolean>>;
  goals: Goal[];
  categories: Category[];
  sessions: Session[];
  laps: Lap[];
};

export type NewGoalInput = {
  name: string;
  color: string;
  targetPct: number;
  effortHours: number;
  targetDate: number;
};

type Actions = {
  completeOnboarding: () => void;
  replayIntro: () => void;
  dismissTip: (key: TipKey) => void;
  startDay: () => void;
  /** Closes the running lap and starts the next one. Returns the closed lap's id. */
  lap: () => string | null;
  /** Closes the running lap and the session. Returns the closed lap's id. */
  endDay: () => string | null;
  updateLap: (id: string, patch: Partial<Omit<Lap, 'id' | 'sessionId'>>) => void;
  addCategory: (name: string, group: LifeGroup, goalId?: string | null) => Category;
  addGoal: (input: NewGoalInput) => Goal;
  /** Makes exactly these categories (plus newly named ones) count toward the goal. */
  linkCategories: (goalId: string, categoryIds: string[], newNames: string[]) => void;
  updateGoal: (id: string, patch: Partial<Omit<Goal, 'id'>>) => void;
  deleteGoal: (id: string) => void;
  loadSampleData: () => void;
  resetAll: () => void;
};

const initialData = (): Data => ({
  onboarded: false,
  seenTips: {},
  goals: [],
  categories: defaultCategories(),
  sessions: [],
  laps: [],
});

export const useAppStore = create<Data & Actions>()(
  persist(
    (set, get) => ({
      ...initialData(),

      completeOnboarding: () => set({ onboarded: true }),
      replayIntro: () => set({ onboarded: false, seenTips: {} }),
      dismissTip: (key) => set((s) => ({ seenTips: { ...s.seenTips, [key]: true } })),

      startDay: () => {
        if (get().sessions.some((s) => s.endedAt === null)) return;
        const now = Date.now();
        const session: Session = { id: newId(), startedAt: now, endedAt: null };
        const first: Lap = {
          id: newId(),
          sessionId: session.id,
          startedAt: now,
          endedAt: null,
          categoryId: null,
          goalId: null,
          note: '',
          energy: null,
          focus: null,
        };
        set((s) => ({ sessions: [...s.sessions, session], laps: [...s.laps, first] }));
      },

      lap: () => {
        const { laps } = get();
        const running = laps.find((l) => l.endedAt === null);
        if (!running) return null;
        const now = Date.now();
        const next: Lap = {
          id: newId(),
          sessionId: running.sessionId,
          startedAt: now,
          endedAt: null,
          categoryId: null,
          goalId: null,
          note: '',
          energy: null,
          focus: null,
        };
        set((s) => ({
          laps: [...s.laps.map((l) => (l.id === running.id ? { ...l, endedAt: now } : l)), next],
        }));
        return running.id;
      },

      endDay: () => {
        const now = Date.now();
        const running = get().laps.find((l) => l.endedAt === null);
        set((s) => ({
          laps: s.laps.map((l) => (l.endedAt === null ? { ...l, endedAt: now } : l)),
          sessions: s.sessions.map((x) => (x.endedAt === null ? { ...x, endedAt: now } : x)),
        }));
        return running?.id ?? null;
      },

      updateLap: (id, patch) =>
        set((s) => ({ laps: s.laps.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),

      addCategory: (name, group, goalId = null) => {
        const category: Category = { id: newId(), name: name.trim(), group, goalId };
        set((s) => ({ categories: [...s.categories, category] }));
        return category;
      },

      addGoal: (input) => {
        const now = Date.now();
        const goal: Goal = {
          id: newId(),
          name: input.name.trim(),
          color: input.color,
          targetPct: input.targetPct,
          effortHours: input.effortHours,
          startDate: startOfDay(now),
          targetDate: input.targetDate,
          createdAt: now,
          archived: false,
        };
        set((s) => ({ goals: [...s.goals, goal] }));
        return goal;
      },

      linkCategories: (goalId, categoryIds, newNames) =>
        set((s) => {
          const ids = new Set(categoryIds);
          const categories = s.categories.map((c) => {
            if (ids.has(c.id)) return { ...c, goalId };
            return c.goalId === goalId ? { ...c, goalId: null } : c;
          });
          for (const name of newNames) {
            const clean = name.trim();
            if (!clean) continue;
            const i = categories.findIndex((c) => c.name.toLowerCase() === clean.toLowerCase());
            if (i >= 0) categories[i] = { ...categories[i], goalId };
            else categories.push({ id: newId(), name: clean, group: 'other', goalId });
          }
          return { categories };
        }),

      updateGoal: (id, patch) =>
        set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) })),

      deleteGoal: (id) =>
        set((s) => ({
          goals: s.goals.filter((g) => g.id !== id),
          categories: s.categories.map((c) => (c.goalId === id ? { ...c, goalId: null } : c)),
          laps: s.laps.map((l) => (l.goalId === id ? { ...l, goalId: null } : l)),
        })),

      loadSampleData: () => {
        const sample = buildSampleData(Date.now(), newId);
        set((s) => ({ ...sample, onboarded: true, seenTips: s.seenTips }));
      },

      resetAll: () => set({ ...initialData() }),
    }),
    {
      name: 'lifesplits-store',
      version: 1,
      storage: createJSONStorage(() => persistStorage),
    },
  ),
);

/** True once persisted data has loaded from disk. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useAppStore.persist.onFinishHydration(onChange),
    () => useAppStore.persist.hasHydrated(),
  );
}

export const selectRunningLap = (s: Data) => s.laps.find((l) => l.endedAt === null) ?? null;
export const selectActiveSession = (s: Data) => s.sessions.find((x) => x.endedAt === null) ?? null;
