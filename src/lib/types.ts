import type { LifeGroup } from '@/constants/theme';

export type Goal = {
  id: string;
  name: string;
  color: string;
  /** Share of waking (tracked) time the user wants to give this goal, 1–100. */
  targetPct: number;
  /** User's estimate of total hours the goal needs. */
  effortHours: number;
  startDate: number;
  targetDate: number;
  createdAt: number;
  archived: boolean;
};

export type Category = {
  id: string;
  name: string;
  /** Laps in this category count toward this goal by default. */
  goalId: string | null;
  /** Where the time goes when it is not a goal. */
  group: LifeGroup;
};

/** One run of the clock — normally wake to sleep. */
export type Session = {
  id: string;
  startedAt: number;
  endedAt: number | null;
};

export type Lap = {
  id: string;
  sessionId: string;
  startedAt: number;
  endedAt: number | null;
  categoryId: string | null;
  goalId: string | null;
  note: string;
  energy: number | null;
  focus: number | null;
};

export type Period = 'day' | 'week' | 'month' | 'year';
