import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TimeField } from '@/components/time-field';
import { Button, Chip, SectionLabel, SheetHeader, Txt } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useLapDisplay } from '@/hooks/use-lap-display';
import { useTheme } from '@/hooks/use-theme';
import { lapsInRange } from '@/lib/stats';
import { addDays, DAY, formatDate, formatDuration, formatTime, MINUTE, startOfDay } from '@/lib/time';
import { useAppStore } from '@/store/app-store';

const STEP = 5 * MINUTE;

/** Same clock time on another day (safe across daylight-saving changes). */
function onDay(ts: number, dayStart: number): number {
  const d = new Date(ts);
  const out = new Date(dayStart);
  out.setHours(d.getHours(), d.getMinutes(), 0, 0);
  return out.getTime();
}

export default function AddLap() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const display = useLapDisplay();
  const { day } = useLocalSearchParams<{ day?: string }>();
  const laps = useAppStore((s) => s.laps);
  const addPastLap = useAppStore((s) => s.addPastLap);

  const [openedAt] = useState(() => Date.now());
  const today = startOfDay(openedAt);
  const [dayStart, setDayStart] = useState(() => (day ? startOfDay(Number(day)) : today));
  const [end, setEnd] = useState(() => (dayStart === today ? Math.floor(openedAt / STEP) * STEP : dayStart + 12.5 * 60 * MINUTE));
  const [start, setStart] = useState(() => end - 30 * MINUTE);

  const dayEnd = Math.min(addDays(dayStart, 1), openedAt);
  const valid = end - start >= MINUTE && end <= openedAt;
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, -i));
  // Opened from an older day in Review: keep that day pickable too.
  if (!days.includes(dayStart)) days.push(dayStart);
  const dayLabel = (d: number) => (d === today ? 'Today' : d === addDays(today, -1) ? 'Yesterday' : `${formatDate(d, { weekday: 'short' })} ${new Date(d).getDate()}`);

  const pickDay = (d: number) => {
    setDayStart(d);
    let s = onDay(start, d);
    let e = onDay(end, d);
    if (e > openedAt) {
      e = Math.floor(openedAt / STEP) * STEP;
      s = Math.min(s, e - 30 * MINUTE);
    }
    setStart(s);
    setEnd(e);
  };

  // What the new lap would cover, so nothing is overwritten by surprise.
  const covered = valid
    ? lapsInRange(laps, start, end, openedAt)
        .map((l) => ({ lap: l, ms: Math.min(l.endedAt ?? openedAt, end) - Math.max(l.startedAt, start) }))
        .filter((x) => x.ms >= MINUTE)
    : [];
  const coveredMs = covered.reduce((a, x) => a + x.ms, 0);
  const untrackedMs = valid ? end - start - coveredMs : 0;

  const add = () => {
    if (!valid) return;
    const id = addPastLap(start, end);
    if (id) router.replace(`/lap/${id}`);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: t.card }}>
      <SheetHeader title="Add missed time" onCancel={() => router.back()} action="Next" onAction={add} actionDisabled={!valid} />

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <Txt variant="callout" tone="secondary">
          Forgot to start the clock or to tap Lap? Add the time here, then label it — even if it was “nothing”.
        </Txt>

        <View>
          <SectionLabel>Day</SectionLabel>
          <View style={styles.wrap}>
            {days.map((d) => (
              <Chip key={d} label={dayLabel(d)} selected={d === dayStart} onPress={() => pickDay(d)} />
            ))}
          </View>
        </View>

        <View style={{ gap: Spacing.four }}>
          <TimeField label="From" value={start} onChange={setStart} min={dayStart} max={end - MINUTE} />
          <TimeField label="To" value={end} onChange={setEnd} min={start + MINUTE} max={dayEnd} />
        </View>

        <View style={[styles.summary, { backgroundColor: t.background }]}>
          {valid ? (
            <>
              <Txt variant="headline">
                {formatDuration(end - start)} · {formatTime(start)} – {formatTime(end)}
              </Txt>
              {untrackedMs >= MINUTE ? (
                <Txt variant="subhead" tone="secondary">
                  Adds {formatDuration(untrackedMs)} that wasn’t tracked.
                </Txt>
              ) : null}
              {covered.map(({ lap, ms }) => (
                <Txt key={lap.id} variant="subhead" color={t.accentText}>
                  Replaces {formatDuration(ms)} of {display.name(lap)}
                  {lap.endedAt === null ? ' (your current lap keeps running after it)' : ''}
                </Txt>
              ))}
            </>
          ) : (
            <Txt variant="subhead" color={t.accentText}>
              {end > openedAt ? 'That time hasn’t happened yet.' : 'The end has to be after the start.'}
            </Txt>
          )}
        </View>

        <Button label="Next: label it" onPress={add} disabled={!valid} />
        {end - start > DAY / 2 ? (
          <Txt variant="caption" tone="secondary" style={{ textAlign: 'center' }}>
            That’s a long stretch — double-check the times.
          </Txt>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, gap: 24 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  summary: { borderRadius: Radius.card, padding: Spacing.four, gap: 6 },
});
