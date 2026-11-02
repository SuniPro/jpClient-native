import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import { Card } from '@/components/ui/slide/CardSlide/Card';
import { CARD_GAP } from '@/components/ui/slide/CardSlide/constants';
import { Fragment } from 'react';
import { CardProps } from '@/components/ui/slide/CardSlide/type';

const SCREEN_WIDTH = Dimensions.get('window').width;

const CARD_WIDTH = SCREEN_WIDTH * 0.95;
const CARD_HEIGHT = CARD_WIDTH * (4 / 3);

const SIDE_PADDING = (SCREEN_WIDTH - CARD_WIDTH) / 2;
const STRIDE = CARD_WIDTH + CARD_GAP;

export function CardSlide({
  imageAssets,
  onSelectIndex,
}: {
  imageAssets: CardProps[];
  onSelectIndex?: (index: number) => void;
}) {
  const offsets = imageAssets.map((_, index) => index * STRIDE);

  const getNearestIndex = (x: number, offsets: number[]) => {
    const clampedX = Math.max(0, x);

    let nearestIndex = 0;
    let minDistance = Number.POSITIVE_INFINITY;

    offsets.forEach((offset, index) => {
      const distance = Math.abs(offset - clampedX);

      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = index;
      }
    });

    return nearestIndex;
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="normal"
      snapToOffsets={offsets}
      snapToAlignment="center"
      style={styles.container}
      contentContainerStyle={styles.content}
      onMomentumScrollEnd={(event) => {
        const stoppedX = event.nativeEvent.contentOffset.x;
        const index = getNearestIndex(stoppedX, offsets);

        onSelectIndex?.(index);
      }}
    >
      <View style={styles.wrapper}>
        {imageAssets.map((item) => (
          <Fragment key={item.image}>
            <Card size={{ width: CARD_WIDTH, height: CARD_HEIGHT }} cardContents={item} />
          </Fragment>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 0,
  },
  content: {
    paddingHorizontal: SIDE_PADDING,
    alignItems: 'center',
  },
  wrapper: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: CARD_GAP,
  },
});
