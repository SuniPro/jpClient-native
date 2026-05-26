import { Ref } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import {
  CARD_HEIGHT_OF_CARD_SLIDE,
  CARD_WIDTH_OF_CARD_SLIDE,
} from '@/components/ui/slide/CardSlide/CardSlide';

export interface CardProps {
  image: string;
}

export const Card = ({
  ref,
  cardContents,
}: {
  ref: Ref<View>;
  cardContents: CardProps;
  isWhite?: boolean;
}) => (
  <View ref={ref} style={styles.container}>
    <Image
      source={{ uri: cardContents.image }}
      style={styles.image}
      contentFit="cover"
      cachePolicy="memory-disk"
      transition={0}
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH_OF_CARD_SLIDE,
    height: CARD_HEIGHT_OF_CARD_SLIDE,
    position: 'relative',
    flexShrink: 0,
    borderRadius: 25,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  infoLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 20,
    gap: 8,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  description: {
    fontSize: 24,
    fontWeight: '600',
  },
  textLight: {
    color: '#ffffff',
  },
  textDark: {
    color: '#000000',
  },
});
