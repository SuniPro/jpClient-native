import { View } from 'react-native';
import { FeedContents } from './contents';
import { InfoLine } from './infoLine';

export default function Feed() {
  return (
    <View style={{ width: '100%' }}>
      <InfoLine></InfoLine>
      <FeedContents></FeedContents>
    </View>
  );
}
