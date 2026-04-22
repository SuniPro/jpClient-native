import Svg, { Polyline } from 'react-native-svg';

export type IconProps = {
  width: number;
  height: number;
  color: string;
};

export function ChevronDown({ width = 24, height = 24, color = '#111111' }: IconProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Polyline
        points="6 9 12 15 18 9"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ChevronUp({ width, height, color }: IconProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Polyline
        points="18 15 12 9 6 15"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
