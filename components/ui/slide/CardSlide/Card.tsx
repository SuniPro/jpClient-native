import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { CardProps } from '@/components/ui/slide/CardSlide/type';
import { MediaLayerPreview } from '@/components/feed/edit/post/MediaLayerPreview';

export const Card = ({
  cardContents,
  size,
}: {
  cardContents: CardProps;
  size: { width: number; height: number };
}) => (
  <View style={[styles.container, size]}>
    <Image
      source={{ uri: cardContents.image }}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      cachePolicy="memory-disk"
      transition={0}
    />
    <MediaLayerPreview textLayers={cardContents.textLayers ?? []} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    flexShrink: 0,
    borderRadius: 25,
    overflow: 'hidden',
  },
});
