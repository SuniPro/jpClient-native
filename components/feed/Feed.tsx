import { FeedContents } from '@/components/feed/contentsLine';
import { View } from 'react-native';
import { FunctionLine } from './functionLine/FunctionLine';
import { InfoLine } from './infoLine';

export default function Feed() {
  return (
    <View style={{ width: '100%' }}>
      <InfoLine></InfoLine>
      <FeedContents></FeedContents>
      <FunctionLine></FunctionLine>
    </View>
  );
}
