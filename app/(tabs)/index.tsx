import { ScrollView, StyleSheet, View } from 'react-native';

import { SelectedRegion } from '@/components/globe/types';
import { getSelectedRegion } from '@/storage/regionStorage';
import { useTheme } from '@/theme';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CardSlide } from '@/components/ui/slide/CardSlide/CardSlide';
import { AppText } from '@/components/Text';
import { CardProps } from '@/components/ui/slide/CardSlide/type';
import { Button, Card } from 'heroui-native';
import { Ionicons } from '@expo/vector-icons';

const COLLECTION_CONTENTS: CardProps[] = [
  {
    id: '1',
    image: 'https://picsum.photos/800/400?1',
  },
  {
    id: '2',
    image: 'https://picsum.photos/800/400?2',
  },
  {
    id: '3',
    image: 'https://picsum.photos/800/400?3',
  },
  {
    id: '4',
    image: 'https://picsum.photos/800/400?4',
  },
  {
    id: '5',
    image: 'https://picsum.photos/800/400?5',
  },
];

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
        <CardExample />
        <CardSlide imageAssets={COLLECTION_CONTENTS} />
      </ScrollView>
    </SafeAreaView>
  );
}

export function CardExample() {
  return (
    <Card>
      <View className="gap-4">
        <Card.Body className="mb-4">
          <View className="gap-1 mb-2">
            <Card.Title className="text-pink-500">$450</Card.Title>
            <Card.Title>Living room Sofa • Collection 2025</Card.Title>
          </View>
          <Card.Description>
            This sofa is perfect for modern tropical spaces, baroque inspired spaces.
          </Card.Description>
        </Card.Body>
        <Card.Footer className="gap-3">
          <Button variant="primary">Buy now</Button>
          <Button variant="ghost">
            <Button.Label>Add to cart</Button.Label>
            <Ionicons name="bag-outline" size={16} />
          </Button>
        </Card.Footer>
      </View>
    </Card>
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
