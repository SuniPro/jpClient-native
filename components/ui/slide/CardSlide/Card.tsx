import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { CardProps } from '@/components/ui/slide/CardSlide/type';

export const Card = ({
  cardContents,
  size,
}: {
  cardContents: CardProps;
  size: { width: number; height: number };
}) => (
  <View style={styles.container}>
    <Image
      source={{ uri: cardContents.image }}
      style={[styles.image, size]}
      contentFit="cover"
      cachePolicy="memory-disk"
      transition={0}
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    flexShrink: 0,
    borderRadius: 25,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
