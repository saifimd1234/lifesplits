import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Chip, SectionLabel, tabular, Tip, Txt } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { lapDuration } from '@/lib/stats';
import { formatClock, formatTime } from '@/lib/time';
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
  const now = useNow(lap?.endedAt === null);

  const [categoryId, setCategoryId] = useState<string | null>(lap?.categoryId ?? null);
  const [goalId, setGoalId] = useState<string | null>(lap?.goalId ?? null);
  const [note, setNote] = useState(lap?.note ?? '');
  const [energy, setEnergy] = useState<number | null>(lap?.energy ?? null);
  const [focus, setFocus] = useState<number | null>(lap?.focus ?? null);
  const [newName, setNewName] = useState<string | null>(null);

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

  const pickCategory = (cid: string) => {
    setNewName(null);
    setCategoryId(cid);
    const cat = categories.find((c) => c.id === cid);
    setGoalId(cat?.goalId ?? null);
  };

  const save = () => {
    let cid = categoryId;
    if (newName && newName.trim()) {
      const existing = categories.find((c) => c.name.toLowerCase() === newName.trim().toLowerCase());
      cid = existing ? existing.id : addCategory(newName, 'other', goalId).id;
    }
    updateLap(lap.id, { categoryId: cid, goalId, note: note.trim(), energy, focus });
    router.back();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: t.card }}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 12 : insets.top + 8, borderColor: t.separator }]}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={10} style={styles.headerButton}>
          <Txt variant="body" color={t.accent}>
            Cancel
          </Txt>
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Txt variant="headline">{running ? 'Current lap' : `Lap ${lapNumber}`}</Txt>
          <Txt variant="caption" tone="secondary" style={tabular}>
            {formatClock(lapDuration(lap, now))} · {formatTime(lap.startedAt)}
            {lap.endedAt ? ` – ${formatTime(lap.endedAt)}` : ''}
          </Txt>
        </View>
        <Pressable onPress={save} accessibilityRole="button" hitSlop={10} style={[styles.headerButton, { alignItems: 'flex-end' }]}>
          <Txt variant="headline" color={t.accent}>
            Save
          </Txt>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <Tip tipKey="lapSheet" title="Label in two taps" body="Pick what that time was. Categories you use most move to the front, and a category linked to a goal fills in “Counts toward” for you." />

        <View style={{ gap: Spacing.three }}>
          <Txt variant="title">{running ? 'What are you doing?' : 'What was that?'}</Txt>
          <View style={styles.wrap}>
            {ordered.map((c) => (
              <Chip key={c.id} label={c.name} selected={c.id === categoryId && newName === null} onPress={() => pickCategory(c.id)} />
            ))}
            {newName === null ? <Chip label="+ New" dashed onPress={() => setNewName('')} /> : null}
          </View>
          {newName !== null ? (
            <TextInput
              autoFocus
              value={newName}
              onChangeText={setNewName}
              placeholder="New category, e.g. Guitar practice"
              placeholderTextColor={t.textTertiary}
              accessibilityLabel="New category name"
              style={[styles.input, { backgroundColor: t.background, color: t.text }]}
            />
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
        </View>

        <Button label="Save lap" onPress={save} />
        {!running ? (
          <Txt variant="subhead" tone="secondary" style={{ textAlign: 'center' }}>
            The next lap is already running — the clock never stops.
          </Txt>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Scale({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  const t = useTheme();
  return (
    <View style={styles.scaleRow}>
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

const styles = StyleSheet.create({
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  headerButton: { minWidth: 64, minHeight: 44, justifyContent: 'center' },
  body: { padding: 20, gap: 26 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: { borderRadius: Radius.medium, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  note: { minHeight: 72, textAlignVertical: 'top' },
  scaleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scaleDot: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
