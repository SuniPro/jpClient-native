import type { StyleProp, ViewStyle } from 'react-native';

export type OnLoadEventPayload = {
  url: string;
};

export type ChangeEventPayload = {
  value: string;
};

export type JpMediaThumbnailsViewProps = {
  url: string;
  onLoad: (event: { nativeEvent: OnLoadEventPayload }) => void;
  style?: StyleProp<ViewStyle>;
};

export type StartPreloadingOptions = {
  width: number;
  height: number;
  fastBatchSize?: number;
  highBatchSize?: number;
};

export type ThumbnailQuality = 'fast' | 'high';

export type ThumbnailOptions = {
  width: number;
  height: number;
  quality?: ThumbnailQuality;
};

export type ThumbnailReadyEvent = {
  assetId: string;
  quality: ThumbnailQuality;
  uri: string;
};

export type JpMediaThumbnailsModuleEvents = {
  onThumbnailReady: (event: ThumbnailReadyEvent) => void;
};

export type ThumbnailBatchResult = Record<string, string | null>;
