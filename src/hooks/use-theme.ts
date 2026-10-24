import { Colors, LifeColors, type Palette } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useThemeName(): 'light' | 'dark' {
  return useColorScheme() === 'dark' ? 'dark' : 'light';
}

export function useTheme(): Palette {
  return Colors[useThemeName()];
}

export function useLifeColors() {
  return LifeColors[useThemeName()];
}
