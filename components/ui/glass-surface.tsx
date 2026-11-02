import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface GlassButtonProps {
  children: ReactNode;
  onPress?: () => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function GlassButton({ children, onPress, size = 52, style }: GlassButtonProps) {
  const colorScheme = useColorScheme();

  const isDark = colorScheme === 'dark';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        void Haptics.selectionAsync().catch(() => {});
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: isDark ? 'rgba(0,0,0,0.92)' : 'rgba(255,255,255,0.92)',
          borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
});
