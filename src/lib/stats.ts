import { LifeGroupLabels, type LifeGroup } from '@/constants/theme';
import {
  addDays,
  addMonths,
  DAY,
  formatDate,
  formatHours,
  isoWeek,
  periodRange,
  startOfDay,
  startOfWeek,
} from '@/lib/time';
import type { Category, Goal, Lap, Period, Session } from '@/lib/types';

export function lapDuration(lap: Lap, now: number): number {
  return (lap.endedAt ?? now) - lap.startedAt;
}

/** Part of an interval [a, b) that falls inside [start, end). */
function overlap(a: number, b: number, start: number, end: number): number {
  return Math.max(0, Math.min(b, end) - Math.max(a, start));
}

/** Waking time = time the clock was running. */
export function trackedTime(sessions: Session[], start: number, end: number, now: number): number {
  let total = 0;
  for (const s of sessions) total += overlap(s.startedAt, s.endedAt ?? now, start, end);
  return total;
}

export function lapsInRange(laps: Lap[], start: number, end: number, now: number): Lap[] {
  return laps
    .filter((l) => overlap(l.startedAt, l.endedAt ?? now, start, end) > 0)
    .sort((a, b) => a.startedAt - b.startedAt);
}

export type Slice = { key: string; label: string; ms: number; color: string; isGoal: boolean };

export type Breakdown = {
  total: number;
  goalTotal: number;
  byGoal: Map<string, number>;
  byCategory: Map<string, number>;
  byGroup: Record<LifeGroup | 'unlabeled', number>;
};

export function breakdown(
  laps: Lap[],
  categories: Category[],
  start: number,
  end: number,
  now: number,
): Breakdown {
  const catById = new Map(categories.map((c) => [c.id, c]));
  const result: Breakdown = {
    total: 0,
    goalTotal: 0,
    byGoal: new Map(),
    byCategory: new Map(),
    byGroup: { work: 0, routine: 0, leisure: 0, commute: 0, other: 0, unlabeled: 0 },
  };
  for (const lap of laps) {
    const ms = overlap(lap.startedAt, lap.endedAt ?? now, start, end);
    if (ms <= 0) continue;
    result.total += ms;
    if (lap.categoryId) result.byCategory.set(lap.categoryId, (result.byCategory.get(lap.categoryId) ?? 0) + ms);
    if (lap.goalId) {
      result.goalTotal += ms;
      result.byGoal.set(lap.goalId, (result.byGoal.get(lap.goalId) ?? 0) + ms);
      continue;
    }
    const cat = lap.categoryId ? catById.get(lap.categoryId) : undefined;
    result.byGroup[cat ? cat.group : 'unlabeled'] += ms;
  }
  return result;
}

/** Goals first (in color), then life groups (in neutrals), largest first within each. */
export function slices(b: Breakdown, goals: Goal[], lifeColors: Record<LifeGroup, string>, unlabeledColor: string): Slice[] {
  const goalSlices: Slice[] = goals
    .map((g) => ({ key: g.id, label: g.name, ms: b.byGoal.get(g.id) ?? 0, color: g.color, isGoal: true }))
    .filter((s) => s.ms > 0)
    .sort((x, y) => y.ms - x.ms);
  const groups = Object.keys(LifeGroupLabels) as LifeGroup[];
  const lifeSlices: Slice[] = groups
    .map((g) => ({ key: g, label: LifeGroupLabels[g], ms: b.byGroup[g], color: lifeColors[g], isGoal: false }))
    .filter((s) => s.ms > 0)
    .sort((x, y) => y.ms - x.ms);
  const rest: Slice[] =
    b.byGroup.unlabeled > 0
      ? [{ key: 'unlabeled', label: 'Unlabeled', ms: b.byGroup.unlabeled, color: unlabeledColor, isGoal: false }]
      : [];
  return [...goalSlices, ...lifeSlices, ...rest];
}

export type GoalProgress = {
  invested: number;
  effort: number;
  /** Share of tracked time over the last 7 days (or since the goal started). */
  allocation: number;
  /** allocation ÷ target. 1 = on plan. */
  reality: number;
  plannedDays: number;
  /** Days from start to projected finish at the current pace; null until there is a pace. */
  projectedDays: number | null;
  projectedFinish: number | null;
  /** Projected finish minus target date, in days. Positive = late. */
  slipDays: number | null;
  perDay: number;
  done: boolean;
};

export function goalProgress(goal: Goal, laps: Lap[], sessions: Session[], now: number): GoalProgress {
  let invested = 0;
  for (const l of laps) if (l.goalId === goal.id) invested += overlap(l.startedAt, l.endedAt ?? now, goal.startDate, now);
  const effort = goal.effortHours * 3_600_000;
  const windowStart = Math.max(goal.startDate, now - 7 * DAY);
  let windowGoal = 0;
  for (const l of laps) if (l.goalId === goal.id) windowGoal += overlap(l.startedAt, l.endedAt ?? now, windowStart, now);
  const windowTracked = trackedTime(sessions, windowStart, now, now);
  const allocation = windowTracked > 0 ? windowGoal / windowTracked : 0;
  const elapsedDays = Math.max(1, (now - goal.startDate) / DAY);
  const perDay = invested / elapsedDays;
  const remaining = Math.max(0, effort - invested);
  const done = remaining === 0;
  const plannedDays = Math.max(1, Math.round((goal.targetDate - goal.startDate) / DAY));
  let projectedFinish: number | null = null;
  let projectedDays: number | null = null;
  if (done) {
    projectedFinish = now;
    projectedDays = Math.round(elapsedDays);
  } else if (perDay > 0) {
    projectedFinish = now + (remaining / perDay) * DAY;
    projectedDays = Math.round((projectedFinish - goal.startDate) / DAY);
  }
  const slipDays = projectedFinish === null ? null : Math.round((startOfDay(projectedFinish) - startOfDay(goal.targetDate)) / DAY);
  return {
    invested,
    effort,
    allocation,
    reality: goal.targetPct > 0 ? allocation / (goal.targetPct / 100) : 0,
    plannedDays,
    projectedDays,
    projectedFinish,
    slipDays,
    perDay,
    done,
  };
}

