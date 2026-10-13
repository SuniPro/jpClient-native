import Svg, { Circle, Line, Path, Polyline } from 'react-native-svg';

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

export function Comment({ width, height, color }: IconProps) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" />
    </Svg>
  );
}

export function Send({ width, height, color }: IconProps) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
      <Path d="m21.854 2.147-10.94 10.939" />
    </Svg>
  );
}

export function Route({ width, height, color }: IconProps) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Circle cx="6" cy="19" r="3" />
      <Path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
      <Circle cx="18" cy="5" r="3" />
    </Svg>
  );
}

export function Compass({ width, height, color }: IconProps) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Circle cx="12" cy="12" r="10" />
      <Path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z" />
    </Svg>
  );
}

export function Write({ width, height, color }: IconProps) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <Path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
    </Svg>
  );
}

export function Home({ width, height, color }: IconProps) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
      <Path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </Svg>
  );
}

export function CircleCancel({ width, height, color }: IconProps) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <Circle cx="12" cy="12" r="10" />
      <Path d="m15 9-6 6" />
      <Path d="m9 9 6 6" />
    </Svg>
  );
}

export function HighWriter({ width, height, color }: IconProps) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <Path d="m9 11-6 6v3h9l3-3" />
      <Path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" />
    </Svg>
  );
}

export function LocateFixed({ width, height, color }: IconProps) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <Line x1="2" x2="5" y1="12" y2="12" />
      <Line x1="19" x2="22" y1="12" y2="12" />
      <Line x1="12" x2="12" y1="2" y2="5" />
      <Line x1="12" x2="12" y1="19" y2="22" />
      <Circle cx="12" cy="12" r="7" />
      <Circle cx="12" cy="12" r="3" />
    </Svg>
  );
}

export function Return({ width, height, color }: IconProps) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <Path d="M9 14 4 9l5-5" />
      <Path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11" />
    </Svg>
  );
}

export function ArrowRight({ width, height, color }: IconProps) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <Path d="M5 12h14" />
      <Path d="m12 5 7 7-7 7" />
    </Svg>
  );
}

export function Thermometer({ width, height, color }: IconProps) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <Path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" />
    </Svg>
  );
}

export function SmilePlus({ width, height, color }: IconProps) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <Path d="M22 11v1a10 10 0 1 1-9-10" />
      <Path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <Line x1="9" x2="9.01" y1="9" y2="9" />
      <Line x1="15" x2="15.01" y1="9" y2="9" />
      <Path d="M16 5h6" />
      <Path d="M19 2v6" />
    </Svg>
  );
}

export function Font({ width, height, color }: IconProps) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <Path d="m15 16 2.536-7.328a1.02 1.02 1 0 1 1.928 0L22 16" />
      <Path d="M15.697 14h5.606" />
      <Path d="m2 16 4.039-9.69a.5.5 0 0 1 .923 0L11 16" />
      <Path d="M3.304 13h6.392" />
    </Svg>
  );
}

export function Palette({ width, height, color }: IconProps) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <Path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z" />
      <Circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <Circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <Circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <Circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
    </Svg>
  );
}

export function TextAlignCenter({ width, height, color }: IconProps) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <Path d="M21 5H3" />
      <Path d="M17 12H7" />
      <Path d="M19 19H5" />
    </Svg>
  );
}

export function TextAlignRight({ width, height, color }: IconProps) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <Path d="M21 5H3" />
      <Path d="M21 12H9" />
      <Path d="M21 19H7" />
    </Svg>
  );
}

export function TextAlignJustify({ width, height, color }: IconProps) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <Path d="M3 5h18" />
      <Path d="M3 12h18" />
      <Path d="M3 19h18" />
    </Svg>
  );
}

export function TextAlignLeft({ width, height, color }: IconProps) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <Path d="M21 5H3" />
      <Path d="M15 12H3" />
      <Path d="M17 19H3" />
    </Svg>
  );
}

export function FontSize({ width, height, color }: IconProps) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <Path d="m14 11 4-4 4 4" />
      <Path d="M18 16V7" />
      <Path d="m2 16 4.039-9.69a.5.5 0 0 1 .923 0L11 16" />
      <Path d="M3.304 13h6.392" />
    </Svg>
  );
}

export function Trash({ width, height, color }: IconProps) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <Path d="M10 11v6" />
      <Path d="M14 11v6" />
      <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <Path d="M3 6h18" />
      <Path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </Svg>
  );
}

export function Sticker({ width, height, color }: IconProps) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <Path d="M21 9a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 15 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z" />
      <Path d="M15 3v5a1 1 0 0 0 1 1h5" />
      <Path d="M8 13h.01" />
      <Path d="M16 13h.01" />
      <Path d="M10 16s.8 1 2 1c1.3 0 2-1 2-1" />
    </Svg>
  );
}

export function Save({ width, height, color }: IconProps) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <Path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <Path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
      <Path d="M7 3v4a1 1 0 0 0 1 1h7" />
    </Svg>
  );
}

export function Typography({ width, height, color }: IconProps) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <Path d="M12 4v16" />
      <Path d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2" />
      <Path d="M9 20h6" />
    </Svg>
  );
}
