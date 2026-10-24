import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Ring, tabular, Txt } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { GoalProgress } from '@/lib/stats';
import { formatDate, formatPct } from '@/lib/time';
import type { Goal } from '@/lib/types';

/** "+30 days" / "19 days early" / "On time" for a projected finish. */
export function slipLabel(p: GoalProgress): { text: string; late: boolean } | null {
  if (p.done) return { text: 'Done', late: false };
  if (p.slipDays === null) return null;
  if (p.slipDays > 0) return { text: `+${p.slipDays} days`, late: true };
  if (p.slipDays < 0) return { text: `${-p.slipDays} days early`, late: false };
  return { text: 'On time', late: false };
}

export function GoalCard({ goal, progress }: { goal: Goal; progress: GoalProgress }) {
  const t = useTheme();
  const slip = slipLabel(progress);
  return (
    <Pressable
      onPress={() => router.push(`/goal/${goal.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${goal.name}, ${formatPct(progress.allocation)} of waking time, target ${goal.targetPct}%`}
      style={({ pressed }) => [styles.card, { backgroundColor: t.card, opacity: pressed ? 0.75 : 1 }]}>
      <View style={styles.top}>
        <Ring fraction={progress.reality} color={goal.color} />
        <View style={{ flex: 1 }}>
          <Txt variant="headline">{goal.name}</Txt>
          <Txt variant="subhead" tone="secondary">
            {formatPct(progress.allocation)} of waking time · target {goal.targetPct}%
          </Txt>
        </View>
        <Icon name="chevron-right" color={t.textTertiary} size={18} />
      </View>
      <View style={[styles.stats, { borderTopColor: t.separator }]}>
        <View style={{ flex: 1 }}>
          <Txt variant="caption" tone="secondary">
            Reality
          </Txt>
          <Txt variant="headline" style={tabular}>
            {progress.reality.toFixed(2)}×
          </Txt>
        </View>
        <View style={{ flex: 1 }}>
          <Txt variant="caption" tone="secondary">
            {progress.done ? 'Finished' : 'On pace for'}
          </Txt>
          {progress.projectedFinish !== null ? (
            <Txt variant="headline">
              {formatDate(progress.projectedFinish)}{' '}
              {slip ? (
                <Txt variant="subhead" color={slip.late ? t.accentText : t.positive} style={{ fontWeight: '500' }}>
                  {slip.text}
                </Txt>
              ) : null}
            </Txt>
          ) : (
            <Txt variant="callout" tone="secondary">
              Log a lap to get a pace
            </Txt>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.card, padding: Spacing.four, gap: 14 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stats: { flexDirection: 'row', gap: 12, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
});
