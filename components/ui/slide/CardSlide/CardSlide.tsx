import { ScrollView, StyleSheet } from 'react-native';
import { CardWrapper } from '@/components/ui/slide/CardSlide/CardWrapper';
import { CardProps } from '@/components/ui/slide/CardSlide/Card';

export const CARD_WIDTH_OF_CARD_SLIDE = 130;
export const CARD_HEIGHT_OF_CARD_SLIDE = CARD_WIDTH_OF_CARD_SLIDE * 1.1;

const CARD_GAP = 10;
const SNAP_INTERVAL = CARD_WIDTH_OF_CARD_SLIDE + CARD_GAP;

export function CardSlide({ imageAssets }: { imageAssets: CardProps[] }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToInterval={SNAP_INTERVAL}
      snapToAlignment="start"
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <CardWrapper ref={null} imageAssets={imageAssets} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 0,
  },
  content: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
});
