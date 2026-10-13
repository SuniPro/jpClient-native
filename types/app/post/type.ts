import { FilterState, StickerLayerDraft, TextLayerDraft } from '@/components/feed/edit/post/types';
import { PickerAsset } from '@/components/gallery/types';

export type EditedMediaDraft = {
  asset: PickerAsset;
  previewUri: string | null;
  textLayers: TextLayerDraft[];
  stickerLayers: StickerLayerDraft[];
  filterState: FilterState | null;
};

export type EditedMediaDraftMap = Record<string, EditedMediaDraft>;
