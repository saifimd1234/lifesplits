import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmojiPicker } from '@/components/emoji-picker';
import { TimeField } from '@/components/time-field';
import { Button, Chip, SectionLabel, SheetHeader, Tip, Txt } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { categoryLabel } from '@/lib/emoji';
import { MOODS } from '@/lib/ratings';
import { formatClock, formatTime, MINUTE } from '@/lib/time';
import { useAppStore } from '@/store/app-store';

export default function LapSheet() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const lap = useAppStore((s) => s.laps.find((l) => l.id === id));
  const laps = useAppStore((s) => s.laps);
  const categories = useAppStore((s) => s.categories);
  const goals = useAppStore((s) => s.goals);
  const updateLap = useAppStore((s) => s.updateLap);
  const addCategory = useAppStore((s) => s.addCategory);
  const retimeLap = useAppStore((s) => s.retimeLap);
  const splitLap = useAppStore((s) => s.splitLap);
  const deleteLap = useAppStore((s) => s.deleteLap);
  const now = useNow(lap?.endedAt === null);

  const [categoryId, setCategoryId] = useState<string | null>(lap?.categoryId ?? null);
  const [goalId, setGoalId] = useState<string | null>(lap?.goalId ?? null);
  const [note, setNote] = useState(lap?.note ?? '');
  const [energy, setEnergy] = useState<number | null>(lap?.energy ?? null);
  const [focus, setFocus] = useState<number | null>(lap?.focus ?? null);
  const [mood, setMood] = useState<number | null>(lap?.mood ?? null);
  const [newName, setNewName] = useState<string | null>(null);
  const [newEmoji, setNewEmoji] = useState('');
  const [pickingEmoji, setPickingEmoji] = useState(false);
  const [startedAt, setStartedAt] = useState(lap?.startedAt ?? 0);
  const [endedAt, setEndedAt] = useState<number | null>(lap?.endedAt ?? null);
  const [splitAt, setSplitAt] = useState<number | null>(null);

  // Most recently used categories first, so the usual next answer is one tap away.
  const ordered = useMemo(() => {
    const lastUsed = new Map<string, number>();
    for (const l of laps) if (l.categoryId) lastUsed.set(l.categoryId, Math.max(lastUsed.get(l.categoryId) ?? 0, l.startedAt));
    return [...categories].sort((a, b) => (lastUsed.get(b.id) ?? 0) - (lastUsed.get(a.id) ?? 0));
  }, [categories, laps]);

  if (!lap) {
    return (
      <View style={[styles.missing, { backgroundColor: t.background }]}>
        <Txt variant="headline">This lap no longer exists.</Txt>
        <Button label="Close" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  const activeGoals = goals.filter((g) => !g.archived);
  const lapNumber = laps.filter((l) => l.sessionId === lap.sessionId && l.startedAt <= lap.startedAt).length;
  const running = lap.endedAt === null;
  const end = endedAt ?? now;

  const pickCategory = (cid: string) => {
    setNewName(null);
    setCategoryId(cid);
    const cat = categories.find((c) => c.id === cid);
    setGoalId(cat?.goalId ?? null);
  };

  /** Turns the typed name into a real, selected category. Returns its id, or null if nothing was typed. */
  const commitNew = (): string | null => {
    const clean = newName?.trim();
    setNewName(null);
    setPickingEmoji(false);
    setNewEmoji('');
    if (!clean) return null;
    const existing = categories.find((c) => c.name.toLowerCase() === clean.toLowerCase());
    const cat = existing ?? addCategory(clean, 'other', goalId, newEmoji || undefined);
    setCategoryId(cat.id);
    if (existing) setGoalId(existing.goalId ?? goalId);
    return cat.id;
  };

  const applyEdits = () => {
    const cid = (newName !== null ? commitNew() : null) ?? categoryId;
    updateLap(lap.id, { categoryId: cid, goalId, note: note.trim(), energy, focus, mood });
    if (startedAt !== lap.startedAt || endedAt !== lap.endedAt) retimeLap(lap.id, startedAt, endedAt);
  };

  const save = () => {
    applyEdits();
    router.back();
  };

  const minSplit = startedAt + MINUTE;
  const maxSplit = end - MINUTE;
  const canSplit = maxSplit > minSplit;
  const split = () => {
    if (splitAt === null) return;
    applyEdits();
    const other = splitLap(lap.id, Math.max(minSplit, Math.min(maxSplit, splitAt)));
    // Jump straight to the new unlabeled half so it gets a name while the memory is fresh.
    if (other) router.replace(`/lap/${other}`);
  };

  const remove = () =>
    Alert.alert('Remove this lap?', 'Its time joins the lap before it. At the start or end of a day, the time is simply not tracked.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          router.back();
          deleteLap(lap.id);
        },
      },
    ]);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: t.card }}>
      <SheetHeader
        title={running ? 'Current lap' : `Lap ${lapNumber}`}
        subtitle={`${formatClock(end - startedAt)} · ${formatTime(startedAt)}${endedAt ? ` – ${formatTime(endedAt)}` : ''}`}
        onCancel={() => router.back()}
        action="Save"
        onAction={save}
      />

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <Tip
          tipKey="lapSheet"
          title="Label in two taps"
          body="Pick what that time was. Categories you use most move to the front, and a category linked to a goal fills in “Counts toward” for you. Long-press a category to edit it."
        />

        <View style={{ gap: Spacing.three }}>
          <View style={styles.between}>
            <Txt variant="title">{running ? 'What are you doing?' : 'What was that?'}</Txt>
            <Pressable onPress={() => router.push('/categories')} accessibilityRole="button" hitSlop={10}>
              <Txt variant="callout" color={t.accent}>
                Edit list
              </Txt>
            </Pressable>
          </View>
          <View style={styles.wrap}>
            {ordered.map((c) => (
              <Chip
                key={c.id}
                label={categoryLabel(c)}
                selected={c.id === categoryId && newName === null}
                onPress={() => pickCategory(c.id)}
                onLongPress={() => router.push({ pathname: '/category/[id]', params: { id: c.id } })}
              />
            ))}
            {newName === null ? <Chip label="+ New" dashed onPress={() => setNewName('')} /> : null}
          </View>
          {newName !== null ? (
            <View style={{ gap: Spacing.two }}>
              <View style={styles.newRow}>
                <Pressable
                  onPress={() => setPickingEmoji((x) => !x)}
                  accessibilityRole="button"
                  accessibilityLabel={newEmoji ? `Icon ${newEmoji}. Change icon` : 'Add an icon'}
                  style={[styles.emojiButton, { backgroundColor: t.background, borderColor: pickingEmoji ? t.accent : 'transparent' }]}>
                  <Txt style={styles.emoji}>{newEmoji || '🙂'}</Txt>
                </Pressable>
                <TextInput
                  autoFocus
                  value={newName}
                  onChangeText={setNewName}
                  onSubmitEditing={commitNew}
                  returnKeyType="done"
                  submitBehavior="blurAndSubmit"
                  placeholder="New category, e.g. Guitar practice"
                  placeholderTextColor={t.textTertiary}
                  accessibilityLabel="New category name"
                  style={[styles.input, { flex: 1, backgroundColor: t.background, color: t.text }]}
                />
                <Pressable
                  onPress={commitNew}
                  disabled={!newName.trim()}
                  accessibilityRole="button"
                  style={[styles.addButton, { backgroundColor: t.primary, opacity: newName.trim() ? 1 : 0.35 }]}>
                  <Txt variant="callout" color={t.onPrimary} style={{ fontWeight: '600' }}>
                    Add
                  </Txt>
                </Pressable>
              </View>
              {pickingEmoji ? <EmojiPicker value={newEmoji} onChange={setNewEmoji} /> : null}
            </View>
          ) : null}
        </View>

        {activeGoals.length ? (
          <View>
            <SectionLabel>Counts toward</SectionLabel>
            <View style={styles.wrap}>
              {activeGoals.map((g) => (
                <Chip key={g.id} label={g.name} dot={g.color} selected={goalId === g.id} onPress={() => setGoalId(g.id)} />
              ))}
              <Chip label="No goal" selected={goalId === null} onPress={() => setGoalId(null)} />
            </View>
          </View>
        ) : null}

        <View>
          <SectionLabel>Note</SectionLabel>
          <TextInput
            value={note}
            onChangeText={setNote}
            multiline
            placeholder="Anything worth remembering?"
            placeholderTextColor={t.textTertiary}
            accessibilityLabel="Note"
            style={[styles.input, styles.note, { backgroundColor: t.background, color: t.text }]}
          />
        </View>

        <View style={{ gap: Spacing.four }}>
          <Scale label="Energy" value={energy} onChange={setEnergy} />
          <Scale label="Focus" value={focus} onChange={setFocus} />
          <MoodScale value={mood} onChange={setMood} />
        </View>

        <View style={{ gap: Spacing.four }}>
          <View>
            <SectionLabel>Time</SectionLabel>
            <Txt variant="subhead" tone="secondary">
              Forgot to tap Lap on time? Move the start or end — the laps next to this one adjust to match.
            </Txt>
          </View>
          <TimeField label="Started" value={startedAt} onChange={setStartedAt} max={end - MINUTE} />
          {endedAt !== null ? <TimeField label="Ended" value={endedAt} onChange={setEndedAt} min={startedAt + MINUTE} max={now} /> : null}
          {canSplit ? (
            splitAt === null ? (
              <Button label="Split this lap in two…" variant="secondary" onPress={() => setSplitAt(Math.round((startedAt + end) / 2 / (5 * MINUTE)) * 5 * MINUTE)} />
            ) : (
              <View style={[styles.splitBox, { backgroundColor: t.background }]}>
                <TimeField label="Split at" value={splitAt} onChange={setSplitAt} min={minSplit} max={maxSplit} />
                <Txt variant="subhead" tone="secondary">
                  {running
                    ? `${formatTime(startedAt)} – ${formatTime(splitAt)} becomes its own lap to label. This lap keeps running from ${formatTime(splitAt)}.`
                    : `This lap ends at ${formatTime(splitAt)}. ${formatTime(splitAt)} – ${formatTime(end)} becomes a new lap to label.`}
                </Txt>
                <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                  <Button label="Cancel" variant="plain" onPress={() => setSplitAt(null)} style={{ flex: 1 }} />
                  <Button label="Split" onPress={split} style={{ flex: 1 }} />
                </View>
              </View>
            )
          ) : null}
        </View>

        <Button label="Save lap" onPress={save} />
        {!running ? (
          <>
            <Txt variant="subhead" tone="secondary" style={{ textAlign: 'center' }}>
              The next lap is already running — the clock never stops.
            </Txt>
            <Button label="Remove lap" variant="plain" onPress={remove} />
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Scale({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  const t = useTheme();
  return (
    <View style={styles.between}>
      <Txt variant="callout" style={{ fontWeight: '500' }}>
        {label}
      </Txt>
      <View style={{ flexDirection: 'row', gap: 6 }} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {[1, 2, 3, 4, 5].map((n) => {
          const on = value === n;
          return (
            <Pressable
              key={n}
              onPress={() => onChange(on ? null : n)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${label} ${n}`}
              style={[styles.scaleDot, { backgroundColor: on ? t.accent : t.background }]}>
              <Txt variant="callout" color={on ? '#FFFFFF' : t.text} style={{ fontWeight: on ? '600' : '400' }}>
                {n}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function MoodScale({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const t = useTheme();
  const picked = MOODS.find((m) => m.value === value);
  return (
    <View style={styles.between}>
      <View>
        <Txt variant="callout" style={{ fontWeight: '500' }}>
          Mood
        </Txt>
        <Txt variant="caption" tone="secondary">
          {picked ? picked.label : 'How did it feel?'}
        </Txt>
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }} accessibilityRole="radiogroup" accessibilityLabel="Mood">
        {MOODS.map((m) => {
          const on = value === m.value;
          return (
            <Pressable
              key={m.value}
              onPress={() => onChange(on ? null : m.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`Mood: ${m.label}`}
              style={[styles.scaleDot, { backgroundColor: on ? t.accentSoft : t.background, borderWidth: 2, borderColor: on ? t.accent : 'transparent' }]}>
              <Txt style={[styles.emoji, { opacity: value === null || on ? 1 : 0.45 }]}>{m.emoji}</Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  body: { padding: 20, gap: 26 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  newRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emojiButton: { width: 46, height: 46, borderRadius: Radius.medium, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  addButton: { height: 46, paddingHorizontal: 16, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' },
  input: { borderRadius: Radius.medium, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  note: { minHeight: 72, textAlignVertical: 'top' },
  splitBox: { borderRadius: Radius.card, padding: Spacing.four, gap: Spacing.three },
  emoji: { fontSize: 22, lineHeight: 28 },
  scaleDot: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
