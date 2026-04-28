import { useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';

type Props = {
  text?: string;
  onComplete: () => void;
  disabled?: boolean;
};

export default function SlideToConfirm({
  text = '슬라이드하여 선택 완료',
  onComplete,
  disabled = false,
}: Props) {
  const [trackWidth, setTrackWidth] = useState(0);
  const knobSize = 52;
  const translateX = useRef(new Animated.Value(0)).current;

  const maxTranslate = Math.max(trackWidth - knobSize, 0);

  const reset = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 6,
    }).start();
  };

  const complete = () => {
    Animated.timing(translateX, {
      toValue: maxTranslate,
      duration: 120,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        onComplete();
        translateX.setValue(0);
      }
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => !disabled && trackWidth > 0,
      onPanResponderMove: (_, gestureState) => {
        const nextX = Math.max(0, Math.min(gestureState.dx, maxTranslate));
        translateX.setValue(nextX);
      },
      onPanResponderRelease: (_, gestureState) => {
        const shouldComplete = gestureState.dx >= maxTranslate * 0.75 || gestureState.vx > 1.2;

        if (shouldComplete) {
          complete();
        } else {
          reset();
        }
      },
      onPanResponderTerminate: reset,
    }),
  ).current;

  const handleTrackLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  const textOpacity = translateX.interpolate({
    inputRange: [0, maxTranslate * 0.5 || 1, maxTranslate || 1],
    outputRange: [1, 0.35, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.track, disabled && styles.trackDisabled]} onLayout={handleTrackLayout}>
      <Animated.Text style={[styles.label, { opacity: textOpacity }]}>{text}</Animated.Text>

      <Animated.View
        style={[styles.knob, disabled && styles.knobDisabled, { transform: [{ translateX }] }]}
        {...(!disabled ? panResponder.panHandlers : {})}
      >
        <Text style={styles.arrow}>→</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 56,
    borderRadius: 9999,
    backgroundColor: '#1F2329',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  trackDisabled: {
    opacity: 0.5,
  },
  label: {
    position: 'absolute',
    alignSelf: 'center',
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  knob: {
    width: 52,
    height: 52,
    borderRadius: 9999,
    backgroundColor: '#FFFFFF',
    marginLeft: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  knobDisabled: {
    backgroundColor: '#D0D4DA',
  },
  arrow: {
    fontSize: 20,
    fontWeight: '700',
  },
});
