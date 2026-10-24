import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmojiPicker } from '@/components/emoji-picker';
import { Button, Chip, SectionLabel, SheetHeader, Txt } from '@/components/ui';
import { LifeGroupLabels, Radius, Spacing, type LifeGroup } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { categoryLabel } from '@/lib/emoji';
import { useAppStore } from '@/store/app-store';

export default function CategorySheet() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const editing = useAppStore((s) => s.categories.find((c) => c.id === id));
  const categories = useAppStore((s) => s.categories);
  const goals = useAppStore((s) => s.goals);
  const lapCount = useAppStore((s) => s.laps.filter((l) => l.categoryId === id).length);
  const addCategory = useAppStore((s) => s.addCategory);
  const updateCategory = useAppStore((s) => s.updateCategory);
  const deleteCategory = useAppStore((s) => s.deleteCategory);

  const [name, setName] = useState(editing?.name ?? '');
  const [emoji, setEmoji] = useState(editing?.emoji ?? '');
  const [group, setGroup] = useState<LifeGroup>(editing?.group ?? 'other');
  const [goalId, setGoalId] = useState<string | null>(editing?.goalId ?? null);
  const [relink, setRelink] = useState(true);

  const clean = name.trim();
  const duplicate = categories.some((c) => c.id !== editing?.id && c.name.toLowerCase() === clean.toLowerCase());
  const canSave = clean.length > 0 && !duplicate;
  const goalChanged = !!editing && goalId !== editing.goalId && lapCount > 0;
  const activeGoals = goals.filter((g) => !g.archived);

  const save = () => {
    if (!canSave) return;
    if (editing) updateCategory(editing.id, { name: clean, emoji, group, goalId }, goalChanged && relink);
    else addCategory(clean, group, goalId, emoji);
    router.back();
  };

  const remove = () => {
    if (!editing) return;
    Alert.alert(
      `Delete “${editing.name}”?`,
      lapCount ? `${lapCount} ${lapCount === 1 ? 'lap goes' : 'laps go'} back to unlabeled. Their time and notes stay.` : 'It has no laps yet.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            router.back();
            deleteCategory(editing.id);
          },
        },
      ],
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: t.card }}>
      <SheetHeader title={editing ? 'Edit category' : 'New category'} onCancel={() => router.back()} action={editing ? 'Save' : 'Add'} onAction={save} actionDisabled={!canSave} />

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <View style={[styles.preview, { backgroundColor: t.background }]}>
          <Txt variant="caption" tone="secondary">
            Shows up as
          </Txt>
          <Chip label={clean ? categoryLabel({ name: clean, emoji }) : 'Your category'} selected />
        </View>

        <View>
          <SectionLabel>Name</SectionLabel>
          <TextInput
            value={name}
            onChangeText={setName}
            onSubmitEditing={save}
            returnKeyType="done"
            autoFocus={!editing}
            placeholder="e.g. Guitar practice"
            placeholderTextColor={t.textTertiary}
            accessibilityLabel="Category name"
            style={[styles.input, { backgroundColor: t.background, color: t.text }]}
          />
          {duplicate ? (
            <Txt variant="caption" color={t.accentText} style={{ marginTop: 6 }}>
              You already have a category with this name.
            </Txt>
          ) : null}
        </View>

        <View>
          <SectionLabel>Icon</SectionLabel>
          <EmojiPicker value={emoji} onChange={setEmoji} />
        </View>

        <View>
          <SectionLabel>Kind of time</SectionLabel>
          <View style={styles.wrap}>
            {(Object.keys(LifeGroupLabels) as LifeGroup[]).map((g) => (
              <Chip key={g} label={LifeGroupLabels[g]} selected={group === g} onPress={() => setGroup(g)} />
            ))}
          </View>
          <Txt variant="caption" tone="secondary" style={{ marginTop: 6 }}>
            Used to group the rest of your day in reviews when the time isn’t for a goal.
          </Txt>
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
            {goalChanged ? (
              <Pressable onPress={() => setRelink((x) => !x)} style={[styles.switchRow, { backgroundColor: t.background }]}>
                <Txt variant="callout" style={{ flex: 1 }}>
                  Also move its {lapCount} past {lapCount === 1 ? 'lap' : 'laps'}
                </Txt>
                <Switch value={relink} onValueChange={setRelink} />
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {editing ? <Button label="Delete category" variant="plain" onPress={remove} /> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, gap: 26 },
  preview: { borderRadius: Radius.card, padding: Spacing.four, gap: Spacing.two, alignItems: 'flex-start' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: { borderRadius: Radius.medium, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: Spacing.three, borderRadius: Radius.medium, paddingHorizontal: 14, paddingVertical: 8 },
});
