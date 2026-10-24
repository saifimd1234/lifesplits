import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Card, Dot, Screen, Section, Separator, tabular, Txt } from '@/components/ui';
import { LifeGroupLabels, Spacing, type LifeGroup } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useLifeColors, useTheme } from '@/hooks/use-theme';
import { lapDuration } from '@/lib/stats';
import { formatHours } from '@/lib/time';
import { useAppStore } from '@/store/app-store';

export default function CategoriesScreen() {
  const t = useTheme();
  const life = useLifeColors();
  const categories = useAppStore((s) => s.categories);
  const goals = useAppStore((s) => s.goals);
  const laps = useAppStore((s) => s.laps);
  const now = useNow(false);

  const usage = useMemo(() => {
    const out = new Map<string, { n: number; ms: number }>();
    for (const l of laps) {
      if (!l.categoryId) continue;
      const u = out.get(l.categoryId) ?? { n: 0, ms: 0 };
      out.set(l.categoryId, { n: u.n + 1, ms: u.ms + lapDuration(l, now) });
    }
    return out;
  }, [laps, now]);

  const goalById = new Map(goals.map((g) => [g.id, g]));
  const groups = (Object.keys(LifeGroupLabels) as LifeGroup[])
    .map((g) => ({ group: g, items: categories.filter((c) => c.group === g).sort((a, b) => a.name.localeCompare(b.name)) }))
    .filter((x) => x.items.length);

  return (
    <Screen>
      <Txt variant="callout" tone="secondary" style={{ marginTop: Spacing.two }}>
        Rename an activity, give it an icon, change what kind of time it is, or link it to a goal.
      </Txt>

      <Section style={{ marginTop: Spacing.four }}>
        <Card padded={false}>
          <Pressable onPress={() => router.push({ pathname: '/category/[id]', params: { id: 'new' } })} accessibilityRole="button" style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}>
            <View style={[styles.icon, { backgroundColor: t.accentSoft }]}>
              <Icon name="plus" color={t.accentText} size={20} />
            </View>
            <Txt variant="body" color={t.accent} style={{ flex: 1 }}>
              New category
            </Txt>
          </Pressable>
        </Card>
      </Section>

      {groups.map(({ group, items }) => (
        <Section key={group} label={LifeGroupLabels[group]}>
          <Card padded={false}>
            {items.map((c, i) => {
              const u = usage.get(c.id);
              const goal = c.goalId ? goalById.get(c.goalId) : undefined;
              return (
                <View key={c.id}>
                  {i > 0 ? <Separator inset={68} /> : null}
                  <Pressable
                    onPress={() => router.push({ pathname: '/category/[id]', params: { id: c.id } })}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${c.name}`}
                    style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}>
                    <View style={[styles.icon, { backgroundColor: t.fill }]}>
                      {c.emoji ? <Txt style={styles.emoji}>{c.emoji}</Txt> : <Dot color={life[c.group]} size={12} />}
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Txt variant="body">{c.name}</Txt>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {goal ? (
                          <>
                            <Dot color={goal.color} size={6} />
                            <Txt variant="caption" tone="secondary">
                              {goal.name} ·
                            </Txt>
                          </>
                        ) : null}
                        <Txt variant="caption" tone="secondary" style={tabular}>
                          {u ? `${u.n} ${u.n === 1 ? 'lap' : 'laps'} · ${formatHours(u.ms)}` : 'Not used yet'}
                        </Txt>
                      </View>
                    </View>
                    <Icon name="chevron-right" color={t.textTertiary} size={18} />
                  </Pressable>
                </View>
              );
            })}
          </Card>
        </Section>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, minHeight: 56 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 22, lineHeight: 28 },
});
