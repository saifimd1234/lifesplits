import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, Empty, Separator, StackedBar, tabular, Txt } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useLapDisplay } from '@/hooks/use-lap-display';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { moodFor } from '@/lib/ratings';
import { lapDuration, lapsInRange, trackedTime } from '@/lib/stats';
import { addDays, formatDuration, formatShortTime, formatTime } from '@/lib/time';
import { useAppStore } from '@/store/app-store';

/** A single day, lap by lap — the bottom of the drill-down. */
export function DayView({ dayStart }: { dayStart: number }) {
  const t = useTheme();
  const display = useLapDisplay();
  const laps = useAppStore((s) => s.laps);
  const sessions = useAppStore((s) => s.sessions);
  const end = addDays(dayStart, 1);
  const live = sessions.some((s) => s.endedAt === null && s.startedAt < end);
  const now = useNow(live, 30_000);

  const dayLaps = lapsInRange(laps, dayStart, end, now);
  if (dayLaps.length === 0) {
    return (
      <Empty
        title="Nothing tracked"
        body="No laps on this day. Days you track show up here lap by lap."
        action={
          dayStart <= now ? (
            <Button label="Add missed time" variant="secondary" onPress={() => router.push({ pathname: '/add-lap', params: { day: String(dayStart) } })} style={{ marginTop: Spacing.two, alignSelf: 'stretch' }} />
          ) : undefined
        }
      />
    );
  }
  const awake = trackedTime(sessions, dayStart, end, now);
  const goalMs = dayLaps.reduce((a, l) => a + (l.goalId ? lapDuration(l, now) : 0), 0);
  const longest = Math.max(...dayLaps.map((l) => lapDuration(l, now)));
  const first = dayLaps[0].startedAt;
  const last = dayLaps[dayLaps.length - 1].endedAt ?? now;

  return (
    <View style={{ gap: Spacing.four }}>
      <Txt variant="callout" tone="secondary">
        {formatTime(first)} – {dayLaps[dayLaps.length - 1].endedAt ? formatTime(last) : 'now'}
      </Txt>
      <View style={{ flexDirection: 'row', gap: Spacing.two }}>
        <Stat label="Awake" value={formatDuration(awake)} />
        <Stat label="Laps" value={String(dayLaps.length)} />
        <Stat label="Goals" value={formatDuration(goalMs)} />
      </View>
      <View style={{ gap: 6 }}>
        <StackedBar parts={dayLaps.map((l) => ({ key: l.id, ms: lapDuration(l, now), color: display.color(l) }))} />
        <View style={styles.between}>
          <Txt variant="caption" tone="secondary">
            {formatTime(first)}
          </Txt>
          <Txt variant="caption" tone="secondary">
            {formatTime(last)}
          </Txt>
        </View>
      </View>
      <Card padded={false} style={{ paddingHorizontal: Spacing.four }}>
        {dayLaps.map((l, i) => {
          const goal = display.goal(l);
          const meta = [l.energy ? `Energy ${l.energy}` : null, l.focus ? `Focus ${l.focus}` : null, l.mood ? moodFor(l.mood).emoji : null, l.note ? `“${l.note}”` : null].filter(Boolean).join(' · ');
          return (
            <View key={l.id}>
              {i > 0 ? <Separator /> : null}
              <Pressable onPress={() => router.push(`/lap/${l.id}`)} accessibilityRole="button" style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}>
                <Txt variant="subhead" tone="secondary" style={[{ width: 44 }, tabular]}>
                  {formatShortTime(l.startedAt)}
                </Txt>
                <View style={{ flex: 1, gap: 5 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Txt variant="callout" color={l.categoryId ? t.text : t.accent}>
                      {display.name(l)}
                    </Txt>
                    {goal ? (
                      <View style={[styles.chip, { backgroundColor: t.fill }]}>
                        <View style={[styles.chipDot, { backgroundColor: goal.color }]} />
                        <Txt variant="caption" style={{ fontWeight: '600' }}>
                          {goal.name}
                        </Txt>
                      </View>
                    ) : null}
                  </View>
                  {meta ? (
                    <Txt variant="caption" tone="secondary" numberOfLines={1}>
                      {meta}
                    </Txt>
                  ) : null}
                  <View style={{ height: 4, borderRadius: 2, width: `${Math.max(4, (lapDuration(l, now) / longest) * 100)}%`, backgroundColor: display.color(l) }} />
                </View>
                <Txt variant="callout" style={tabular}>
                  {formatDuration(lapDuration(l, now))}
                </Txt>
              </Pressable>
            </View>
          );
        })}
      </Card>
      <Button label="+ Add missed time" variant="plain" onPress={() => router.push({ pathname: '/add-lap', params: { day: String(dayStart) } })} />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card style={{ flex: 1, padding: Spacing.three }}>
      <Txt variant="caption" tone="secondary">
        {label}
      </Txt>
      <Txt variant="headline">{value}</Txt>
    </Card>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
});
