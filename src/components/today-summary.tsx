import { StyleSheet, View } from 'react-native';

import { Bar, Card, Dot, Separator, StackedBar, tabular, Txt } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useLapDisplay } from '@/hooks/use-lap-display';
import { useLifeColors, useTheme } from '@/hooks/use-theme';
import { breakdown, lapDuration, slices } from '@/lib/stats';
import { addDays, formatDuration, formatPct, formatTime, HOUR } from '@/lib/time';
import type { Category, Goal, Lap } from '@/lib/types';

/** Round hours worth labelling under a timeline from `from` to `to`, at most ~4 of them. */
function hourTicks(from: number, to: number): number[] {
  const span = (to - from) / HOUR;
  const every = span <= 4 ? 1 : span <= 8 ? 2 : span <= 12 ? 3 : 4;
  const first = new Date(from);
  first.setMinutes(0, 0, 0);
  const ticks: number[] = [];
  for (let t = first.getTime() + HOUR; t < to; t += HOUR) {
    if (new Date(t).getHours() % every === 0 && t - from > span * HOUR * 0.12 && to - t > span * HOUR * 0.12) ticks.push(t);
  }
  return ticks;
}

/** Today's timeline, where the time went, and each goal's pace against its target so far. */
export function TodaySummary({
  laps,
  categories,
  goals,
  tracked,
  dayStart,
  live,
  now,
}: {
  laps: Lap[];
  categories: Category[];
  goals: Goal[];
  tracked: number;
  dayStart: number;
  live: boolean;
  now: number;
}) {
  const t = useTheme();
  const life = useLifeColors();
  const display = useLapDisplay();
  const from = laps[0].startedAt;
  const to = live ? now : (laps[laps.length - 1].endedAt ?? now);
  const span = Math.max(1, to - from);
  const b = breakdown(laps, categories, dayStart, addDays(dayStart, 1), now);
  const parts = slices(b, goals, life, t.fillStrong);
  const goalShare = tracked ? b.goalTotal / tracked : 0;
  const targetShare = goals.reduce((a, g) => a + g.targetPct, 0) / 100;

  return (
    <Card style={{ gap: Spacing.four }}>
      <View style={styles.between}>
        <Txt variant="headline">Today so far</Txt>
        <Txt variant="subhead" tone="secondary" style={tabular}>
          {formatDuration(tracked)} awake
        </Txt>
      </View>

      <View style={{ gap: 6 }}>
        <StackedBar parts={laps.map((l) => ({ key: l.id, ms: lapDuration(l, now), color: display.color(l) }))} height={14} />
        <View style={{ height: 16 }}>
          <Txt variant="caption" tone="secondary" style={{ position: 'absolute', left: 0 }}>
            {formatTime(from)}
          </Txt>
          {hourTicks(from, to).map((tick) => (
            <Txt key={tick} variant="caption" tone="tertiary" style={[styles.tick, { left: `${((tick - from) / span) * 100}%` }]}>
              {formatTime(tick).replace(':00', '')}
            </Txt>
          ))}
          <Txt variant="caption" tone="secondary" style={{ position: 'absolute', right: 0 }}>
            {live ? 'Now' : formatTime(to)}
          </Txt>
        </View>
      </View>

      {parts.length ? (
        <View style={styles.legend}>
          {parts.slice(0, 6).map((p) => (
            <View key={p.key} style={styles.legendItem}>
              <Dot color={p.color} />
              <Txt variant="caption" style={p.isGoal && { fontWeight: '600' }}>
                {p.label}
              </Txt>
              <Txt variant="caption" tone="secondary" style={tabular}>
                {formatDuration(p.ms)}
              </Txt>
            </View>
          ))}
        </View>
      ) : null}

      {goals.length ? (
        <>
          <Separator />
          <View style={{ gap: 8 }}>
            <View style={styles.between}>
              <Txt variant="subhead" style={{ fontWeight: '600' }}>
                Goals got {formatPct(goalShare)} of today
              </Txt>
              <Txt variant="subhead" tone="secondary">
                target {formatPct(targetShare)}
              </Txt>
            </View>
            <Bar fraction={goalShare} marker={targetShare} color={goalShare >= targetShare ? t.positive : t.accent} height={10} />
          </View>
          <View style={{ gap: Spacing.three }}>
            {goals.map((g) => {
              const actual = b.byGoal.get(g.id) ?? 0;
              const target = (g.targetPct / 100) * tracked;
              const scale = Math.max(actual, target, 1) * 1.15;
              const ahead = actual >= target;
              return (
                <View key={g.id} style={{ gap: 5 }}>
                  <View style={styles.between}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
                      <Dot color={g.color} />
                      <Txt variant="callout" numberOfLines={1} style={{ flexShrink: 1 }}>
                        {g.name}
                      </Txt>
                    </View>
                    <Txt variant="caption" tone="secondary" style={tabular}>
                      <Txt variant="caption" style={{ fontWeight: '600' }}>
                        {actual < 30_000 ? '0 m' : formatDuration(actual)}
                      </Txt>{' '}
                      of {formatDuration(target)} ·{' '}
                      <Txt variant="caption" color={ahead ? t.positive : t.accentText}>
                        {ahead ? 'on pace' : `${formatDuration(target - actual)} to go`}
                      </Txt>
                    </Txt>
                  </View>
                  <Bar fraction={actual / scale} marker={target / scale} color={g.color} height={6} />
                </View>
              );
            })}
          </View>
          <Txt variant="caption" tone="tertiary">
            The tick on each bar is where the goal’s share target puts you at this point in your day.
          </Txt>
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  tick: { position: 'absolute', width: 40, marginLeft: -20, textAlign: 'center' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: Spacing.four, rowGap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
});
