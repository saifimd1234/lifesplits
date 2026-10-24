import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { LifeGroup } from '@/constants/theme';
import { defaultEmojiFor } from '@/lib/emoji';
import { MINUTE, startOfDay } from '@/lib/time';
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
  DEFAULT_CATEGORIES.map(([name, group]) => ({ id: newId(), name, emoji: defaultEmojiFor(name), group, goalId: null }));

const blankLap = (sessionId: string, startedAt: number, endedAt: number | null): Lap => ({
  id: newId(),
  sessionId,
  startedAt,
  endedAt,
  categoryId: null,
  goalId: null,
  note: '',
  energy: null,
  focus: null,
  mood: null,
});

const byStart = (a: Lap, b: Lap) => a.startedAt - b.startedAt;

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
  addCategory: (name: string, group: LifeGroup, goalId?: string | null, emoji?: string) => Category;
  /** With `relinkLaps`, laps already in this category move to its new goal too. */
  updateCategory: (id: string, patch: Partial<Omit<Category, 'id'>>, relinkLaps?: boolean) => void;
  /** Removes the category; its laps become unlabeled. */
  deleteCategory: (id: string) => void;
  /** Moves a lap's start/end; touching laps in the same day stretch or shrink to stay gapless. */
  retimeLap: (id: string, startedAt: number, endedAt: number | null) => void;
  /**
   * Cuts a lap in two at `at`. The labels stay with the part they describe — the earlier part for a
   * finished lap, the running part for the current one. Returns the id of the new unlabeled part.
   */
  splitLap: (id: string, at: number) => string | null;
  /** Adds a lap for time you forgot to track. Overlapping laps are trimmed; returns the new lap's id. */
  addPastLap: (startedAt: number, endedAt: number) => string | null;
  /** Removes a finished lap. Mid-day its time joins the lap before; at either end of a day it is trimmed off. */
  deleteLap: (id: string) => void;
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
        const first = blankLap(session.id, now, null);
        set((s) => ({ sessions: [...s.sessions, session], laps: [...s.laps, first] }));
      },

      lap: () => {
        const { laps } = get();
        const running = laps.find((l) => l.endedAt === null);
        if (!running) return null;
        const now = Date.now();
        const next = blankLap(running.sessionId, now, null);
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

      addCategory: (name, group, goalId = null, emoji) => {
        const clean = name.trim();
        const category: Category = { id: newId(), name: clean, emoji: emoji ?? defaultEmojiFor(clean), group, goalId };
        set((s) => ({ categories: [...s.categories, category] }));
        return category;
      },

      updateCategory: (id, patch, relinkLaps = false) =>
        set((s) => ({
          categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
          laps:
            relinkLaps && patch.goalId !== undefined
              ? s.laps.map((l) => (l.categoryId === id ? { ...l, goalId: patch.goalId! } : l))
              : s.laps,
        })),

      deleteCategory: (id) =>
        set((s) => ({
          categories: s.categories.filter((c) => c.id !== id),
          laps: s.laps.map((l) => (l.categoryId === id ? { ...l, categoryId: null } : l)),
        })),

      retimeLap: (id, startedAt, endedAt) => {
        const { laps, sessions } = get();
        const lap = laps.find((l) => l.id === id);
        const session = lap && sessions.find((x) => x.id === lap.sessionId);
        if (!lap || !session) return;
        const now = Date.now();
        const own = laps.filter((l) => l.sessionId === lap.sessionId).sort(byStart);
        const i = own.findIndex((l) => l.id === id);
        const prev = own[i - 1];
        const next = own[i + 1];
        const others = sessions.filter((x) => x.id !== session.id);
        // A day's first and last laps can grow into untracked time, but not into another day.
        const floor = prev
          ? prev.startedAt + MINUTE
          : Math.max(...others.filter((x) => x.endedAt !== null && x.endedAt <= session.startedAt).map((x) => x.endedAt!));
        const ceil = next
          ? (next.endedAt ?? now) - MINUTE
          : Math.min(now, ...others.filter((x) => x.startedAt >= (session.endedAt ?? now)).map((x) => x.startedAt));
        const end = lap.endedAt === null || endedAt === null ? null : Math.min(ceil, endedAt);
        const start = Math.max(floor, Math.min(startedAt, (end ?? now) - MINUTE));
        set((s) => ({
          laps: s.laps.map((l) => {
            if (l.id === id) return { ...l, startedAt: start, endedAt: end };
            if (l.id === prev?.id) return { ...l, endedAt: start };
            if (l.id === next?.id && end !== null) return { ...l, startedAt: end };
            return l;
          }),
          sessions: s.sessions.map((x) => {
            if (x.id !== session.id) return x;
            return {
              ...x,
              startedAt: prev ? x.startedAt : start,
              endedAt: !next && x.endedAt !== null && end !== null ? end : x.endedAt,
            };
          }),
        }));
      },

      splitLap: (id, at) => {
        const lap = get().laps.find((l) => l.id === id);
        if (!lap || at < lap.startedAt + MINUTE || at > (lap.endedAt ?? Date.now()) - MINUTE) return null;
        const running = lap.endedAt === null;
        // The labeled part keeps the lap's id; the other part is new.
        const head: Lap = running ? blankLap(lap.sessionId, lap.startedAt, at) : { ...lap, endedAt: at };
        const tail: Lap = running ? { ...lap, startedAt: at } : blankLap(lap.sessionId, at, lap.endedAt);
        set((s) => ({ laps: [...s.laps.filter((l) => l.id !== id), head, tail] }));
        return running ? head.id : tail.id;
      },

      addPastLap: (startedAt, endedAt) => {
        const now = Date.now();
        const end = Math.min(endedAt, now);
        if (end - startedAt < MINUTE) return null;
        const s = get();
        // Days the new lap touches merge into one so waking time is never counted twice.
        const touching = s.sessions.filter((x) => x.startedAt <= end && (x.endedAt ?? now) >= startedAt);
        const sessionId = touching[0]?.id ?? newId();
        const merged: Session = {
          id: sessionId,
          startedAt: Math.min(startedAt, ...touching.map((x) => x.startedAt)),
          endedAt: touching.some((x) => x.endedAt === null) ? null : Math.max(end, ...touching.map((x) => x.endedAt!)),
        };
        const mergedIds = new Set(touching.map((x) => x.id));
        const laps: Lap[] = [];
        for (const original of s.laps) {
          const l = mergedIds.has(original.sessionId) ? { ...original, sessionId } : original;
          const lEnd = l.endedAt ?? now;
          if (lEnd <= startedAt || l.startedAt >= end) {
            laps.push(l);
            continue;
          }
          const keepsLeft = l.startedAt < startedAt;
          if (keepsLeft) laps.push({ ...l, endedAt: startedAt });
          // The running lap always survives so the clock keeps going.
          if (lEnd > end || l.endedAt === null) laps.push({ ...l, id: keepsLeft ? newId() : l.id, startedAt: end });
        }
        const added = blankLap(sessionId, startedAt, end);
        set({ laps: [...laps, added], sessions: [...s.sessions.filter((x) => !mergedIds.has(x.id)), merged] });
        return added.id;
      },

      deleteLap: (id) => {
        const { laps } = get();
        const lap = laps.find((l) => l.id === id);
        if (!lap || lap.endedAt === null) return;
        const own = laps.filter((l) => l.sessionId === lap.sessionId).sort(byStart);
        const i = own.findIndex((l) => l.id === id);
        const prev = own[i - 1];
        const next = own[i + 1];
        set((s) => ({
          laps: s.laps.filter((l) => l.id !== id).map((l) => (prev && next && l.id === prev.id ? { ...l, endedAt: lap.endedAt } : l)),
          sessions:
            own.length === 1
              ? s.sessions.filter((x) => x.id !== lap.sessionId)
              : s.sessions.map((x) => {
                  if (x.id !== lap.sessionId) return x;
                  if (!prev) return { ...x, startedAt: next.startedAt };
                  if (!next) return { ...x, endedAt: prev.endedAt };
                  return x;
                }),
        }));
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
            else categories.push({ id: newId(), name: clean, emoji: defaultEmojiFor(clean), group: 'other', goalId });
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
      version: 3,
      storage: createJSONStorage(() => persistStorage),
      // v2 added a mood rating to laps, v3 an emoji to categories.
      migrate: (persisted, version) => {
        const data = persisted as Data;
        if (version < 2) data.laps = data.laps.map((l) => ({ ...l, mood: l.mood ?? null }));
        if (version < 3) data.categories = data.categories.map((c) => ({ ...c, emoji: c.emoji ?? defaultEmojiFor(c.name) }));
        return data as Data & Actions;
      },
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
