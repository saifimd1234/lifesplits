import { LifeGroupLabels, type LifeGroup } from '@/constants/theme';
import {
  addDays,
  addMonths,
  DAY,
  formatDate,
  formatHours,
  HOUR,
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

export type Rating = 'energy' | 'focus' | 'mood';
type Avg = { avg: number | null; n: number };

export type Feelings = {
  /** Average of each 1–5 rating over the laps that have it. */
  avg: Record<Rating, Avg>;
  /** Laps with at least one rating. */
  rated: number;
  byTimeOfDay: { label: string; energy: Avg; mood: Avg }[];
  insights: string[];
};

const PARTS_OF_DAY = [
  { label: 'Morning', from: 0, to: 12 },
  { label: 'Afternoon', from: 12, to: 17 },
  { label: 'Evening', from: 17, to: 24 },
];

function average(laps: Lap[], key: Rating): Avg {
  let sum = 0;
  let n = 0;
  for (const l of laps) {
    const v = l[key];
    if (v === null || v === undefined) continue;
    sum += v;
    n++;
  }
  return { avg: n ? sum / n : null, n };
}

const one = (x: number) => x.toFixed(1);

/** Energy, focus and mood ratings for laps that started in [start, end), plus plain-language patterns. */
export function feelings(laps: Lap[], categories: Category[], start: number, end: number): Feelings {
  const inRange = laps.filter((l) => l.startedAt >= start && l.startedAt < end);
  const rated = inRange.filter((l) => l.energy !== null || l.focus !== null || (l.mood ?? null) !== null);
  const avg = { energy: average(rated, 'energy'), focus: average(rated, 'focus'), mood: average(rated, 'mood') };
  const byTimeOfDay = PARTS_OF_DAY.map((p) => {
    const xs = rated.filter((l) => {
      const h = new Date(l.startedAt).getHours();
      return h >= p.from && h < p.to;
    });
    return { label: p.label, energy: average(xs, 'energy'), mood: average(xs, 'mood') };
  });

  const out: string[] = [];

  // Which activities feel best and worst.
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const byCat = new Map<string, Lap[]>();
  for (const l of rated) if (l.categoryId && catName.has(l.categoryId)) byCat.set(l.categoryId, [...(byCat.get(l.categoryId) ?? []), l]);
  const moodByCat = [...byCat.entries()]
    .map(([id, xs]) => ({ name: catName.get(id)!, ...average(xs, 'mood') }))
    .filter((x): x is { name: string; avg: number; n: number } => x.avg !== null && x.n >= 2)
    .sort((a, b) => b.avg - a.avg);
  if (moodByCat.length >= 2) {
    const best = moodByCat[0];
    const worst = moodByCat[moodByCat.length - 1];
    if (best.avg - worst.avg >= 1) out.push(`You feel best during ${best.name} (mood ${one(best.avg)}) and worst during ${worst.name} (${one(worst.avg)}).`);
  }

  // When energy peaks and dips.
  const energyParts = byTimeOfDay.filter((p): p is typeof p & { energy: { avg: number; n: number } } => p.energy.avg !== null && p.energy.n >= 2);
  if (energyParts.length >= 2) {
    const sorted = [...energyParts].sort((a, b) => b.energy.avg - a.energy.avg);
    const hi = sorted[0];
    const lo = sorted[sorted.length - 1];
    if (hi.energy.avg - lo.energy.avg >= 0.5) {
      out.push(`Your energy peaks in the ${hi.label.toLowerCase()} (${one(hi.energy.avg)}) and dips in the ${lo.label.toLowerCase()} (${one(lo.energy.avg)}) — a good slot for goal work is the ${hi.label.toLowerCase()}.`);
    }
  }

  // Goal laps vs everything else.
  const goalLaps = rated.filter((l) => l.goalId);
  const otherLaps = rated.filter((l) => !l.goalId);
  for (const key of ['focus', 'mood'] as const) {
    const g = average(goalLaps, key);
    const o = average(otherLaps, key);
    if (g.avg === null || o.avg === null || g.n < 3 || o.n < 3 || Math.abs(g.avg - o.avg) < 0.5) continue;
    out.push(
      g.avg > o.avg
        ? `${key === 'focus' ? 'Focus' : 'Mood'} averages ${one(g.avg)} on goal laps vs ${one(o.avg)} on everything else.`
        : `Goal laps rate lower on ${key} (${one(g.avg)}) than the rest of your day (${one(o.avg)}) — worth a look at when or how you do them.`,
    );
  }

  return { avg, rated: rated.length, byTimeOfDay, insights: out };
}

/**
 * Sleep is the gap between ending one day and starting the next, counted on the day you woke up.
 * Gaps under an hour (a mistaken End day) or over 16 hours (a day you didn't track) are ignored.
 */
export function sleepIn(sessions: Session[], start: number, end: number): { ms: number; nights: number } {
  const sorted = [...sessions].sort((a, b) => a.startedAt - b.startedAt);
  let ms = 0;
  let nights = 0;
  for (let i = 1; i < sorted.length; i++) {
    const slept = sorted[i - 1].endedAt;
    const woke = sorted[i].startedAt;
    if (slept === null || woke < start || woke >= end) continue;
    const gap = woke - slept;
    if (gap < HOUR || gap > 16 * HOUR) continue;
    ms += gap;
    nights++;
  }
  return { ms, nights };
}

export type TrendPoint = {
  start: number;
  label: string;
  title: string;
  /** Days in the bucket that have any tracked time; averages divide by this. */
  trackedDays: number;
  tracked: number;
  sleep: { ms: number; nights: number };
  byGoal: Map<string, number>;
  byGroup: Record<LifeGroup | 'unlabeled', number>;
};

/** Daily or weekly buckets ending with the current one, oldest first. */
export function trendPoints(
  laps: Lap[],
  sessions: Session[],
  categories: Category[],
  now: number,
  unit: 'day' | 'week',
  count: number,
): TrendPoint[] {
  const out: TrendPoint[] = [];
  const last = unit === 'day' ? startOfDay(now) : startOfWeek(now);
  for (let i = count - 1; i >= 0; i--) {
    const start = unit === 'day' ? addDays(last, -i) : addDays(last, -7 * i);
    const end = Math.min(addDays(start, unit === 'day' ? 1 : 7), now);
    let trackedDays = 0;
    for (let d = start; d < end; d = addDays(d, 1)) if (trackedTime(sessions, d, addDays(d, 1), now) > 0) trackedDays++;
    const b = breakdown(laps, categories, start, end, now);
    out.push({
      start,
      label: unit === 'day' ? String(new Date(start).getDate()) : `W${isoWeek(start)}`,
      title: unit === 'day' ? formatDate(start, { weekday: 'long', month: 'short', day: 'numeric' }) : `Week ${isoWeek(start)} · from ${formatDate(start)}`,
      trackedDays,
      tracked: trackedTime(sessions, start, end, now),
      sleep: sleepIn(sessions, start, end),
      byGoal: b.byGoal,
      byGroup: b.byGroup,
    });
  }
  return out;
}

/** Cumulative goal hours per day since the goal started, next to the straight-line plan. */
export function burnUp(goal: Goal, laps: Lap[], now: number, maxPoints = 60) {
  const first = startOfDay(goal.startDate);
  const totalDays = Math.max(1, Math.round((startOfDay(now) - first) / DAY) + 1);
  const step = Math.max(1, Math.ceil(totalDays / maxPoints));
  const planDays = Math.max(1, (goal.targetDate - goal.startDate) / DAY);
  const goalLaps = laps.filter((l) => l.goalId === goal.id);
  const points: { day: number; actual: number; plan: number }[] = [];
  for (let i = 0; i < totalDays; i += step) points.push({ day: addDays(first, i), actual: 0, plan: 0 });
  if (points[points.length - 1].day !== startOfDay(now)) points.push({ day: startOfDay(now), actual: 0, plan: 0 });
  for (const p of points) {
    const until = Math.min(addDays(p.day, 1), now);
    let ms = 0;
    for (const l of goalLaps) ms += overlap(l.startedAt, l.endedAt ?? now, goal.startDate, until);
    p.actual = ms / HOUR;
    p.plan = Math.min(1, (until - goal.startDate) / DAY / planDays) * goal.effortHours;
  }
  return points;
}
