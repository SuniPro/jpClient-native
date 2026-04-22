import { ScrollView, StyleSheet } from 'react-native';

import Feed from '@/components/feed/Feed';
import { useTheme } from '@/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TabTwoScreen() {
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
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
});
