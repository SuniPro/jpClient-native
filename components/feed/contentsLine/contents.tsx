import { StyleSheet, View } from 'react-native';
import { FeedCarousel } from '../../Carousel';
import { AppText } from '../../Text';
import { feedLineStyle } from '../style';
import { FeedCollapsible } from './FeedCollapsible';

export function FeedContents() {
  return (
    <View style={style.container}>
      <Title></Title>
      <Contents></Contents>
      <Detail></Detail>
    </View>
  );
}

export function Title() {
  return (
    <View style={feedLineStyle.lineContainer}>
      <AppText variant="title3" color="primary">
        픽업 케이크 맛집 !
      </AppText>
    </View>
  );
}

export function Contents() {
  return (
    <FeedCarousel
      data={[
        { id: '1', image: 'https://picsum.photos/800/400?1' },
        { id: '2', image: 'https://picsum.photos/800/400?2' },
        { id: '3', image: 'https://picsum.photos/800/400?3' },
      ]}
    />
  );
}

export function Detail() {
  return (
    <View style={[feedLineStyle.lineContainer, { paddingTop: 5, paddingBottom: 10 }]}>
      <FeedCollapsible>
        <AppText color="primary" variant="body2">
          특별한 날에 어울리는 주문 제작 케이크 맛집을 찾아왔어요~~ 색부터 맛있어 보이죠? 눈으로
          먹고 입으로 먹고... 쓰다보니까 나도 케이크 먹고싶다 dummytext dummytext 당떨어져
          작업하기시러 어쩌구저쩌구 꼭 가보세유
        </AppText>
      </FeedCollapsible>
    </View>
  );
}

const style = StyleSheet.create({
  container: {
    marginTop: 16,
    boxSizing: 'border-box',
  },
});
