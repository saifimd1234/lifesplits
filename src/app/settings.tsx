import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Logo } from '@/components/logo';
import { Card, Screen, Section, Separator, Txt } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppStore } from '@/store/app-store';

export default function SettingsScreen() {
  const replayIntro = useAppStore((s) => s.replayIntro);
  const loadSampleData = useAppStore((s) => s.loadSampleData);
  const resetAll = useAppStore((s) => s.resetAll);
  const lapCount = useAppStore((s) => s.laps.length);
  const categoryCount = useAppStore((s) => s.categories.length);

  const confirmSample = () =>
    Alert.alert('Load sample data?', 'This replaces everything with three weeks of example laps and three goals.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Load sample', style: 'destructive', onPress: loadSampleData },
    ]);
  const confirmReset = () =>
    Alert.alert('Erase all data?', `This deletes ${lapCount} laps and all goals from this phone. It can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Erase', style: 'destructive', onPress: resetAll },
    ]);

  return (
    <Screen>
      <Section label="Guide" style={{ marginTop: Spacing.two }}>
        <Card padded={false}>
          <Row label="Replay the intro" detail="Walk through how LifeSplits works again, with tips turned back on." onPress={replayIntro} />
        </Card>
      </Section>

      <Section label="Tracking">
        <Card padded={false}>
          <Row label="Categories" detail={`Rename, add icons, group or link your ${categoryCount} activities to goals.`} onPress={() => router.push('/categories')} />
          <Separator inset={16} />
          <Row label="Add missed time" detail="Log a lap you forgot to track, on any of the last 7 days." onPress={() => router.push('/add-lap')} />
        </Card>
      </Section>

      <Section label="Data">
        <Card padded={false}>
          <Row label="Load sample data" detail="Try the reviews and goals with three weeks of example laps." onPress={confirmSample} />
          <Separator inset={16} />
          <Row label="Erase all data" destructive onPress={confirmReset} />
        </Card>
        <Txt variant="caption" tone="secondary" style={{ marginTop: Spacing.two, paddingHorizontal: 4 }}>
          No account, no cloud. Your laps and goals are stored only on this phone.
        </Txt>
      </Section>

      <Section label="About">
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.four }}>
          <Logo size={56} />
          <View>
            <Txt variant="headline">LifeSplits</Txt>
            <Txt variant="subhead" tone="secondary">
              Version {Constants.expoConfig?.version ?? '1.0.0'}
            </Txt>
          </View>
        </Card>
      </Section>
    </Screen>
  );
}

function Row({ label, detail, onPress, destructive }: { label: string; detail?: string; onPress: () => void; destructive?: boolean }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="body" color={destructive ? '#DC2626' : t.text}>
          {label}
        </Txt>
        {detail ? (
          <Txt variant="subhead" tone="secondary">
            {detail}
          </Txt>
        ) : null}
      </View>
      {!destructive ? <Icon name="chevron-right" color={t.textTertiary} size={18} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, minHeight: 52 },
});
