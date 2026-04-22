import { useState } from 'react';
import { Image, type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Carousel from 'react-native-reanimated-carousel';

type Item = {
  id: string;
  image: string;
};

type Props = {
  data: Item[];
};

export function FeedCarousel({ data }: Props) {
  const [containerWidth, setContainerWidth] = useState(0);

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);

    setContainerWidth((prev) => (prev !== nextWidth ? nextWidth : prev));
  };

  return (
    <View onLayout={handleLayout} style={styles.container}>
      {containerWidth > 0 && (
        <Carousel
          loop={true}
          width={containerWidth}
          height={containerWidth}
          data={data}
          renderItem={({ item }: { item: Item }) => (
            <View style={styles.slide}>
              <Image style={styles.image} resizeMode="cover" source={{ uri: item.image }} />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingTop: 6,
    paddingBottom: 6,
  },
  slide: {
    flex: 1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
