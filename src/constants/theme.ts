import '@/global.css';

import { Platform } from 'react-native';

/**
 * LifeSplits palette: life is shown in neutrals, goals are the only color.
 */
export const Colors = {
  light: {
    text: '#1D1D1F',
    textSecondary: '#6E6E73',
    textTertiary: '#A1A1AA',
    background: '#F5F5F7',
    card: '#FFFFFF',
    fill: '#EEEEF0',
    fillStrong: '#E3E3E8',
    separator: '#E5E5EA',
    accent: '#C2410C',
    accentText: '#9A3412',
    accentSoft: '#FDEBDD',
    primary: '#1D1D1F',
    onPrimary: '#FFFFFF',
    insight: '#1D1D1F',
    onInsight: '#FFFFFF',
    positive: '#0F766E',
    sheetBackdrop: 'rgba(0,0,0,0.4)',
  },
  dark: {
    text: '#F5F5F7',
    textSecondary: '#A1A1AA',
    textTertiary: '#6E6E73',
    background: '#000000',
    card: '#1C1C1E',
    fill: '#2C2C2E',
    fillStrong: '#3A3A3C',
    separator: '#2C2C2E',
    accent: '#FB923C',
    accentText: '#FDBA74',
    accentSoft: '#3B1D0C',
    primary: '#F5F5F7',
    onPrimary: '#000000',
    insight: '#2C2C2E',
    onInsight: '#F5F5F7',
    positive: '#5EEAD4',
    sheetBackdrop: 'rgba(0,0,0,0.6)',
  },
} as const;

export type Palette = { [K in keyof typeof Colors.light]: string };

/** Goal colors — saturated, distinct in lightness so they can be told apart without hue. */
export const GoalColors = [
  { name: 'Orange', hex: '#C2410C' },
  { name: 'Blue', hex: '#2563EB' },
  { name: 'Teal', hex: '#0F766E' },
  { name: 'Violet', hex: '#7C3AED' },
  { name: 'Rose', hex: '#BE123C' },
  { name: 'Amber', hex: '#B45309' },
] as const;

export type LifeGroup = 'work' | 'routine' | 'leisure' | 'commute' | 'other';

/** Neutral shades for the non-goal parts of a day. */
export const LifeColors: Record<'light' | 'dark', Record<LifeGroup, string>> = {
  light: {
    work: '#3F3F46',
    routine: '#A1A1AA',
    leisure: '#93C5FD',
    commute: '#D4D4D8',
    other: '#E4E4E7',
  },
  dark: {
    work: '#D4D4D8',
    routine: '#71717A',
    leisure: '#60A5FA',
    commute: '#52525B',
    other: '#3F3F46',
  },
};

export const LifeGroupLabels: Record<LifeGroup, string> = {
  work: 'Work',
  routine: 'Routine',
  leisure: 'Leisure',
  commute: 'Commute',
  other: 'Other',
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 20,
  six: 24,
  eight: 32,
} as const;

export const Radius = {
  small: 8,
  medium: 12,
  card: 16,
  pill: 999,
} as const;

export const ScreenPadding = 20;
export const MaxContentWidth = 640;
