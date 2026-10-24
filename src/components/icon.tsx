import Svg, { Circle, Path } from 'react-native-svg';

export type IconName =
  | 'plus'
  | 'minus'
  | 'chevron-right'
  | 'chevron-left'
  | 'close'
  | 'check'
  | 'gear'
  | 'bulb'
  | 'stopwatch'
  | 'target'
  | 'chart'
  | 'pencil';

/** Small stroke icon set so both platforms look identical. */
export function Icon({ name, size = 22, color, strokeWidth = 1.9 }: { name: IconName; size?: number; color: string; strokeWidth?: number }) {
  const common = { fill: 'none', stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {name === 'plus' && <Path d="M12 5v14M5 12h14" {...common} />}
      {name === 'minus' && <Path d="M5 12h14" {...common} />}
      {name === 'chevron-right' && <Path d="M9 18l6-6-6-6" {...common} />}
      {name === 'chevron-left' && <Path d="M15 18l-6-6 6-6" {...common} />}
      {name === 'close' && <Path d="M6 6l12 12M18 6L6 18" {...common} />}
      {name === 'check' && <Path d="M5 12.5l4.5 4.5L19 7.5" {...common} />}
      {name === 'pencil' && <Path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" {...common} />}
      {name === 'gear' && (
        <>
          <Circle cx={12} cy={12} r={3} {...common} />
          <Path
            d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"
            {...common}
          />
        </>
      )}
      {name === 'bulb' && <Path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1.1 2V16h5v-.2c.1-.8.5-1.5 1.1-2A6 6 0 0 0 12 3z" {...common} />}
      {name === 'stopwatch' && (
        <>
          <Circle cx={12} cy={13} r={8} {...common} />
          <Path d="M12 9v4l2.5 2.5M10 2h4" {...common} />
        </>
      )}
      {name === 'target' && (
        <>
          <Circle cx={12} cy={12} r={9} {...common} />
          <Circle cx={12} cy={12} r={5} {...common} />
          <Circle cx={12} cy={12} r={1} {...common} />
        </>
      )}
      {name === 'chart' && <Path d="M5 20v-6M12 20V5M19 20v-10" {...common} />}
    </Svg>
  );
}
