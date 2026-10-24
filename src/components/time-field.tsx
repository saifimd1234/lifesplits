import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { tabular, Txt } from '@/components/ui';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatTime, MINUTE } from '@/lib/time';

/** Reads "10:15", "1015", "7", "7:30pm", "7.30 am" as a time on the same day as `base`. */
export function parseTimeOn(base: number, text: string): number | null {
  const m = text.trim().match(/^(\d{1,2})(?:[:.\s]?(\d{2}))?\s*([ap])?\.?\s*m?\.?$/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  const half = m[3]?.toLowerCase();
  if (half === 'p' && h < 12) h += 12;
  if (half === 'a' && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  const d = new Date(base);
  d.setHours(h, min, 0, 0);
  return d.getTime();
}

const NUDGES = [-15, -5, 5, 15];

/** A clock time you can type or nudge in 5- and 15-minute steps. */
export function TimeField({
  label,
  value,
  onChange,
  min = -Infinity,
  max = Infinity,
}: {
  label: string;
  value: number;
  onChange: (ts: number) => void;
  min?: number;
  max?: number;
}) {
  const t = useTheme();
  const [draft, setDraft] = useState<string | null>(null);
  const clamp = (ts: number) => Math.max(min, Math.min(max, ts));

  const commit = () => {
    if (draft === null) return;
    const ts = parseTimeOn(value, draft);
    if (ts !== null) onChange(clamp(ts));
    setDraft(null);
  };

  return (
    <View style={{ gap: 6 }}>
      <Txt variant="callout" style={{ fontWeight: '500' }}>
        {label}
      </Txt>
      <View style={styles.row}>
        {NUDGES.slice(0, 2).map((n) => (
          <Nudge key={n} minutes={n} onPress={() => onChange(clamp(value + n * MINUTE))} disabled={value <= min} />
        ))}
        <TextInput
          value={draft ?? formatTime(value)}
          onFocus={() => setDraft(formatTime(value))}
          onChangeText={setDraft}
          onSubmitEditing={commit}
          onBlur={commit}
          selectTextOnFocus
          returnKeyType="done"
          accessibilityLabel={`${label}, ${formatTime(value)}. Type a time like 10:15 or 7:30 pm.`}
          style={[styles.input, tabular, { backgroundColor: t.background, color: t.text }]}
        />
        {NUDGES.slice(2).map((n) => (
          <Nudge key={n} minutes={n} onPress={() => onChange(clamp(value + n * MINUTE))} disabled={value >= max} />
        ))}
      </View>
    </View>
  );
}

function Nudge({ minutes, onPress, disabled }: { minutes: number; onPress: () => void; disabled?: boolean }) {
  const t = useTheme();
  const text = minutes > 0 ? `+${minutes}` : `−${-minutes}`;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${minutes > 0 ? 'Later' : 'Earlier'} by ${Math.abs(minutes)} minutes`}
      style={({ pressed }) => [styles.nudge, { backgroundColor: t.fill, opacity: disabled ? 0.35 : pressed ? 0.6 : 1 }]}>
      <Txt variant="subhead" style={[{ fontWeight: '600' }, tabular]}>
        {text}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  input: { flex: 1, minWidth: 92, height: 44, borderRadius: Radius.medium, textAlign: 'center', fontSize: 17, fontWeight: '600' },
  nudge: { width: 48, height: 44, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' },
});
