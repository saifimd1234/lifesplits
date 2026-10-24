import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';

/** In-app copy of the mark from assets/brand/mark.mjs, drawn as the app icon tile. */
export function Logo({ size = 96, tile = true }: { size?: number; tile?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024" accessibilityLabel="LifeSplits">
      {tile && <Rect width={1024} height={1024} rx={230} fill="#141416" />}
      <G transform="translate(0 36)">
        <Path d="M 542.31 223.59 A 290 290 0 0 1 793.39 582.16" fill="none" stroke="#F26B1D" strokeWidth={92} />
        <Path d="M 772.65 639.13 A 290 290 0 0 1 384.87 772.65" fill="none" stroke="#F5F5F7" strokeWidth={92} />
        <Path d="M 333.46 740.52 A 290 290 0 0 1 228.34 451.71" fill="none" stroke="#8E8E93" strokeWidth={92} />
        <Path d="M 247.07 394.05 A 290 290 0 0 1 481.69 223.59" fill="none" stroke="#48484A" strokeWidth={92} />
        <Rect x={462} y={92} width={100} height={54} rx={16} fill="#F5F5F7" />
        <Rect x={494} y={140} width={36} height={40} fill="#F5F5F7" />
        <Line x1={512} y1={512} x2={696.36} y2={557.97} stroke="#F26B1D" strokeWidth={40} strokeLinecap="round" />
        <Circle cx={512} cy={512} r={34} fill="#F5F5F7" />
      </G>
    </Svg>
  );
}
