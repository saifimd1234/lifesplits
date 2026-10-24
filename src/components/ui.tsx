import type { ReactNode } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type ScrollViewProps,
  type StyleProp,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { Icon } from '@/components/icon';
import { MaxContentWidth, Radius, ScreenPadding, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppStore, type TipKey } from '@/store/app-store';

const TEXT = {
  largeTitle: { fontSize: 34, fontWeight: '700', letterSpacing: -0.6, lineHeight: 41 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3, lineHeight: 28 },
  headline: { fontSize: 17, fontWeight: '600', lineHeight: 22 },
  body: { fontSize: 17, lineHeight: 23 },
  callout: { fontSize: 15, lineHeight: 20 },
  subhead: { fontSize: 13, lineHeight: 18 },
  caption: { fontSize: 12, lineHeight: 16 },
  overline: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', lineHeight: 18 },
} as const;

export type TextVariant = keyof typeof TEXT;

export function Txt({
  variant = 'body',
  color,
  tone = 'primary',
  style,
  ...rest
}: TextProps & { variant?: TextVariant; color?: string; tone?: 'primary' | 'secondary' | 'tertiary' }) {
  const t = useTheme();
  const toneColor = tone === 'secondary' ? t.textSecondary : tone === 'tertiary' ? t.textTertiary : t.text;
  return <Text {...rest} style={[TEXT[variant], { color: color ?? toneColor }, style]} />;
}

/** Tabular numerals keep running timers from jittering. */
export const tabular = { fontVariant: ['tabular-nums' as const] };

export function Screen({
  children,
  header,
  bottomInset = 24,
  ...rest
}: ScrollViewProps & { children: ReactNode; header?: ReactNode; bottomInset?: number }) {
  const t = useTheme();
  return (
    <ScrollView
      {...rest}
      style={{ flex: 1, backgroundColor: t.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.screenContent}>
      <View style={[styles.column, { paddingBottom: bottomInset }]}>
        {header}
        {children}
      </View>
    </ScrollView>
  );
}

/** Large Apple-style title block used at the top of tab screens. */
export function LargeHeader({ overline, title, right }: { overline?: string; title: string; right?: ReactNode }) {
  const insets = useSafeAreaInsets();
  // iOS scroll views already inset content below the status bar (contentInsetAdjustmentBehavior).
  const top = Platform.OS === 'ios' ? 8 : insets.top + 12;
  return (
    <View style={[styles.largeHeader, { paddingTop: top }]}>
      <View style={{ flexShrink: 1 }}>
        {overline ? (
          <Txt variant="overline" tone="secondary">
            {overline}
          </Txt>
        ) : null}
        <Txt variant="largeTitle" accessibilityRole="header">
          {title}
        </Txt>
      </View>
      {right}
    </View>
  );
}

/** Cancel · title · action bar at the top of a modal sheet. */
export function SheetHeader({
  title,
  subtitle,
  onCancel,
  action,
  onAction,
  actionDisabled,
}: {
  title: string;
  subtitle?: string;
  onCancel: () => void;
  action: string;
  onAction: () => void;
  actionDisabled?: boolean;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.sheetHeader, { paddingTop: Platform.OS === 'ios' ? 12 : insets.top + 8, borderColor: t.separator }]}>
      <Pressable onPress={onCancel} accessibilityRole="button" hitSlop={10} style={styles.sheetButton}>
        <Txt variant="body" color={t.accent}>
          Cancel
        </Txt>
      </Pressable>
      <View style={{ alignItems: 'center', flexShrink: 1 }}>
        <Txt variant="headline" numberOfLines={1}>
          {title}
        </Txt>
        {subtitle ? (
          <Txt variant="caption" tone="secondary" style={tabular}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      <Pressable
        onPress={onAction}
        disabled={actionDisabled}
        accessibilityRole="button"
        hitSlop={10}
        style={[styles.sheetButton, { alignItems: 'flex-end', opacity: actionDisabled ? 0.4 : 1 }]}>
        <Txt variant="headline" color={t.accent}>
          {action}
        </Txt>
      </Pressable>
    </View>
  );
}

export function Card({ children, style, padded = true }: { children: ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }) {
  const t = useTheme();
  return <View style={[{ backgroundColor: t.card, borderRadius: Radius.card }, padded && { padding: Spacing.four }, style]}>{children}</View>;
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Txt variant="overline" tone="secondary" style={{ marginBottom: Spacing.two }}>
      {children}
    </Txt>
  );
}

export function Section({ label, children, style }: { label?: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ marginTop: Spacing.six }, style]}>
      {label ? <SectionLabel>{label}</SectionLabel> : null}
      {children}
    </View>
  );
}

export function Separator({ inset = 0 }: { inset?: number }) {
  const t = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.separator, marginLeft: inset }} />;
}

export function Chip({
  label,
  selected,
  onPress,
  onLongPress,
  dashed,
  dot,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  dashed?: boolean;
  dot?: string;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? t.primary : dashed ? 'transparent' : t.fill,
          borderColor: dashed ? t.textTertiary : 'transparent',
          borderStyle: dashed ? 'dashed' : 'solid',
          opacity: pressed ? 0.7 : 1,
        },
      ]}>
      {dot ? <View style={[styles.dot, { backgroundColor: dot }]} /> : null}
      <Txt variant="callout" color={selected ? t.onPrimary : dashed ? t.textSecondary : t.text} style={selected && { fontWeight: '600' }}>
        {label}
      </Txt>
    </Pressable>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  style,
  accessibilityLabel,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'plain';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const t = useTheme();
  const bg = variant === 'primary' ? t.primary : variant === 'secondary' ? t.fillStrong : 'transparent';
  const fg = variant === 'primary' ? t.onPrimary : variant === 'secondary' ? t.text : t.accent;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.button, { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 }, style]}>
      <Txt variant="headline" color={fg}>
        {label}
      </Txt>
    </Pressable>
  );
}

