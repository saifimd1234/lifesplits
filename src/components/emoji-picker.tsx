import type { ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Txt } from '@/components/ui';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { EMOJI_CHOICES } from '@/lib/emoji';

/** A grid of common activity icons, plus a field for any emoji from the keyboard. */
export function EmojiPicker({ value, onChange }: { value: string; onChange: (emoji: string) => void }) {
  const t = useTheme();
  const custom = value && !EMOJI_CHOICES.includes(value) ? value : '';
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.grid} accessibilityRole="radiogroup" accessibilityLabel="Icon">
        <Cell selected={!value} onPress={() => onChange('')} label="No icon">
          <Txt variant="caption" tone="secondary">
            None
          </Txt>
        </Cell>
        {EMOJI_CHOICES.map((e) => (
          <Cell key={e} selected={value === e} onPress={() => onChange(e)} label={e}>
            <Txt style={styles.emoji}>{e}</Txt>
          </Cell>
        ))}
      </View>
      <TextInput
        value={custom}
        onChangeText={(x) => onChange(x.trim().slice(0, 8))}
        placeholder="Or type any emoji"
        placeholderTextColor={t.textTertiary}
        accessibilityLabel="Custom emoji"
        style={[styles.input, { backgroundColor: t.background, color: t.text }]}
      />
    </View>
  );
}

function Cell({ selected, onPress, label, children }: { selected: boolean; onPress: () => void; label: string; children: ReactNode }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.cell,
        { backgroundColor: selected ? t.accentSoft : t.background, borderColor: selected ? t.accent : 'transparent', opacity: pressed ? 0.7 : 1 },
      ]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cell: { width: 44, height: 44, borderRadius: Radius.medium, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 22, lineHeight: 28 },
  input: { borderRadius: Radius.medium, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16 },
});
