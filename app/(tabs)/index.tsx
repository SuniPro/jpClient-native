import { ScrollView, StyleSheet } from 'react-native';

import Feed from '@/components/feed/Feed';
import { SelectedRegion } from '@/components/globe/types';
import { getSelectedRegion } from '@/storage/regionStorage';
import { useTheme } from '@/theme';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const [region, setRegion] = useState<SelectedRegion | null>(null);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      getSelectedRegion().then((value) => {
        if (mounted) {
          setRegion(value);
        }
      });

      return () => {
        mounted = false;
      };
    }, []),
  );

  const theme = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.backgroundPrimary }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: 20, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <Feed></Feed>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