export function IconButton({ icon, onPress, label, ...rest }: PressableProps & { icon: Parameters<typeof Icon>[0]['name']; label: string }) {
  const t = useTheme();
  return (
    <Pressable
      {...rest}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [styles.iconButton, { backgroundColor: t.card, opacity: pressed ? 0.7 : 1 }]}>
      <Icon name={icon} color={t.text} size={20} />
    </Pressable>
  );
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const t = useTheme();
  return (
    <View accessibilityRole="tablist" style={[styles.segmented, { backgroundColor: t.fillStrong }]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, on && { backgroundColor: t.card, boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }]}>
            <Txt variant="callout" style={{ fontWeight: on ? '600' : '400', fontSize: 14 }}>
              {o.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Horizontal progress bar with an optional target marker (both 0–1). */
export function Bar({ fraction, color, height = 8, marker }: { fraction: number; color: string; height?: number; marker?: number }) {
  const t = useTheme();
  const f = Math.max(0, Math.min(1, fraction));
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: t.fill, justifyContent: 'center' }}>
      <View style={{ width: `${f * 100}%`, height, borderRadius: height / 2, backgroundColor: color }} />
      {marker !== undefined ? (
        <View style={{ position: 'absolute', left: `${Math.max(0, Math.min(1, marker)) * 100}%`, width: 2, height: height + 8, marginLeft: -1, backgroundColor: t.text }} />
      ) : null}
    </View>
  );
}

export function StackedBar({ parts, height = 12 }: { parts: { key: string; ms: number; color: string }[]; height?: number }) {
  const t = useTheme();
  const visible = parts.filter((p) => p.ms > 0);
  return (
    <View style={{ flexDirection: 'row', gap: 2, height, borderRadius: height / 2, overflow: 'hidden', backgroundColor: visible.length ? 'transparent' : t.fill }}>
      {visible.map((p) => (
        <View key={p.key} style={{ flexGrow: p.ms, flexBasis: 0, backgroundColor: p.color }} />
      ))}
    </View>
  );
}

export function Ring({ fraction, color, size = 56, stroke = 6, label }: { fraction: number; color: string; size?: number; stroke?: number; label?: string }) {
  const t = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const f = Math.max(0, Math.min(1, fraction));
  return (
    <Svg width={size} height={size} accessibilityLabel={label}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={t.fill} strokeWidth={stroke} fill="none" />
      {f > 0 ? (
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c * f} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      ) : null}
    </Svg>
  );
}

export function Dot({ color, size = 8 }: { color: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />;
}

/** One-time coach card that explains a part of the app; dismissed for good with ✕. */
export function Tip({ tipKey, title, body, style }: { tipKey: TipKey; title: string; body: string; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const seen = useAppStore((s) => !!s.seenTips[tipKey]);
  const dismiss = useAppStore((s) => s.dismissTip);
  if (seen) return null;
  return (
    <View style={[styles.tip, { backgroundColor: t.accentSoft }, style]}>
      <Icon name="bulb" color={t.accentText} size={20} />
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="headline" color={t.accentText} style={{ fontSize: 15 }}>
          {title}
        </Txt>
        <Txt variant="subhead" color={t.text}>
          {body}
        </Txt>
      </View>
      <Pressable onPress={() => dismiss(tipKey)} accessibilityRole="button" accessibilityLabel="Dismiss tip" hitSlop={10}>
        <Icon name="close" color={t.textSecondary} size={18} />
      </Pressable>
    </View>
  );
}

export function Insight({ text, footnote }: { text: string; footnote?: string }) {
  const t = useTheme();
  return (
    <View style={[styles.insight, { backgroundColor: t.insight }]}>
      <Icon name="bulb" color="#FDBA74" size={20} />
      <View style={{ flex: 1, gap: 4 }}>
        <Txt variant="callout" color={t.onInsight} style={{ fontWeight: '600' }}>
          {text}
        </Txt>
        {footnote ? (
          <Txt variant="caption" color="#A1A1AA">
            {footnote}
          </Txt>
        ) : null}
      </View>
    </View>
  );
}

export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <Card style={{ alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.eight }}>
      <Txt variant="headline">{title}</Txt>
      <Txt variant="callout" tone="secondary" style={{ textAlign: 'center' }}>
        {body}
      </Txt>
      {action}
    </Card>
  );
}

const styles = StyleSheet.create({
  screenContent: { flexGrow: 1, alignItems: 'center' },
  column: { width: '100%', maxWidth: MaxContentWidth, paddingHorizontal: ScreenPadding },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  sheetButton: { minWidth: 64, minHeight: 44, justifyContent: 'center' },
  largeHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: Spacing.four },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  button: { minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  segmented: { flexDirection: 'row', padding: 2, borderRadius: 10, gap: 2 },
  segment: { flex: 1, minHeight: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  tip: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: Radius.card, alignItems: 'flex-start' },
  insight: { flexDirection: 'row', gap: 12, padding: 16, borderRadius: Radius.card, alignItems: 'flex-start' },
});
