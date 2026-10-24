import { StyleSheet, View } from 'react-native';

import { Bar, Card, Insight, Section, tabular, Txt } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { moodFor } from '@/lib/ratings';
import { feelings, type Rating } from '@/lib/stats';
import { useAppStore } from '@/store/app-store';

const ROWS: { key: Rating; label: string }[] = [
  { key: 'energy', label: 'Energy' },
  { key: 'focus', label: 'Focus' },
  { key: 'mood', label: 'Mood' },
];

/** Energy, focus and mood for laps in [start, end), with the patterns behind them. */
export function Feelings({ start, end }: { start: number; end: number }) {
  const t = useTheme();
  const laps = useAppStore((s) => s.laps);
  const categories = useAppStore((s) => s.categories);
  const f = feelings(laps, categories, start, end);

  if (f.rated === 0) {
    return (
      <Section label="How you felt">
        <Card>
          <Txt variant="callout" tone="secondary">
            Rate energy, focus and mood when you label a lap, and you’ll see how each activity and time of day treats you here.
          </Txt>
        </Card>
      </Section>
    );
  }

  const parts = f.byTimeOfDay.filter((p) => p.energy.avg !== null);

  return (
    <Section label="How you felt">
      <Card style={{ gap: Spacing.four }}>
        {ROWS.map(({ key, label }) => {
          const { avg, n } = f.avg[key];
          const mood = key === 'mood' && avg !== null ? moodFor(avg) : null;
          return (
            <View key={key} style={{ gap: 8 }}>
              <View style={styles.between}>
                <Txt variant="callout" style={{ fontWeight: '500' }}>
                  {label}
                </Txt>
                {avg === null ? (
                  <Txt variant="callout" tone="tertiary">
                    Not rated
                  </Txt>
                ) : (
                  <Txt variant="callout" style={tabular}>
                    {mood ? `${mood.emoji} ${mood.label} · ` : ''}
                    <Txt variant="callout" style={{ fontWeight: '600' }}>
                      {avg.toFixed(1)}
                    </Txt>
                    <Txt variant="callout" tone="secondary">
                      {' '}
                      / 5 · {n} {n === 1 ? 'lap' : 'laps'}
                    </Txt>
                  </Txt>
                )}
              </View>
              <Bar fraction={avg === null ? 0 : avg / 5} color={t.accent} />
            </View>
          );
        })}

        {parts.length >= 2 ? (
          <View style={{ gap: Spacing.two }}>
            <Txt variant="caption" tone="secondary">
              Energy by time of day
            </Txt>
            <View style={styles.parts}>
              {f.byTimeOfDay.map((p) => (
                <View key={p.label} style={[styles.part, { backgroundColor: t.fill }]}>
                  <Txt variant="caption" tone="secondary">
                    {p.label}
                  </Txt>
                  <Txt variant="headline" style={tabular} tone={p.energy.avg === null ? 'tertiary' : 'primary'}>
                    {p.energy.avg === null ? '–' : p.energy.avg.toFixed(1)}
                  </Txt>
                  {p.mood.avg !== null ? <Txt variant="caption">{moodFor(p.mood.avg).emoji}</Txt> : null}
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </Card>

      {f.insights.length ? (
        <View style={{ gap: Spacing.three, marginTop: Spacing.three }}>
          {f.insights.map((text) => (
            <Insight key={text} text={text} footnote={`From ${f.rated} rated laps`} />
          ))}
        </View>
      ) : null}
    </Section>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  parts: { flexDirection: 'row', gap: Spacing.two },
  part: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: Spacing.three, borderRadius: 12 },
});
