import { Fragment, Ref, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, CardProps } from '@/components/ui/slide/CardSlide/Card';

export const CardWrapper = ({ ref, imageAssets }: { ref: Ref<View>; imageAssets: CardProps[] }) => {
  const cardContainerRef = useRef<View>(null);

  return (
    <View ref={cardContainerRef} style={styles.wrapper}>
      {imageAssets.map((item) => (
        <Fragment key={item.image}>
          <Card ref={ref} cardContents={item} />
        </Fragment>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 20,
  },
});
