import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { tabular, Txt } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addDays, addMonths, formatDate, startOfDay, startOfMonth } from '@/lib/time';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Month-grid date picker in a modal. Tapping a day picks it and closes. Weeks start on Monday. */
export function CalendarSheet({
  visible,
  value,
  minDate,
  today,
  onPick,
  onClose,
}: {
  visible: boolean;
  value: number;
  /** Days before this are disabled. */
  minDate: number;
  /** Start of today, marked with a ring. */
  today: number;
  onPick: (day: number) => void;
  onClose: () => void;
}) {
  const t = useTheme();
  const [month, setMonth] = useState(() => startOfMonth(value));
  const [lastValue, setLastValue] = useState(value);
  // Reopening after the date changed elsewhere (presets, stepper) shows that date's month.
  if (value !== lastValue) {
    setLastValue(value);
    setMonth(startOfMonth(value));
  }

  const selected = startOfDay(value);
  const min = startOfDay(minDate);
  const lead = (new Date(month).getDay() + 6) % 7;
  const daysInMonth = new Date(new Date(month).getFullYear(), new Date(month).getMonth() + 1, 0).getDate();
  const cells: (number | null)[] = [...Array<null>(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => addDays(month, i))];
  while (cells.length % 7) cells.push(null);
  const canGoBack = month > startOfMonth(min);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: t.sheetBackdrop }]} onPress={onClose} accessibilityLabel="Close calendar">
        {/* Inner Pressable swallows taps so only the backdrop closes the sheet. */}
        <Pressable style={[styles.sheet, { backgroundColor: t.card }]} onPress={() => {}}>
          <View style={styles.header}>
            <Pressable
              onPress={() => setMonth((m) => addMonths(m, -1))}
              disabled={!canGoBack}
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              hitSlop={8}
              style={[styles.nav, { opacity: canGoBack ? 1 : 0.3 }]}>
              <Icon name="chevron-left" color={t.accent} />
            </Pressable>
            <Txt variant="headline">{formatDate(month, { month: 'long', year: 'numeric' })}</Txt>
            <Pressable onPress={() => setMonth((m) => addMonths(m, 1))} accessibilityRole="button" accessibilityLabel="Next month" hitSlop={8} style={styles.nav}>
              <Icon name="chevron-right" color={t.accent} />
            </Pressable>
          </View>

          <View style={styles.grid}>
            {WEEKDAYS.map((d, i) => (
              <View key={`wd-${i}`} style={styles.cell}>
                <Txt variant="caption" tone="tertiary" style={{ fontWeight: '600' }}>
                  {d}
                </Txt>
              </View>
            ))}
            {cells.map((day, i) => {
              if (day === null) return <View key={`pad-${i}`} style={styles.cell} />;
              const disabled = day < min;
              const on = day === selected;
              const isToday = day === today;
              return (
                <View key={day} style={styles.cell}>
                  <Pressable
                    onPress={() => {
                      onPick(day);
                      onClose();
                    }}
                    disabled={disabled}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on, disabled }}
                    accessibilityLabel={formatDate(day, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    style={[styles.day, on && { backgroundColor: t.accent }, isToday && !on && { borderWidth: 1.5, borderColor: t.accent }]}>
                    <Txt variant="callout" color={on ? '#FFFFFF' : disabled ? t.textTertiary : t.text} style={[{ fontWeight: on || isToday ? '600' : '400' }, tabular]}>
                      {new Date(day).getDate()}
                    </Txt>
                  </Pressable>
                </View>
              );
            })}
          </View>

          <Pressable onPress={onClose} accessibilityRole="button" style={styles.cancel} hitSlop={6}>
            <Txt variant="body" color={t.accent}>
              Cancel
            </Txt>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  sheet: { width: '100%', maxWidth: 380, borderRadius: Radius.card + 4, padding: Spacing.four, gap: Spacing.two },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nav: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  day: { width: '86%', height: '86%', maxWidth: 44, maxHeight: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  cancel: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 },
});
