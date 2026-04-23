import { useTheme } from '@/theme';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

type LikeButtonProps = {
  width?: number;
  height?: number;
  initialLiked?: boolean;
  disabled?: boolean;
  onChangeLiked?: (liked: boolean) => void;
};

type DotConfig = {
  angle: number;
  distance: number;
  size: number;
  color: string;
};

const HEART_PATH =
  'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z';

export default function LikeButton({
  width = 40,
  height = 40,
  initialLiked = false,
  disabled = false,
  onChangeLiked,
}: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);

  const theme = useTheme();

  const size = Math.min(width, height);
  const iconSize = size * 0.72;
  const baseDotSize = Math.max(4, size * 0.1);

  const scale = useSharedValue(1);
  const heartProgress = useSharedValue(initialLiked ? 1 : 0);
  const burstProgress = useSharedValue(0);

  const outerDots = useMemo<DotConfig[]>(
    () => [
      { angle: -90, distance: size * 0.85, size: baseDotSize * 1.0, color: '#F56565' },
      { angle: -42, distance: size * 0.9, size: baseDotSize * 1.1, color: '#F6AD55' },
      { angle: 6, distance: size * 0.82, size: baseDotSize * 0.95, color: '#F6E05E' },
      { angle: 54, distance: size * 0.9, size: baseDotSize * 1.05, color: '#68D391' },
      { angle: 102, distance: size * 0.86, size: baseDotSize * 1.0, color: '#63B3ED' },
      { angle: 150, distance: size * 0.9, size: baseDotSize * 1.1, color: '#B794F4' },
      { angle: 198, distance: size * 0.82, size: baseDotSize * 0.95, color: '#F687B3' },
    ],
    [baseDotSize, size],
  );

  const innerDots = useMemo<DotConfig[]>(
    () => [
      { angle: -66, distance: size * 0.58, size: baseDotSize * 0.72, color: '#FFFFFF' },
      { angle: -14, distance: size * 0.54, size: baseDotSize * 0.68, color: '#F56565' },
      { angle: 34, distance: size * 0.56, size: baseDotSize * 0.7, color: '#FFFFFF' },
      { angle: 82, distance: size * 0.55, size: baseDotSize * 0.72, color: '#63B3ED' },
      { angle: 130, distance: size * 0.54, size: baseDotSize * 0.68, color: '#FFFFFF' },
      { angle: 178, distance: size * 0.57, size: baseDotSize * 0.7, color: '#F687B3' },
      { angle: 226, distance: size * 0.55, size: baseDotSize * 0.72, color: '#FFFFFF' },
    ],
    [baseDotSize, size],
  );

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const heartAnimatedProps = useAnimatedProps(() => {
    const stroke = interpolateColor(
      heartProgress.value,
      [0, 1],
      [theme.colors.iconDefault, '#E2264D'],
    );

    const fill = interpolateColor(
      heartProgress.value,
      [0, 0.15, 1],
      ['rgba(0,0,0,0)', 'rgba(226,38,77,0.15)', '#E2264D'],
    );

    return {
      stroke,
      fill,
    };
  });

  const handlePress = () => {
    if (disabled) return;

    const nextLiked = !liked;
    setLiked(nextLiked);
    onChangeLiked?.(nextLiked);

    if (nextLiked) {
      heartProgress.value = withTiming(1, {
        duration: 220,
        easing: Easing.out(Easing.ease),
      });

      scale.value = withSequence(
        withTiming(0.78, {
          duration: 110,
          easing: Easing.out(Easing.quad),
        }),
        withTiming(1.16, {
          duration: 180,
          easing: Easing.out(Easing.back(2.4)),
        }),
        withTiming(1, {
          duration: 150,
          easing: Easing.out(Easing.ease),
        }),
      );

      burstProgress.value = 0;
      burstProgress.value = withTiming(1, {
        duration: 650,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      heartProgress.value = withTiming(0, {
        duration: 180,
        easing: Easing.out(Easing.ease),
      });

      scale.value = withSequence(
        withTiming(0.92, {
          duration: 80,
          easing: Easing.out(Easing.quad),
        }),
        withTiming(1, {
          duration: 120,
          easing: Easing.out(Easing.ease),
        }),
      );

      burstProgress.value = 0;
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={liked ? '좋아요 취소' : '좋아요'}
      accessibilityState={{ disabled, selected: liked }}
      disabled={disabled}
      onPress={handlePress}
      style={[
        styles.pressable,
        {
          width,
          height,
        },
      ]}
    >
      <Animated.View
        style={[styles.center, styles.absoluteFill, containerAnimatedStyle]}
        pointerEvents="none"
      >
        <BurstLayer dots={outerDots} progress={burstProgress} centerSize={size} />
        <BurstLayer dots={innerDots} progress={burstProgress} centerSize={size} />

        <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
          <AnimatedPath
            animatedProps={heartAnimatedProps}
            d={HEART_PATH}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>
    </Pressable>
  );
}

function BurstLayer({
  dots,
  progress,
  centerSize,
}: {
  dots: DotConfig[];
  progress: SharedValue<number>;
  centerSize: number;
}) {
  return (
    <View pointerEvents="none" style={styles.absoluteFill}>
      {dots.map((dot, index) => (
        <BurstDot
          key={`${dot.angle}-${index}`}
          dot={dot}
          progress={progress}
          centerSize={centerSize}
        />
      ))}
    </View>
  );
}

function BurstDot({
  dot,
  progress,
  centerSize,
}: {
  dot: DotConfig;
  progress: SharedValue<number>;
  centerSize: number;
}) {
  const radians = (dot.angle * Math.PI) / 180;

  const animatedStyle = useAnimatedStyle(() => {
    const x = Math.cos(radians) * dot.distance * progress.value;
    const y = Math.sin(radians) * dot.distance * progress.value;

    const opacity = interpolate(progress.value, [0, 0.12, 0.75, 1], [0, 1, 0.92, 0]);
    const scale = interpolate(progress.value, [0, 0.18, 1], [0.2, 1, 0.65]);

    return {
      opacity,
      transform: [{ translateX: x }, { translateY: y }, { scale }],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.dot,
        animatedStyle,
        {
          width: dot.size,
          height: dot.size,
          borderRadius: dot.size / 2,
          backgroundColor: dot.color,
          left: centerSize / 2 - dot.size / 2,
          top: centerSize / 2 - dot.size / 2,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  pressable: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  absoluteFill: {
    position: 'absolute',
    inset: 0,
  },
  dot: {
    position: 'absolute',
  },
});
