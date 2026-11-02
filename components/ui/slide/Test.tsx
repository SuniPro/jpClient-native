import { Ref } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { AppText } from '@/components/Text';

export interface collectionContentsProps {
  image: string;
  title: string;
  description: string;
  detail: { image?: string; color?: string[]; detailContents: string };
}

const SCREEN_HEIGHT = Dimensions.get('window').height;
const CARD_WIDTH = 350;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.7;

export function AppleStyleCard(props: {
  ref?: Ref<View>;
  collectionContents: collectionContentsProps;
  isWhite?: boolean;
}) {
  const { ref, collectionContents, isWhite = false } = props;

  return (
    <View ref={ref} style={styles.wrapper}>
      <Image
        source={{ uri: collectionContents.image }}
        style={styles.image}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={0}
      />

      <View style={styles.infoLine}>
        <AppText style={[styles.title, isWhite ? styles.textDark : styles.textLight]}>
          {collectionContents.title}
        </AppText>

        <AppText style={[styles.description, isWhite ? styles.textDark : styles.textLight]}>
          {collectionContents.description}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
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
