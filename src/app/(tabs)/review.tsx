import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DayView } from '@/components/day-view';
import { Icon } from '@/components/icon';
import { Bar, Card, Dot, Empty, Insight, LargeHeader, Screen, Section, Segmented, StackedBar, tabular, Tip, Txt } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useLifeColors, useTheme } from '@/hooks/use-theme';
import { breakdown, drillBuckets, insights, periodTitle, slices, trackedTime } from '@/lib/stats';
import { formatDate, formatHours, formatPct, isoWeek, periodRange, shiftPeriod } from '@/lib/time';
import type { Period } from '@/lib/types';
import { useAppStore } from '@/store/app-store';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
];

const CHILD_LABEL: Record<Period, string> = { year: 'month', month: 'week', week: 'day', day: '' };
const BAR_AREA = 110;

export default function ReviewScreen() {
  const t = useTheme();
  const life = useLifeColors();
  const laps = useAppStore((s) => s.laps);
  const sessions = useAppStore((s) => s.sessions);
  const goals = useAppStore((s) => s.goals);
  const categories = useAppStore((s) => s.categories);
  const now = useNow(true, 30_000);
  const [period, setPeriod] = useState<Period>('week');
  const [anchor, setAnchor] = useState(() => Date.now());

  const { start, end } = periodRange(period, anchor);
  const isCurrent = now >= start && now < end;
  const clipEnd = Math.min(end, now);
  const b = breakdown(laps, categories, start, clipEnd, now);
  const tracked = trackedTime(sessions, start, clipEnd, now);
  const active = goals.filter((g) => !g.archived);
  const planned = active.reduce((a, g) => a + g.targetPct, 0);
  const parts = slices(b, active, life, t.fillStrong);
  const buckets = period === 'day' ? [] : drillBuckets(period, anchor, laps, now);
  const maxBucket = Math.max(1, ...buckets.map((x) => x.goalMs));
  const notes = period === 'day' ? [] : insights(b, buckets, categories, period);

  const drill = (p: Period, a: number) => {
    setPeriod(p);
    setAnchor(a);
  };

  // Breadcrumb of the levels above the current one, each tappable to drill up.
  const crumbs: { label: string; period: Period }[] = [];
  if (period !== 'year') crumbs.push({ label: String(new Date(start).getFullYear()), period: 'year' });
  if (period === 'week' || period === 'day') crumbs.push({ label: formatDate(start, { month: 'long' }), period: 'month' });
  if (period === 'day') crumbs.push({ label: `Week ${isoWeek(start)}`, period: 'week' });

  return (
    <Screen header={<LargeHeader title="Review" />}>
      <Tip
        tipKey="review"
        title="Drill up and down"
        body="Pick Day, Week, Month or Year. Tap a bar to zoom into it, tap the path above the title to zoom back out, and use the arrows to step through time."
        style={{ marginBottom: Spacing.four }}
      />
      <Segmented options={PERIODS} value={period} onChange={(p) => drill(p, anchor)} />

      <View style={styles.crumbs}>
        {crumbs.map((c) => (
          <View key={c.period} style={styles.crumb}>
            <Pressable onPress={() => setPeriod(c.period)} accessibilityRole="button" hitSlop={8}>
              <Txt variant="subhead" color={t.accent}>
                {c.label}
              </Txt>
            </Pressable>
            <Txt variant="subhead" tone="tertiary">
              ›
            </Txt>
          </View>
        ))}
      </View>

      <View style={styles.nav}>
        <Pressable onPress={() => setAnchor(shiftPeriod(period, anchor, -1))} accessibilityRole="button" accessibilityLabel={`Previous ${period}`} hitSlop={10} style={styles.navButton}>
          <Icon name="chevron-left" color={t.accent} />
        </Pressable>
        <Txt variant="headline" style={{ flex: 1, textAlign: 'center' }}>
          {periodTitle(period, anchor)}
        </Txt>
        <Pressable
          onPress={() => setAnchor(shiftPeriod(period, anchor, 1))}
          disabled={isCurrent || start > now}
          accessibilityRole="button"
          accessibilityLabel={`Next ${period}`}
          hitSlop={10}
          style={[styles.navButton, { opacity: isCurrent || start > now ? 0.3 : 1 }]}>
          <Icon name="chevron-right" color={t.accent} />
        </Pressable>
      </View>

      {period === 'day' ? (
        <DayView dayStart={start} />
      ) : tracked === 0 ? (
        <Empty title="Nothing tracked yet" body="Once you run the clock in this period, you'll see where the time went." />
      ) : (
        <>
          <Card style={{ gap: Spacing.four }}>
            {active.length ? (
              <Txt variant="title" style={{ fontSize: 22 }}>
                Goals got {formatPct(b.goalTotal / tracked)} of your waking time.{' '}
                <Txt variant="title" tone="secondary" style={{ fontSize: 22, fontWeight: '500' }}>
                  You planned {planned}%.
                </Txt>
              </Txt>
            ) : (
              <Txt variant="title" style={{ fontSize: 22 }}>
                {formatHours(tracked)} tracked. Here’s where it went.
              </Txt>
            )}
            <StackedBar parts={parts.map((s) => ({ key: s.key, ms: s.ms, color: s.color }))} height={14} />
            <View style={styles.legend}>
              {parts.map((s) => (
                <View key={s.key} style={styles.legendItem}>
                  <Dot color={s.color} />
                  <Txt variant="subhead" style={{ flex: 1 }} numberOfLines={1}>
                    {s.label}
                  </Txt>
                  <Txt variant="subhead" style={[{ fontWeight: '600' }, tabular]}>
                    {formatHours(s.ms)}
                  </Txt>
                </View>
              ))}
            </View>
          </Card>

          {active.length ? (
            <Section label="Target vs actual">
              <Card style={{ gap: Spacing.four }}>
                {active.map((g) => {
                  const actual = (b.byGoal.get(g.id) ?? 0) / tracked;
                  const target = g.targetPct / 100;
                  const scale = Math.max(actual, target) * 1.2 || 1;
                  return (
                    <View key={g.id} style={{ gap: 8 }}>
                      <View style={styles.between}>
                        <Txt variant="callout" style={{ fontWeight: '500' }}>
                          {g.name}
                        </Txt>
                        <Txt variant="callout" style={tabular}>
                          <Txt variant="callout" style={{ fontWeight: '600' }}>
                            {formatPct(actual)}
                          </Txt>
                          <Txt variant="callout" tone="secondary">
                            {' '}
                            / {g.targetPct}%
                          </Txt>
                        </Txt>
                      </View>
                      <Bar fraction={actual / scale} marker={target / scale} color={g.color} />
                    </View>
                  );
                })}
                <Txt variant="caption" tone="secondary">
                  Tick = your target. Bar = what you actually gave.
                </Txt>
              </Card>
            </Section>
          ) : null}

          <Section label={`Goal hours by ${CHILD_LABEL[period]} · tap to drill in`}>
            <Card style={[styles.chart, { height: BAR_AREA + 64 }]}>
              {buckets.map((x) => (
                <Pressable
                  key={x.key}
                  disabled={x.isFuture}
                  onPress={() => drill(x.drill.period, x.drill.anchor)}
                  accessibilityRole="button"
                  accessibilityLabel={`${x.label}: ${formatHours(x.goalMs)} on goals`}
                  style={styles.bucket}>
                  <Txt variant="caption" style={tabular} tone={x.isFuture ? 'tertiary' : 'primary'}>
                    {x.isFuture ? '–' : formatHours(x.goalMs).replace(' h', '')}
                  </Txt>
                  <View
                    style={{
                      width: '70%',
                      maxWidth: 30,
                      height: x.isFuture ? 4 : Math.max(4, (x.goalMs / maxBucket) * BAR_AREA),
                      borderRadius: 6,
                      backgroundColor: x.isFuture ? t.fill : x.isCurrent ? t.accent : t.fillStrong,
                    }}
                  />
                  <Txt variant="caption" tone={x.isCurrent ? 'primary' : 'secondary'} style={{ fontWeight: x.isCurrent ? '700' : '400' }}>
                    {x.label}
                  </Txt>
                </Pressable>
              ))}
            </Card>
          </Section>

          {notes.length ? (
            <Section style={{ gap: Spacing.three }}>
              {notes.map((n) => (
                <Insight key={n} text={n} footnote="From your own laps" />
              ))}
            </Section>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  crumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: Spacing.four, minHeight: 20 },
  crumb: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  nav: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.three },
  navButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, columnGap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '46%' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chart: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: Spacing.two },
  bucket: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 6, height: '100%' },
});
