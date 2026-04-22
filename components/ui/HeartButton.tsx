import * as Haptics from 'expo-haptics';
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

const HEART_PATH =
  'M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z';

const BURST_COUNT = 8;
const BURST_RADIUS = 40;

type BurstParticleProps = {
  index: number;
  trigger: number;
  color: string;
};

function BurstParticle({ index, trigger, color }: BurstParticleProps) {
  const angle = (index / BURST_COUNT) * 2 * Math.PI;
  const tx = Math.cos(angle) * BURST_RADIUS;
  const ty = Math.sin(angle) * BURST_RADIUS;

  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  React.useEffect(() => {
    if (trigger === 0) return;
    scale.value = 0;
    opacity.value = 1;
    translateX.value = 0;
    translateY.value = 0;

    scale.value = withSequence(withSpring(1, { damping: 6 }), withTiming(0, { duration: 200 }));
    opacity.value = withTiming(0, { duration: 500 });
    translateX.value = withTiming(tx, { duration: 500 });
    translateY.value = withTiming(ty, { duration: 500 });
  }, [trigger]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.particle, { backgroundColor: color }, style]} />;
}

type HeartButtonProps = {
  initialLiked?: boolean;
  onToggle?: (liked: boolean) => void;
};

export default function HeartButton({ initialLiked = false, onToggle }: HeartButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [burstTrigger, setBurstTrigger] = useState(0);

  const scale = useSharedValue(1);

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    const next = !liked;
    setLiked(next);
    onToggle?.(next);

    if (next) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setBurstTrigger((t) => t + 1);
      scale.value = withSequence(
        withSpring(1.4, { damping: 4, stiffness: 300 }),
        withSpring(1, { damping: 6 }),
      );
    } else {
      scale.value = withSpring(1, { damping: 6 });
    }
  }, [liked, onToggle, scale]);

  const heartColor = liked ? '#ff3b5c' : '#8a8a8e';
  const particleColors = ['#ff3b5c', '#ff9f0a', '#30d158', '#0a84ff'];

  return (
    <View style={styles.container}>
      {/* burst particles */}
      {Array.from({ length: BURST_COUNT }).map((_, i) => (
        <BurstParticle
          key={i}
          index={i}
          trigger={burstTrigger}
          color={particleColors[i % particleColors.length]}
        />
      ))}

      <Pressable onPress={handlePress} hitSlop={12}>
        <Animated.View style={heartStyle}>
          <Svg width={28} height={28} viewBox="0 0 24 24">
            <Path d={HEART_PATH} fill={heartColor} />
          </Svg>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
