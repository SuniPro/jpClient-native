import { StyleSheet } from 'react-native';

import GlobeWebView from '@/components/globe/GlobeWebView';
import { useTheme } from '@/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TabTwoScreen() {
  const theme = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }}>
      <GlobeWebView></GlobeWebView>
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
