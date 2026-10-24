import { TabList, TabSlot, TabTrigger, Tabs, type TabListProps, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, Text, View, type PressableProps } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { useTheme } from '@/hooks/use-theme';

/** Web stand-in for native tabs: a bottom bar like the phone's, so the layout matches. */
export default function WebTabLayout() {
  return (
    <Tabs style={{ flex: 1 }}>
      <TabSlot style={{ flex: 1 }} />
      <TabList asChild>
        <Bar>
          <TabTrigger name="index" href="/" asChild>
            <TabButton icon="stopwatch">Today</TabButton>
          </TabTrigger>
          <TabTrigger name="goals" href="/goals" asChild>
            <TabButton icon="target">Goals</TabButton>
          </TabTrigger>
          <TabTrigger name="review" href="/review" asChild>
            <TabButton icon="chart">Review</TabButton>
          </TabTrigger>
        </Bar>
      </TabList>
    </Tabs>
  );
}

function Bar(props: TabListProps) {
  const t = useTheme();
  return <View {...props} style={[styles.bar, { backgroundColor: t.card, borderTopColor: t.separator }]} />;
}

function TabButton({ children, isFocused, icon, ...props }: TabTriggerSlotProps & { icon: IconName }) {
  const t = useTheme();
  const color = isFocused ? t.accent : t.textSecondary;
  return (
    // TabTrigger's slot ref is typed for View; the props themselves are Pressable-compatible.
    <Pressable {...(props as PressableProps)} style={styles.button}>
      <Icon name={icon} color={color} size={26} strokeWidth={1.8} />
      <Text style={[styles.label, { color, fontWeight: isFocused ? '600' : '500' }]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 7, paddingBottom: 20, borderTopWidth: StyleSheet.hairlineWidth },
  button: { width: 96, minHeight: 44, alignItems: 'center', gap: 3 },
  label: { fontSize: 11 },
});
