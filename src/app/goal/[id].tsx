import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { slipLabel } from '@/components/goal-card';
import { Bar, Button, Card, Dot, Insight, Screen, Section, Separator, tabular, Txt } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useLapDisplay } from '@/hooks/use-lap-display';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { goalProgress, lapDuration, trackedTime, weeklyGoalHours } from '@/lib/stats';
import { addDays, formatDate, formatDuration, formatHours, formatPct, formatTime, HOUR } from '@/lib/time';
import { useAppStore } from '@/store/app-store';

const WEEKS = 6;
const CHART_HEIGHT = 140;

export default function GoalDetail() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const goal = useAppStore((s) => s.goals.find((g) => g.id === id));
  const laps = useAppStore((s) => s.laps);
  const sessions = useAppStore((s) => s.sessions);
  const deleteGoal = useAppStore((s) => s.deleteGoal);
  const display = useLapDisplay();
  const now = useNow(true, 30_000);

  if (!goal) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Goal' }} />
        <Txt variant="headline" style={{ marginTop: 40, textAlign: 'center' }}>
          This goal was deleted.
        </Txt>
      </Screen>
    );
  }

  const p = goalProgress(goal, laps, sessions, now);
  const slip = slipLabel(p);
  const weeks = weeklyGoalHours(goal, laps, now, WEEKS);
  const trackedWeeks = weeks
    .map((w) => trackedTime(sessions, w.start, Math.min(addDays(w.start, 7), now), now))
    .filter((ms) => ms > 0);
  const avgTracked = trackedWeeks.length ? trackedWeeks.reduce((a, b) => a + b, 0) / trackedWeeks.length : 0;
  const weeklyTarget = avgTracked * (goal.targetPct / 100);
  const chartMax = Math.max(weeklyTarget, ...weeks.map((w) => w.ms), HOUR);

  const goalLaps = laps.filter((l) => l.goalId === goal.id).sort((a, b) => b.startedAt - a.startedAt);
  const byCategory = new Map<string, number>();
  for (const l of goalLaps) {
    const name = display.name(l);
    byCategory.set(name, (byCategory.get(name) ?? 0) + lapDuration(l, now));
  }
  const sources = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);

  const focused = goalLaps.filter((l) => l.focus !== null);
  const morning = focused.filter((l) => new Date(l.startedAt).getHours() < 12);
  const later = focused.filter((l) => new Date(l.startedAt).getHours() >= 12);
  const avg = (xs: typeof focused) => xs.reduce((a, l) => a + (l.focus ?? 0), 0) / xs.length;
  const focusInsight =
    morning.length >= 3 && later.length >= 3 && Math.abs(avg(morning) - avg(later)) >= 0.4
      ? `Your ${goal.name} laps average focus ${avg(morning).toFixed(1)} before noon and ${avg(later).toFixed(1)} after.`
      : null;

  const maxDays = Math.max(p.plannedDays, p.projectedDays ?? 0);

  const onDelete = () =>
    Alert.alert(`Delete “${goal.name}”?`, 'Its laps stay in your history, they just stop counting toward a goal.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          router.back();
          deleteGoal(goal.id);
        },
      },
    ]);

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <Pressable
              onPress={() => router.push({ pathname: '/new-goal', params: { id: goal.id } })}
              accessibilityRole="button"
              hitSlop={10}
              style={{ paddingHorizontal: 8 }}>
              <Txt variant="body" color={t.accent}>
                Edit
              </Txt>
            </Pressable>
          ),
        }}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Dot color={goal.color} size={12} />
        <Txt variant="largeTitle" accessibilityRole="header" style={{ flexShrink: 1 }}>
          {goal.name}
        </Txt>
      </View>
      <Txt variant="callout" tone="secondary" style={{ marginTop: 4 }}>
        Started {formatDate(goal.startDate)} · {goal.effortHours} h estimate · target {goal.targetPct}%
      </Txt>

      <Card style={{ marginTop: Spacing.five, gap: Spacing.four }}>
        <View style={{ gap: 6 }}>
          <View style={styles.between}>
            <Txt variant="subhead" tone="secondary">
              You planned
            </Txt>
            <Txt variant="subhead" style={{ fontWeight: '600' }}>
              {p.plannedDays} days · {formatDate(goal.targetDate)}
            </Txt>
          </View>
          <Bar fraction={p.plannedDays / maxDays} color={t.textTertiary} height={12} />
        </View>
        <View style={{ gap: 6 }}>
          <View style={styles.between}>
            <Txt variant="subhead" tone="secondary">
              At your real pace
            </Txt>
            <Txt variant="subhead" color={slip?.late ? t.accentText : t.positive} style={{ fontWeight: '600' }}>
              {p.projectedDays !== null && p.projectedFinish !== null ? `${p.projectedDays} days · ${formatDate(p.projectedFinish)}` : 'No pace yet'}
            </Txt>
          </View>
          <Bar fraction={p.projectedDays !== null ? p.projectedDays / maxDays : 0} color={goal.color} height={12} />
        </View>
        <Txt variant="callout">
          You promised {goal.targetPct}% of your waking time. Over the last week you gave{' '}
          <Txt variant="callout" style={{ fontWeight: '600' }}>
            {formatPct(p.allocation)}
          </Txt>{' '}
          — about {formatDuration(p.perDay)} a day since you started.
        </Txt>
      </Card>

      <Card style={{ marginTop: Spacing.three, gap: Spacing.two }}>
        <View style={styles.between}>
          <Txt variant="subhead" tone="secondary">
            Invested
          </Txt>
          <Txt variant="subhead" tone="secondary">
            {formatPct(p.invested / p.effort)}
          </Txt>
        </View>
        <Txt style={[{ fontSize: 28, fontWeight: '600', letterSpacing: -0.4 }, tabular]}>
          {formatDuration(p.invested)}{' '}
          <Txt variant="body" tone="secondary">
            of {goal.effortHours} h
          </Txt>
        </Txt>
        <Bar fraction={p.invested / p.effort} color={goal.color} />
      </Card>

      <Section label="Hours per week">
        <Card style={{ gap: Spacing.three }}>
          {weeklyTarget > 0 ? (
            <Txt variant="caption" tone="secondary" style={{ alignSelf: 'flex-end' }}>
              – – target ≈ {formatHours(weeklyTarget)} / week
            </Txt>
          ) : null}
          <View style={[styles.chart, { borderBottomColor: t.separator }]}>
            {weeklyTarget > 0 ? (
              <View style={[styles.targetLine, { bottom: (weeklyTarget / chartMax) * CHART_HEIGHT, borderColor: t.textSecondary }]} />
            ) : null}
            {weeks.map((w) => (
              <View key={w.label} style={styles.barCol}>
                <Txt variant="caption" style={[tabular, w.current && { fontWeight: '600' }]}>
                  {formatHours(w.ms).replace(' h', '')}
                </Txt>
                <View style={{ width: 28, height: Math.max(2, (w.ms / chartMax) * CHART_HEIGHT), borderTopLeftRadius: 6, borderTopRightRadius: 6, backgroundColor: goal.color, opacity: w.current ? 1 : 0.75 }} />
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row' }}>
            {weeks.map((w) => (
              <Txt key={w.label} variant="caption" tone={w.current ? 'primary' : 'secondary'} style={{ flex: 1, textAlign: 'center', fontWeight: w.current ? '600' : '400' }}>
                {w.label}
              </Txt>
            ))}
          </View>
        </Card>
      </Section>

      {sources.length ? (
        <Section label="Where it came from">
          <Card padded={false} style={{ paddingHorizontal: Spacing.four }}>
            {sources.map(([name, ms], i) => (
              <View key={name}>
                {i > 0 ? <Separator /> : null}
                <View style={[styles.between, { minHeight: 48 }]}>
                  <Txt variant="callout">{name}</Txt>
                  <Txt variant="callout" style={tabular}>
                    {formatDuration(ms)}
                  </Txt>
                </View>
              </View>
            ))}
          </Card>
        </Section>
      ) : null}

      {focusInsight ? (
        <Section>
          <Insight text={focusInsight} footnote={`From ${focused.length} rated laps`} />
        </Section>
      ) : null}

      {goalLaps.length ? (
        <Section label="Recent laps">
          <Card padded={false} style={{ paddingHorizontal: Spacing.four }}>
            {goalLaps.slice(0, 6).map((l, i) => (
              <View key={l.id}>
                {i > 0 ? <Separator /> : null}
                <Pressable onPress={() => router.push(`/lap/${l.id}`)} accessibilityRole="button" style={[styles.between, { minHeight: 56, paddingVertical: 8 }]}>
                  <View style={{ flex: 1 }}>
                    <Txt variant="callout">{display.name(l)}</Txt>
                    <Txt variant="caption" tone="secondary" numberOfLines={1}>
                      {formatDate(l.startedAt, { weekday: 'short', month: 'short', day: 'numeric' })} · {formatTime(l.startedAt)}
                      {l.note ? ` · ${l.note}` : ''}
                    </Txt>
                  </View>
                  <Txt variant="callout" style={tabular}>
                    {formatDuration(lapDuration(l, now))}
                  </Txt>
                </Pressable>
              </View>
            ))}
          </Card>
        </Section>
      ) : null}

      <Section>
        <Button label="Delete goal" variant="plain" onPress={onDelete} />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  chart: { height: CHART_HEIGHT + 20, flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: StyleSheet.hairlineWidth },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  targetLine: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1.5, borderStyle: 'dashed' },
});
