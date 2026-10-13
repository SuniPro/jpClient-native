import { EditedMediaDraft } from '@/types/app/post/type';
import { View, StyleSheet } from 'react-native';
import { SavedTextLayer } from '@/components/feed/edit/post/textLayerEdit/helpers';

interface MediaLayerPreviewProps {
  textLayers: EditedMediaDraft['textLayers'];
}

export function MediaLayerPreview({ textLayers }: MediaLayerPreviewProps) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      {textLayers.map((layer) => (
        <SavedTextLayer key={layer.id} layer={layer} editable={false}></SavedTextLayer>
      ))}
    </View>
  );
}
