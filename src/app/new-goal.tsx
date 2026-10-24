import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Chip, SectionLabel, Separator, tabular, Txt } from '@/components/ui';
import { GoalColors, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { trackedTime } from '@/lib/stats';
import { addDays, DAY, daysBetween, formatDate, HOUR, startOfDay } from '@/lib/time';
import { useAppStore } from '@/store/app-store';

const SHARE_PRESETS = [5, 10, 15, 25, 40];
const DATE_PRESETS = [
  { label: '1 month', days: 30 },
  { label: '2 months', days: 60 },
  { label: '3 months', days: 91 },
  { label: '6 months', days: 182 },
];

export default function NewGoal() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = useAppStore((s) => (id ? s.goals.find((g) => g.id === id) : undefined));
  const goals = useAppStore((s) => s.goals);
  const categories = useAppStore((s) => s.categories);
  const sessions = useAppStore((s) => s.sessions);
  const addGoal = useAppStore((s) => s.addGoal);
  const updateGoal = useAppStore((s) => s.updateGoal);
  const linkCategories = useAppStore((s) => s.linkCategories);

  const [openedAt] = useState(() => Date.now());
  const today = startOfDay(openedAt);
  const unusedColor = GoalColors.find((c) => !goals.some((g) => g.color === c.hex))?.hex ?? GoalColors[0].hex;
  const [name, setName] = useState(editing?.name ?? '');
  const [color, setColor] = useState(editing?.color ?? unusedColor);
  const [targetDate, setTargetDate] = useState(editing?.targetDate ?? addDays(today, 60));
  const [effort, setEffort] = useState(editing?.effortHours ?? 100);
  const [share, setShare] = useState(editing?.targetPct ?? 15);
  const [linked, setLinked] = useState<string[]>(() => (editing ? categories.filter((c) => c.goalId === editing.id).map((c) => c.id) : []));
  const [newNames, setNewNames] = useState<string[]>([]);
  const [draft, setDraft] = useState<string | null>(null);

  // Typical waking hours from the last two weeks of real days; 16 h until there is data.
  const wakingHours = useMemo(() => {
    const from = addDays(today, -14);
    const days = new Set(sessions.filter((s) => s.startedAt >= from && s.endedAt).map((s) => startOfDay(s.startedAt))).size;
    if (days < 3) return 16;
    return trackedTime(sessions, from, today, openedAt) / HOUR / days;
  }, [sessions, today, openedAt]);

  const perDay = (share / 100) * wakingHours;
  const daysNeeded = Math.ceil(effort / perDay);
  const finish = addDays(today, daysNeeded);
  const daysToTarget = daysBetween(today, targetDate);
  const fits = finish <= targetDate;
  const canSave = name.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    const fields = { name: name.trim(), color, targetPct: share, effortHours: effort, targetDate };
    const goalId = editing ? editing.id : addGoal(fields).id;
    if (editing) updateGoal(editing.id, fields);
    linkCategories(goalId, linked, newNames);
    router.back();
  };

  const toggle = (cid: string) => setLinked((xs) => (xs.includes(cid) ? xs.filter((x) => x !== cid) : [...xs, cid]));
  const commitDraft = () => {
    // Submit and blur can both fire for one entry; dedupe instead of tracking which came first.
    const clean = draft?.trim();
    if (clean) setNewNames((xs) => (xs.some((x) => x.toLowerCase() === clean.toLowerCase()) ? xs : [...xs, clean]));
    setDraft(null);
  };
  // Categories already serving another goal are left out so a lap can't count twice.
  const pickable = categories.filter((c) => c.goalId === null || c.goalId === editing?.id);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: t.background }}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 12 : insets.top + 8, borderColor: t.separator }]}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={10} style={styles.headerButton}>
          <Txt variant="body" color={t.accent}>
            Cancel
          </Txt>
        </Pressable>
        <Txt variant="headline">{editing ? 'Edit Goal' : 'New Goal'}</Txt>
        <Pressable onPress={save} disabled={!canSave} accessibilityRole="button" hitSlop={10} style={[styles.headerButton, { alignItems: 'flex-end', opacity: canSave ? 1 : 0.4 }]}>
          <Txt variant="headline" color={t.accent}>
            {editing ? 'Save' : 'Add'}
          </Txt>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
        <View style={[styles.group, { backgroundColor: t.card }]}>
          <View style={styles.row}>
            <Txt variant="callout">Name</Txt>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Physique"
              placeholderTextColor={t.textTertiary}
              accessibilityLabel="Goal name"
              autoFocus={!editing}
              style={[styles.nameInput, { color: t.text }]}
            />
          </View>
          <Separator />
          <View style={styles.row}>
            <Txt variant="callout">Color</Txt>
            <View style={{ flexDirection: 'row', gap: 8 }} accessibilityRole="radiogroup">
              {GoalColors.map((c) => {
                const on = c.hex === color;
                return (
                  <Pressable
                    key={c.hex}
                    onPress={() => setColor(c.hex)}
                    accessibilityRole="radio"
                    accessibilityLabel={c.name}
                    accessibilityState={{ checked: on }}
                    style={[styles.swatch, { backgroundColor: c.hex, borderColor: on ? t.text : 'transparent' }]}
                  />
                );
              })}
            </View>
          </View>
        </View>

        <View>
          <SectionLabel>Target date</SectionLabel>
          <View style={[styles.group, { backgroundColor: t.card }]}>
            <View style={styles.row}>
              <Txt variant="headline">{formatDate(targetDate, { month: 'short', day: 'numeric', year: 'numeric' })}</Txt>
              <View style={styles.stepRow}>
                <Txt variant="subhead" tone="secondary">
                  {daysToTarget} days
                </Txt>
                <Stepper onMinus={() => setTargetDate((d) => Math.max(addDays(today, 7), d - 7 * DAY))} onPlus={() => setTargetDate((d) => addDays(d, 7))} unit="week" />
              </View>
            </View>
          </View>
          <View style={[styles.wrap, { marginTop: Spacing.two }]}>
            {DATE_PRESETS.map((p) => (
              <Chip key={p.label} label={p.label} selected={daysToTarget === p.days} onPress={() => setTargetDate(addDays(today, p.days))} />
            ))}
          </View>
        </View>

        <View>
          <SectionLabel>Effort estimate</SectionLabel>
          <View style={[styles.group, { backgroundColor: t.card }]}>
            <View style={styles.row}>
              <Txt variant="headline" style={tabular}>
                {effort} hours
              </Txt>
              <Stepper onMinus={() => setEffort((e) => Math.max(5, e - 10))} onPlus={() => setEffort((e) => e + 10)} unit="10 hours" />
            </View>
          </View>
        </View>

        <View>
          <SectionLabel>Share of waking time</SectionLabel>
          <View style={[styles.group, { backgroundColor: t.card, paddingVertical: Spacing.four, gap: Spacing.two }]}>
            <View style={styles.row}>
              <Txt style={[{ fontSize: 34, fontWeight: '600', color: t.text }, tabular]}>{share}%</Txt>
              <Stepper onMinus={() => setShare((s) => Math.max(1, s - 1))} onPlus={() => setShare((s) => Math.min(90, s + 1))} unit="percent" />
            </View>
            <Txt variant="subhead" tone="secondary">
              About <Txt variant="subhead" style={{ fontWeight: '600' }}>{perDay.toFixed(1)} h a day</Txt> of your ~{Math.round(wakingHours)} waking hours.
            </Txt>
          </View>
          <View style={[styles.wrap, { marginTop: Spacing.two }]}>
            {SHARE_PRESETS.map((p) => (
              <Chip key={p} label={`${p}%`} selected={share === p} onPress={() => setShare(p)} />
            ))}
          </View>
        </View>

        <View>
          <SectionLabel>Laps that count</SectionLabel>
          <Txt variant="subhead" tone="secondary" style={{ marginBottom: Spacing.two }}>
            Laps in these categories count toward this goal automatically.
          </Txt>
          <View style={styles.wrap}>
            {pickable.map((c) => (
              <Chip key={c.id} label={c.name} selected={linked.includes(c.id)} onPress={() => toggle(c.id)} />
            ))}
            {newNames.map((n) => (
              <Chip key={`new-${n}`} label={n} selected onPress={() => setNewNames((xs) => xs.filter((x) => x !== n))} />
            ))}
            {draft === null ? <Chip label="+ Category" dashed onPress={() => setDraft('')} /> : null}
          </View>
          {draft !== null ? (
            <TextInput
              autoFocus
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={commitDraft}
              onBlur={commitDraft}
              returnKeyType="done"
              placeholder="e.g. Workout"
              placeholderTextColor={t.textTertiary}
              accessibilityLabel="New category name"
              style={[styles.draft, { backgroundColor: t.card, color: t.text }]}
            />
          ) : null}
        </View>

        <View style={[styles.projection, { backgroundColor: t.insight }]}>
          <Txt variant="callout" color={t.onInsight}>
            At {share}%, {effort} h takes about <Txt variant="callout" color={t.onInsight} style={{ fontWeight: '700' }}>{daysNeeded} days</Txt> — done by{' '}
            <Txt variant="callout" color={t.onInsight} style={{ fontWeight: '700' }}>
              {formatDate(finish, { month: 'short', day: 'numeric', year: 'numeric' })}
            </Txt>
            .
          </Txt>
          <Txt variant="subhead" color={fits ? '#86EFAC' : '#FDBA74'}>
            {fits ? 'That fits before your target date.' : `${daysBetween(targetDate, finish)} days after your target date — raise the share or move the date.`}
          </Txt>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Stepper({ onMinus, onPlus, unit }: { onMinus: () => void; onPlus: () => void; unit: string }) {
  const t = useTheme();
  return (
    <View style={[styles.stepper, { backgroundColor: t.fill }]}>
      <Pressable onPress={onMinus} accessibilityRole="button" accessibilityLabel={`Minus one ${unit}`} style={[styles.stepButton, { backgroundColor: t.card }]}>
        <Icon name="minus" color={t.text} size={18} />
      </Pressable>
      <Pressable onPress={onPlus} accessibilityRole="button" accessibilityLabel={`Plus one ${unit}`} style={[styles.stepButton, { backgroundColor: t.card }]}>
        <Icon name="plus" color={t.text} size={18} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  headerButton: { minWidth: 64, minHeight: 44, justifyContent: 'center' },
  body: { padding: 20, gap: 24 },
  group: { borderRadius: Radius.medium + 2, paddingHorizontal: Spacing.four },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 54, gap: 12 },
  nameInput: { flex: 1, textAlign: 'right', fontSize: 17, fontWeight: '600', paddingVertical: 12 },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 3 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepper: { flexDirection: 'row', padding: 2, gap: 2, borderRadius: 9 },
  stepButton: { width: 44, height: 34, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  draft: { marginTop: Spacing.two, borderRadius: Radius.medium, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  projection: { borderRadius: Radius.card, padding: Spacing.four, gap: 6 },
});
