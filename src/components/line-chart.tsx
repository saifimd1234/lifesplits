import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { Dot, tabular, Txt } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type Series = {
  key: string;
  label: string;
  color: string;
  /** One value per x label; null leaves a gap (no data that day). */
  values: (number | null)[];
  dashed?: boolean;
};

const PAD_LEFT = 34;
const PAD_RIGHT = 10;
const PAD_TOP = 10;
const PAD_BOTTOM = 22;

/** Smallest "nice" axis maximum (1, 2, 2.5, 5 × 10ⁿ) at or above `v`. */
function niceMax(v: number): number {
  if (v <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * mag >= v)!;
  return step * mag;
}

/** Multi-series line chart. Tap anywhere on it to read the exact values for that point. */
export function LineChart({
  series,
  labels,
  titles = labels,
  height = 170,
  format,
  axisFormat = format,
}: {
  series: Series[];
  labels: string[];
  /** Longer name for each point, shown when it is tapped. */
  titles?: string[];
  height?: number;
  format: (v: number) => string;
  axisFormat?: (v: number) => string;
}) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const n = labels.length;
  const max = niceMax(Math.max(0, ...series.flatMap((s) => s.values.filter((v): v is number => v !== null))));
  const plotW = Math.max(0, width - PAD_LEFT - PAD_RIGHT);
  const plotH = height - PAD_TOP - PAD_BOTTOM;
  const x = (i: number) => PAD_LEFT + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => PAD_TOP + plotH - (v / max) * plotH;
  const labelEvery = Math.max(1, Math.ceil(n / 7));
  const sel = picked !== null && picked < n ? picked : null;

  const path = (values: (number | null)[]) => {
    let d = '';
    let pen = false;
    values.forEach((v, i) => {
      if (v === null) {
        pen = false;
        return;
      }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
      pen = true;
    });
    return d;
  };

  const onPress = (lx: number) => {
    if (n === 0 || plotW <= 0) return;
    const i = Math.round(((lx - PAD_LEFT) / plotW) * (n - 1));
    const clamped = Math.max(0, Math.min(n - 1, i));
    setPicked(clamped === sel ? null : clamped);
  };

  return (
    <View style={{ gap: Spacing.three }}>
      {/* Responder events carry locationX on every platform; Pressable's press event doesn't on web. */}
      <View
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onResponderRelease={(e) => onPress(e.nativeEvent.locationX)}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Line chart. Tap a point to see its values."
        style={{ height }}>
        {width > 0 ? (
          <Svg width={width} height={height}>
            {[0, 0.5, 1].map((f) => (
              <Line key={f} x1={PAD_LEFT} x2={width - PAD_RIGHT} y1={y(max * f)} y2={y(max * f)} stroke={t.separator} strokeWidth={1} />
            ))}
            {[0, 0.5, 1].map((f) => (
              <SvgText key={f} x={PAD_LEFT - 6} y={y(max * f) + 3.5} fontSize={10} fill={t.textSecondary} textAnchor="end">
                {axisFormat(max * f)}
              </SvgText>
            ))}
            {labels.map((l, i) =>
              i % labelEvery === 0 || i === n - 1 ? (
                <SvgText key={i} x={x(i)} y={height - 6} fontSize={10} fill={i === sel ? t.text : t.textSecondary} fontWeight={i === sel ? '600' : '400'} textAnchor={i === n - 1 && n > 1 ? 'end' : 'middle'}>
                  {l}
                </SvgText>
              ) : null,
            )}
            {sel !== null ? <Line x1={x(sel)} x2={x(sel)} y1={PAD_TOP} y2={PAD_TOP + plotH} stroke={t.textTertiary} strokeWidth={1} /> : null}
            {series.map((s) => (
              <Path
                key={s.key}
                d={path(s.values)}
                stroke={s.color}
                strokeWidth={s.dashed ? 2 : 2.5}
                strokeDasharray={s.dashed ? '5 4' : undefined}
                strokeLinejoin="round"
                strokeLinecap="round"
                fill="none"
              />
            ))}
            {series.map((s) => {
              // Mark the picked point, or the latest value when nothing is picked.
              const i = sel ?? s.values.map((v, j) => (v === null ? -1 : j)).reduce((a, b) => Math.max(a, b), -1);
              const v = i >= 0 ? s.values[i] : null;
              return v !== null && v !== undefined ? <Circle key={s.key} cx={x(i)} cy={y(v)} r={4} fill={s.color} stroke={t.card} strokeWidth={2} /> : null;
            })}
          </Svg>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: Spacing.four, rowGap: 6 }}>
        {sel !== null ? (
          <Txt variant="caption" tone="secondary" style={{ width: '100%' }}>
            {titles[sel]}
          </Txt>
        ) : null}
        {series.map((s) => {
          const v = sel !== null ? s.values[sel] : null;
          return (
            <View key={s.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {s.dashed ? <View style={{ width: 12, height: 0, borderTopWidth: 2, borderStyle: 'dashed', borderColor: s.color }} /> : <Dot color={s.color} />}
              <Txt variant="caption">{s.label}</Txt>
              {sel !== null ? (
                <Txt variant="caption" style={[{ fontWeight: '600' }, tabular]}>
                  {v === null || v === undefined ? '—' : format(v)}
                </Txt>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}