/** Goal hours per week since the goal started (at most `weeks`), oldest first. */
export function weeklyGoalHours(goal: Goal, laps: Lap[], now: number, weeks: number) {
  const thisWeek = startOfWeek(now);
  const out: { label: string; start: number; ms: number; current: boolean }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = addDays(thisWeek, -7 * i);
    const end = addDays(start, 7);
    if (end <= goal.startDate) continue;
    let ms = 0;
    for (const l of laps) if (l.goalId === goal.id) ms += overlap(l.startedAt, l.endedAt ?? now, start, end);
    out.push({ label: `Wk ${isoWeek(start)}`, start, ms, current: i === 0 });
  }
  return out;
}

export type Bucket = {
  key: string;
  label: string;
  start: number;
  end: number;
  goalMs: number;
  /** Where tapping the bucket drills to. */
  drill: { period: Period; anchor: number };
  isCurrent: boolean;
  isFuture: boolean;
};

/** One level down from the period: year → months, month → weeks, week → days. */
export function drillBuckets(period: Period, anchor: number, laps: Lap[], now: number): Bucket[] {
  const { start, end } = periodRange(period, anchor);
  const ranges: { start: number; end: number; label: string; drill: Period }[] = [];
  if (period === 'year') {
    for (let m = 0; m < 12; m++) {
      const s = addMonths(start, m);
      ranges.push({ start: s, end: addMonths(s, 1), label: formatDate(s, { month: 'narrow' }), drill: 'month' });
    }
  } else if (period === 'month') {
    for (let s = startOfWeek(start); s < end; s = addDays(s, 7)) {
      ranges.push({ start: Math.max(s, start), end: Math.min(addDays(s, 7), end), label: `W${isoWeek(s)}`, drill: 'week' });
    }
  } else if (period === 'week') {
    for (let d = 0; d < 7; d++) {
      const s = addDays(start, d);
      ranges.push({ start: s, end: addDays(s, 1), label: formatDate(s, { weekday: 'narrow' }), drill: 'day' });
    }
  }
  return ranges.map((r) => {
    let goalMs = 0;
    for (const l of laps) if (l.goalId) goalMs += overlap(l.startedAt, l.endedAt ?? now, r.start, r.end);
    return {
      key: String(r.start),
      label: r.label,
      start: r.start,
      end: r.end,
      goalMs,
      drill: { period: r.drill, anchor: r.start },
      isCurrent: now >= r.start && now < r.end,
      isFuture: r.start > now,
    };
  });
}

export function periodTitle(period: Period, anchor: number): string {
  const { start, end } = periodRange(period, anchor);
  switch (period) {
    case 'day':
      return formatDate(start, { weekday: 'long', month: 'short', day: 'numeric' });
    case 'week':
      return `Week ${isoWeek(start)} · ${formatDate(start)} – ${formatDate(addDays(end, -1))}`;
    case 'month':
      return formatDate(start, { month: 'long', year: 'numeric' });
    case 'year':
      return String(new Date(start).getFullYear());
  }
}

/** Plain-language observations from the user's own laps. */
export function insights(
  b: Breakdown,
  buckets: Bucket[],
  categories: Category[],
  period: Period,
): string[] {
  const out: string[] = [];
  const catById = new Map(categories.map((c) => [c.id, c]));
  let topSink: { name: string; ms: number } | null = null;
  for (const [id, ms] of b.byCategory) {
    const c = catById.get(id);
    if (!c || c.goalId || c.group === 'work') continue;
    if (!topSink || ms > topSink.ms) topSink = { name: c.name, ms };
  }
  if (topSink && b.goalTotal > 0 && topSink.ms > b.goalTotal * 0.5) {
    const ratio = topSink.ms / b.goalTotal;
    out.push(
      ratio >= 1
        ? `${topSink.name} took ${formatHours(topSink.ms)} — more than all your goals combined (${formatHours(b.goalTotal)}).`
        : `${topSink.name} took ${formatHours(topSink.ms)}, about ${Math.round(ratio * 100)}% of your goal time.`,
    );
  }
  const past = buckets.filter((x) => !x.isFuture && x.goalMs > 0);
  if (past.length >= 3) {
    const best = past.reduce((a, c) => (c.goalMs > a.goalMs ? c : a));
    const avg = past.reduce((a, c) => a + c.goalMs, 0) / past.length;
    const unit = period === 'week' ? formatDate(best.start, { weekday: 'long' }) : period === 'month' ? `Week ${isoWeek(best.start)}` : formatDate(best.start, { month: 'long' });
    if (best.goalMs > avg * 1.3) out.push(`${unit} was your best — ${formatHours(best.goalMs)} on goals, ${Math.round((best.goalMs / avg - 1) * 100)}% above average.`);
  }
  return out;
}
