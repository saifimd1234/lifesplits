import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { LineChart, type Series } from '@/components/line-chart';
import { Card, Chip, Dot, Insight, Section, Segmented, Separator, tabular, Txt } from '@/components/ui';
import { LifeGroupLabels, Spacing, type LifeGroup } from '@/constants/theme';
import { useTheme, useThemeName } from '@/hooks/use-theme';
import { trendPoints, type TrendPoint } from '@/lib/stats';
import { HOUR } from '@/lib/time';
import type { Category, Goal, Lap, Session } from '@/lib/types';

type Range = 'days' | 'weeks';

type Metric = {
  key: string;
  label: string;
  color: string;
  dashed?: boolean;
  isGoal: boolean;
  /** Hours per day over these buckets, or null when there is no data. */
  agg: (pts: TrendPoint[]) => number | null;
};

// Life is drawn as dashed neutrals so goals stay the only solid color, as everywhere else in the app.
const LINE_COLORS = {
  light: { sleep: '#475569', work: '#3F3F46', leisure: '#60A5FA', routine: '#A1A1AA', commute: '#71717A' },
  dark: { sleep: '#CBD5E1', work: '#D4D4D8', leisure: '#60A5FA', routine: '#71717A', commute: '#A1A1AA' },
};
const LIFE_LINES = ['work', 'leisure', 'routine', 'commute'] as const satisfies readonly LifeGroup[];

const sum = (pts: TrendPoint[], pick: (p: TrendPoint) => number) => pts.reduce((a, p) => a + pick(p), 0);
const perTrackedDay = (pick: (p: TrendPoint) => number) => (pts: TrendPoint[]) => {
  const days = sum(pts, (p) => p.trackedDays);
  return days ? sum(pts, pick) / days / HOUR : null;
};
const sleepPerNight = (pts: TrendPoint[]) => {
  const nights = sum(pts, (p) => p.sleep.nights);
  return nights ? sum(pts, (p) => p.sleep.ms) / nights / HOUR : null;
};

const hours = (v: number) => `${v < 10 ? v.toFixed(1) : Math.round(v)} h`;

