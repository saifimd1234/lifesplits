import { router } from 'expo-router';
import { View } from 'react-native';

import { GoalCard } from '@/components/goal-card';
import { Trends } from '@/components/trends';
import { Button, Card, Empty, IconButton, LargeHeader, Screen, Section, Tip, Txt } from '@/components/ui';
import { LifeGroupLabels, Spacing, type LifeGroup } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { breakdown, goalProgress, trackedTime } from '@/lib/stats';
import { formatHours, formatPct, isoWeek, startOfWeek } from '@/lib/time';
import { useAppStore } from '@/store/app-store';

export default function GoalsScreen() {
  const goals = useAppStore((s) => s.goals);
  const laps = useAppStore((s) => s.laps);
  const sessions = useAppStore((s) => s.sessions);
  const categories = useAppStore((s) => s.categories);
  const now = useNow(true, 30_000);

  const active = goals.filter((g) => !g.archived);
  const weekStart = startOfWeek(now);
  const week = breakdown(laps, categories, weekStart, now, now);
  const tracked = trackedTime(sessions, weekStart, now, now);
  const planned = active.reduce((a, g) => a + g.targetPct, 0);
  const groups = (Object.keys(LifeGroupLabels) as LifeGroup[]).filter((g) => week.byGroup[g] > 0);

  return (
    <Screen
      header={
        <LargeHeader
          overline={`Week ${isoWeek(now)}`}
          title="Goals"
          right={<IconButton icon="plus" label="New goal" onPress={() => router.push('/new-goal')} />}
        />
      }>
      <Tip
        tipKey="goals"
        title="Reading a goal"
        body="The ring fills as your real share of time approaches your target (last 7 days). Reality 1.00× means on plan. “On pace for” is when you'll finish at the pace you're actually keeping."
        style={{ marginBottom: Spacing.four }}
      />

      {active.length === 0 ? (
        <Empty
          title="Set your first goal"
          body="Give it a share of your waking time and a rough number of hours. LifeSplits will tell you when you'll really get there."
          action={<Button label="New goal" onPress={() => router.push('/new-goal')} style={{ marginTop: Spacing.two, alignSelf: 'stretch' }} />}
        />
      ) : (
        <>
          {tracked > 0 ? (
            <Txt variant="body" style={{ marginBottom: Spacing.four }}>
              Your goals got <Txt variant="body" style={{ fontWeight: '600' }}>{formatPct(week.goalTotal / tracked)}</Txt> of your waking time this week.{' '}
              <Txt variant="body" tone="secondary">
                You planned {planned}%.
              </Txt>
            </Txt>
          ) : null}
          <View style={{ gap: Spacing.three }}>
            {active.map((g) => (
              <GoalCard key={g.id} goal={g} progress={goalProgress(g, laps, sessions, now)} />
            ))}
          </View>
        </>
      )}

      <Trends goals={active} laps={laps} sessions={sessions} categories={categories} now={now} />

      {groups.length ? (
        <Section label="The rest of your week">
          <Card style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: Spacing.three }}>
            {groups.map((g) => (
              <View key={g} style={{ width: '33.33%' }}>
                <Txt variant="caption" tone="secondary">
                  {LifeGroupLabels[g]}
                </Txt>
                <Txt variant="headline">{formatHours(week.byGroup[g])}</Txt>
              </View>
            ))}
          </Card>
        </Section>
      ) : null}
    </Screen>
  );
}
