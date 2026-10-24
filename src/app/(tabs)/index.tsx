import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, Dot, Empty, IconButton, LargeHeader, Screen, Section, Separator, StackedBar, tabular, Tip, Txt } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useLapDisplay } from '@/hooks/use-lap-display';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { lapDuration, lapsInRange, trackedTime } from '@/lib/stats';
import { addDays, formatClock, formatDate, formatPct, formatTime, startOfDay } from '@/lib/time';
import { selectActiveSession, selectRunningLap, useAppStore } from '@/store/app-store';

export default function TodayScreen() {
  const t = useTheme();
  const display = useLapDisplay();
  const session = useAppStore(selectActiveSession);
  const running = useAppStore(selectRunningLap);
  const laps = useAppStore((s) => s.laps);
  const sessions = useAppStore((s) => s.sessions);
  const goals = useAppStore((s) => s.goals);
  const startDay = useAppStore((s) => s.startDay);
  const lap = useAppStore((s) => s.lap);
  const endDay = useAppStore((s) => s.endDay);
  const now = useNow(!!session);

  const dayStart = startOfDay(now);
  const todayLaps = lapsInRange(laps, dayStart, addDays(dayStart, 1), now);
  const closed = todayLaps.filter((l) => l.endedAt !== null).reverse();
  const tracked = trackedTime(sessions, dayStart, addDays(dayStart, 1), now);
  const goalMs = todayLaps.reduce((a, l) => a + (l.goalId ? lapDuration(l, now) : 0), 0);
  const activeGoals = goals.filter((g) => !g.archived);
  const targetPct = activeGoals.reduce((a, g) => a + g.targetPct, 0);
  const lapNumber = running ? laps.filter((l) => l.sessionId === running.sessionId).length : 0;

  const onStart = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    startDay();
  };
  const onLap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const id = lap();
    if (id) router.push(`/lap/${id}`);
  };
  const onEnd = () =>
    Alert.alert('End your day?', 'The clock stops until you start it again.', [
      { text: 'Keep going', style: 'cancel' },
      {
        text: 'End day',
        style: 'destructive',
        onPress: () => {
          const id = endDay();
          const last = id ? laps.find((l) => l.id === id) : undefined;
          if (id && last && !last.categoryId) router.push(`/lap/${id}`);
        },
      },
    ]);

  return (
    <Screen
      header={
        <LargeHeader
          overline={formatDate(now, { weekday: 'long', month: 'short', day: 'numeric' })}
          title="Today"
          right={<IconButton icon="gear" label="Settings" onPress={() => router.push('/settings')} />}
        />
      }>
      <Tip
        tipKey="today"
        title="How Today works"
        body="Start the clock when you wake up. Each time you switch activities, tap Lap and label what you just did. End the day before sleep."
        style={{ marginBottom: Spacing.four }}
      />

      {session && running ? (
        <>
          <Pressable
            onPress={() => router.push(`/lap/${running.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`Current lap: ${display.name(running)}. Tap to label.`}
            style={styles.current}>
            <View style={styles.currentLabel}>
              <Dot color={display.color(running)} />
              <Txt variant="headline" color={running.categoryId ? t.text : t.accent}>
                {running.categoryId ? display.name(running) : 'What are you doing now?'}
              </Txt>
              {display.goal(running) ? (
                <View style={[styles.goalChip, { backgroundColor: t.accentSoft }]}>
                  <Txt variant="caption" color={t.accentText} style={{ fontWeight: '600' }}>
                    {display.goal(running)!.name}
                  </Txt>
                </View>
              ) : null}
            </View>
            <Txt style={[styles.timer, tabular]} accessibilityLabel={`Lap time ${formatClock(lapDuration(running, now))}`}>
              {formatClock(lapDuration(running, now))}
            </Txt>
            <Txt variant="callout" tone="secondary" style={tabular}>
              Lap {lapNumber} · Day {formatClock(now - session.startedAt)}
            </Txt>
          </Pressable>

          <View style={styles.controls}>
            <Pressable onPress={onEnd} accessibilityRole="button" accessibilityLabel="End the day" style={({ pressed }) => [styles.round, { backgroundColor: t.fillStrong, opacity: pressed ? 0.7 : 1 }]}>
              <Txt variant="callout" style={{ fontWeight: '600' }}>
                End day
              </Txt>
            </Pressable>
            <Pressable
              onPress={onLap}
              accessibilityRole="button"
              accessibilityLabel="Lap. Close this activity and start the next"
              style={({ pressed }) => [styles.round, { backgroundColor: t.primary, transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
              <Txt variant="headline" color={t.onPrimary}>
                Lap
              </Txt>
            </Pressable>
          </View>
        </>
      ) : (
        <View style={styles.startWrap}>
          <Pressable
            onPress={onStart}
            accessibilityRole="button"
            accessibilityLabel="Start your day"
            style={({ pressed }) => [styles.startButton, { backgroundColor: t.primary, transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
            <Txt variant="title" color={t.onPrimary}>
              Start
            </Txt>
          </Pressable>
          <Txt variant="callout" tone="secondary" style={{ textAlign: 'center', maxWidth: 280 }}>
            {closed.length ? 'Your day is ended. Start again if you are still up.' : 'Tap when you wake up. The clock runs until you end the day.'}
          </Txt>
        </View>
      )}

      {activeGoals.length === 0 ? (
        <Section>
          <Empty
            title="No goals yet"
            body="Laps still tell you where your day goes. Add a goal to see how much of it you really give to what matters."
            action={<Button label="Add a goal" variant="secondary" onPress={() => router.push('/new-goal')} style={{ marginTop: Spacing.two, alignSelf: 'stretch' }} />}
          />
        </Section>
      ) : null}

      {todayLaps.length ? (
        <Section>
          <View style={styles.between}>
            <Txt variant="subhead" style={{ fontWeight: '600' }}>
              Today so far
            </Txt>
            {activeGoals.length ? (
              <Txt variant="subhead" tone="secondary">
                Goals <Txt variant="subhead" style={{ fontWeight: '600' }}>{formatPct(tracked ? goalMs / tracked : 0)}</Txt> · target {targetPct}%
              </Txt>
            ) : null}
          </View>
          <View style={{ marginTop: Spacing.two }}>
            <StackedBar parts={todayLaps.map((l) => ({ key: l.id, ms: lapDuration(l, now), color: display.color(l) }))} height={10} />
          </View>
          <View style={[styles.between, { marginTop: 6 }]}>
            <Txt variant="caption" tone="secondary">
              {formatTime(todayLaps[0].startedAt)}
            </Txt>
            <Txt variant="caption" tone="secondary">
              {session ? 'Now' : formatTime(todayLaps[todayLaps.length - 1].endedAt ?? now)}
            </Txt>
          </View>
        </Section>
      ) : null}

      {closed.length ? (
        <Section label="Laps">
          <Card padded={false} style={{ paddingHorizontal: Spacing.four }}>
            {closed.map((l, i) => (
              <View key={l.id}>
                {i > 0 ? <Separator inset={20} /> : null}
                <Pressable onPress={() => router.push(`/lap/${l.id}`)} accessibilityRole="button" style={({ pressed }) => [styles.lapRow, { opacity: pressed ? 0.6 : 1 }]}>
                  <Dot color={display.color(l)} />
                  <View style={{ flex: 1 }}>
                    <Txt variant="callout" color={l.categoryId ? t.text : t.accent}>
                      {l.categoryId ? display.name(l) : 'Unlabeled — tap to label'}
                    </Txt>
                    {l.note ? (
                      <Txt variant="caption" tone="secondary" numberOfLines={1}>
                        {l.note}
                      </Txt>
                    ) : null}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Txt variant="callout" style={tabular}>
                      {formatClock(lapDuration(l, now))}
                    </Txt>
                    <Txt variant="caption" tone="secondary">
                      {formatTime(l.startedAt)}
                    </Txt>
                  </View>
                </Pressable>
              </View>
            ))}
          </Card>
        </Section>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  current: { alignItems: 'center', gap: 8, paddingTop: Spacing.four },
  currentLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 28 },
  goalChip: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
  timer: { fontSize: 72, fontWeight: '200', letterSpacing: -2, lineHeight: 80 },
  controls: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.five, paddingHorizontal: Spacing.two },
  round: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  startWrap: { alignItems: 'center', gap: Spacing.four, paddingVertical: Spacing.eight },
  startButton: { width: 150, height: 150, borderRadius: 75, alignItems: 'center', justifyContent: 'center' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lapRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 8 },
});
