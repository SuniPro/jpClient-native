import React, { useEffect, useState } from 'react';
import { View, Pressable, StyleSheet, type LayoutChangeEvent } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const TAB_HEIGHT = 68;

export function LiquidGlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const colorScheme = useColorScheme();
  const mode = colorScheme === 'dark' ? 'dark' : 'light';

  const [rowWidth, setRowWidth] = useState(0);

  const translateX = useSharedValue(0);
  const scaleX = useSharedValue(1);

  const onTabsLayout = (event: LayoutChangeEvent) => {
    setRowWidth(event.nativeEvent.layout.width);
  };

  useEffect(() => {
    if (!rowWidth) return;

    const count = state.routes.length;
    const cellWidth = (rowWidth - 12) / count;

    // 기존 물방울 위치 계산 유지
    const targetX = 6 + cellWidth * (state.index + 0.5) - 30;

    translateX.value = withSpring(targetX, {
      damping: 17,
      stiffness: 180,
      mass: 0.75,
    });

    scaleX.value = withSequence(
      withTiming(1.3, { duration: 130 }),
      withSpring(1, {
        damping: 12,
        stiffness: 180,
      }),
    );
  }, [state.index, state.routes.length, rowWidth, translateX, scaleX]);

  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { scaleX: scaleX.value }],
  }));

  const onTabPress = (route: (typeof state.routes)[number], focused: boolean) => {
    void Haptics.selectionAsync().catch(() => {});

    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!focused && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  };

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.position,
        {
          bottom: Math.max(insets.bottom, 12),
        },
      ]}
    >
      <View
        style={[
          styles.glassContainer,
          {
            backgroundColor: mode === 'dark' ? 'rgba(0,0,0,0.92)' : 'rgba(255,255,255,0.92)',
            borderColor: mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
          },
        ]}
      >
        <View style={styles.tabsRow} onLayout={onTabsLayout}>
          {/* 움직이는 물방울 */}
          {rowWidth > 0 && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.liquidBubble,
                bubbleStyle,
                {
                  backgroundColor: theme.colors.textAccent,
                },
              ]}
            />
          )}

          {/* 기존 탭 5개 */}
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];

            const focused = state.index === index;

            const color = focused ? theme.colors.textAccent : theme.colors.iconDefault;

            const icon = options.tabBarIcon?.({
              focused,
              color,
              size: 22,
            });

            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityState={{
                  selected: focused,
                }}
                accessibilityLabel={options.tabBarAccessibilityLabel ?? options.title ?? route.name}
                testID={options.tabBarButtonTestID}
                onPress={() => onTabPress(route, focused)}
                onLongPress={() =>
                  navigation.emit({
                    type: 'tabLongPress',
                    target: route.key,
                  })
                }
                style={styles.tabButton}
              >
                <View style={styles.iconContainer}>{icon}</View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  position: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 100,
    elevation: 20,
  },

  glassContainer: {
    height: TAB_HEIGHT,
    borderRadius: 42,
    overflow: 'hidden',
    borderWidth: 1,
  },

  tabsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
  },

  tabButton: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconContainer: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },

  liquidBubble: {
    position: 'absolute',
    top: 9,
    left: 0,
    width: 60,
    height: 50,
    borderRadius: 25,
  },
});
