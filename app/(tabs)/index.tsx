import { ScrollView, StyleSheet } from 'react-native';

import Feed from '@/components/feed/Feed';
import { useTheme } from '@/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
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
