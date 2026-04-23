import { useTheme } from '@/theme';
import { ReactNode, useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { AppText } from '../../Text';

import { ChevronDown, ChevronUp } from '@/assets/icons/icon';
import { ThemedView } from '../../themed-view';

export function FeedCollapsible({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const theme = useTheme();

  return (
    <ThemedView>
      <TouchableOpacity
        style={styles.heading}
        onPress={() => setIsOpen((value) => !value)}
        activeOpacity={0.8}
      >
        <AppText allowFontScaling variant="body2" color="secondary">
          내용보기
        </AppText>
        {isOpen ? (
          <ChevronUp width={10} height={10} color={theme.colors.textSecondary} />
        ) : (
          <ChevronDown width={10} height={10} color={theme.colors.textSecondary} />
        )}
      </TouchableOpacity>
      {isOpen && <ThemedView style={styles.content}>{children}</ThemedView>}
    </ThemedView>
  );
}
const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  content: {
    paddingTop: 6,
  },
});