/** Line-chart trends for goals and the rest of life, plus this-week-vs-last comparisons. */
export function Trends({ goals, laps, sessions, categories, now }: { goals: Goal[]; laps: Lap[]; sessions: Session[]; categories: Category[]; now: number }) {
  const t = useTheme();
  const lines = LINE_COLORS[useThemeName()];
  const [range, setRange] = useState<Range>('days');
  const [shown, setShown] = useState<Set<string> | null>(null);

  const metrics: Metric[] = useMemo(
    () => [
      ...goals.map((g) => ({ key: g.id, label: g.name, color: g.color, isGoal: true, agg: perTrackedDay((p) => p.byGoal.get(g.id) ?? 0) })),
      { key: 'sleep', label: 'Sleep', color: lines.sleep, dashed: true, isGoal: false, agg: sleepPerNight },
      ...LIFE_LINES.map((g) => ({ key: g, label: LifeGroupLabels[g], color: lines[g], dashed: true, isGoal: false, agg: perTrackedDay((p) => p.byGroup[g]) })),
    ],
    [goals, lines],
  );
  // Goals by default so their lines get the full height; sleep and the rest are one tap away.
  const visible = shown ?? new Set(goals.map((g) => g.id));
  const toggle = (key: string) =>
    setShown(() => {
      const next = new Set(visible);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const points = useMemo(() => trendPoints(laps, sessions, categories, now, range === 'days' ? 'day' : 'week', range === 'days' ? 14 : 12), [laps, sessions, categories, now, range]);
  // Four weeks of days for the comparisons and patterns, whatever the chart shows.
  const days28 = useMemo(() => trendPoints(laps, sessions, categories, now, 'day', 28), [laps, sessions, categories, now]);
  const thisWeek = days28.slice(21);
  const lastWeek = days28.slice(14, 21);

  const series: Series[] = metrics
    .filter((m) => visible.has(m.key))
    .map((m) => ({ key: m.key, label: m.label, color: m.color, dashed: m.dashed, values: points.map((p) => m.agg([p])) }));

  const compare = metrics
    .filter((m) => m.isGoal || m.key === 'sleep' || visible.has(m.key))
    .map((m) => ({ m, now: m.agg(thisWeek), before: m.agg(lastWeek) }))
    .filter((x) => x.now !== null || x.before !== null);

  const insights = patternInsights(days28, goals, compare);

  if (!points.some((p) => p.trackedDays > 0)) return null;

  return (
    <Section label="Trends">
      <Card style={{ gap: Spacing.four }}>
        <Segmented
          options={[
            { value: 'days', label: 'Last 14 days' },
            { value: 'weeks', label: 'Last 12 weeks' },
          ]}
          value={range}
          onChange={setRange}
        />
        <View style={styles.wrap}>
          {metrics.map((m) => (
            <Chip key={m.key} label={m.label} dot={m.color} selected={visible.has(m.key)} onPress={() => toggle(m.key)} />
          ))}
        </View>
        <Txt variant="caption" tone="secondary">
          Hours per tracked day{range === 'weeks' ? ', averaged over each week' : ''}. Sleep is the gap between ending one day and starting the next.
        </Txt>
        {series.length ? (
          <LineChart series={series} labels={points.map((p) => p.label)} titles={points.map((p) => p.title)} format={hours} axisFormat={(v) => `${Math.round(v * 10) / 10}h`} />
        ) : (
          <Txt variant="callout" tone="secondary">
            Pick something above to chart it.
          </Txt>
        )}
      </Card>

      {compare.length ? (
        <Card style={{ marginTop: Spacing.three }} padded={false}>
          <View style={[styles.compareRow, { paddingTop: Spacing.four }]}>
            <Txt variant="caption" tone="secondary" style={{ flex: 1 }}>
              Last 7 days vs the 7 before
            </Txt>
            <Txt variant="caption" tone="secondary" style={styles.num}>
              per day
            </Txt>
            <Txt variant="caption" tone="secondary" style={styles.delta}>
              change
            </Txt>
          </View>
          {compare.map(({ m, now: a, before: b }, i) => {
            const d = a !== null && b !== null ? a - b : null;
            const up = d !== null && d > 0.05;
            const down = d !== null && d < -0.05;
            const good = m.isGoal ? up : m.key === 'sleep' ? up && (a ?? 0) <= 9 : false;
            const bad = m.isGoal ? down : false;
            return (
              <View key={m.key}>
                {i === 0 ? null : <Separator inset={16} />}
                <View style={styles.compareRow}>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Dot color={m.color} />
                    <Txt variant="callout" numberOfLines={1} style={{ flexShrink: 1 }}>
                      {m.label}
                    </Txt>
                  </View>
                  <Txt variant="callout" style={[styles.num, tabular, { fontWeight: '600' }]}>
                    {a === null ? '—' : hours(a)}
                  </Txt>
                  <Txt variant="subhead" color={good ? t.positive : bad ? t.accentText : t.textSecondary} style={[styles.delta, tabular]}>
                    {d === null ? '—' : up ? `▲ ${hours(d)}` : down ? `▼ ${hours(-d)}` : 'same'}
                  </Txt>
                </View>
              </View>
            );
          })}
          <View style={{ height: Spacing.two }} />
        </Card>
      ) : null}

      {insights.map((text) => (
        <View key={text} style={{ marginTop: Spacing.three }}>
          <Insight text={text} footnote="From your last 4 weeks of laps" />
        </View>
      ))}
    </Section>
  );
}

/** Plain-language patterns: the goal that moved most, and whether sleep lines up with goal time. */
function patternInsights(days: TrendPoint[], goals: Goal[], compare: { m: Metric; now: number | null; before: number | null }[]): string[] {
  const out: string[] = [];
  const moved = compare
    .filter((x) => x.m.isGoal && x.now !== null && x.before !== null && Math.abs(x.now - x.before) >= 0.25)
    .sort((a, b) => Math.abs(b.now! - b.before!) - Math.abs(a.now! - a.before!))[0];
  if (moved) {
    const up = moved.now! > moved.before!;
    out.push(`${moved.m.label} is ${up ? 'up' : 'down'} to ${hours(moved.now!)} a day, from ${hours(moved.before!)} the week before.`);
  }

  // Goal hours on days after a longer night vs a shorter one.
  const goalIds = new Set(goals.map((g) => g.id));
  const rows = days
    .filter((p) => p.sleep.nights > 0 && p.trackedDays > 0)
    .map((p) => ({ sleep: p.sleep.ms / p.sleep.nights / HOUR, goal: [...p.byGoal.entries()].reduce((a, [id, ms]) => a + (goalIds.has(id) ? ms : 0), 0) / HOUR }));
  if (rows.length >= 6 && goals.length) {
    const sorted = [...rows].sort((a, b) => a.sleep - b.sleep);
    const mid = sorted[Math.floor(sorted.length / 2)].sleep;
    const rested = rows.filter((r) => r.sleep >= mid);
    const short = rows.filter((r) => r.sleep < mid);
    const avg = (xs: typeof rows) => xs.reduce((a, r) => a + r.goal, 0) / xs.length;
    if (rested.length >= 3 && short.length >= 3 && Math.abs(avg(rested) - avg(short)) >= 0.3) {
      out.push(
        avg(rested) > avg(short)
          ? `After ${hours(mid)}+ of sleep you give goals ${hours(avg(rested))} a day, vs ${hours(avg(short))} after shorter nights.`
          : `Oddly, shorter nights come with more goal time (${hours(avg(short))} vs ${hours(avg(rested))}) — early starts may be working for you.`,
      );
    }
  }
  return out;
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  compareRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: Spacing.four, minHeight: 44 },
  num: { width: 64, textAlign: 'right' },
  delta: { width: 74, textAlign: 'right' },
});
