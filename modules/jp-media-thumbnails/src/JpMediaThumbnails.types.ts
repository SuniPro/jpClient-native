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
  fastBatchSize: number;
  highBatchSize: number;
};

export type ThumbnailQuality = 'fast' | 'high';

export type ThumbnailOptions = {
  width: number;
  height: number;
  quality?: ThumbnailQuality;
};

/**
 * Native stamps each onThumbnailReady event with the sourceGeneration that was
 * active when the underlying request/preload work started.
 *
 * This is intentionally *not* the generation at emit time.
 *
 * JS stores the latest accepted generation in a ref and ignores events whose
 * sourceGeneration is older, which prevents late events from a previous album
 * or source from mutating the current screen state.
 */
export type ThumbnailReadyEvent = {
  assetId: string;
  quality: ThumbnailQuality;
  uri: string;
  sourceGeneration: number;
};

export type JpMediaThumbnailsModuleEvents = {
  onThumbnailReady: (event: ThumbnailReadyEvent) => void;
};

export type ThumbnailBatchResult = Record<string, string | null>;

export type NativeAlbum = {
  id: string;
  title: string;
  count: number;
  type: 'smart' | 'user';
};

/**
 * Legacy type kept temporarily for compatibility with the older feed-based API.
 * The current iOS gallery path should prefer NativeGalleryAsset +
 * NativeAlbumAssetsResult from getAssetsInAlbum(albumId, first, after).
 */
export type NativeAsset = {
  id: string;
  uri: string;
  mediaType: 'photo' | 'video';
  width: number;
  height: number;
  duration?: number;
};

/**
 * Legacy type kept temporarily for compatibility with the older feed-based API.
 */
export type NativeAssetsPage = {
  assets: NativeAsset[];
  endCursor: string | null;
  hasNextPage: boolean;
};

export type NativeGalleryAsset = {
  id: string;
  mediaType: 'photo' | 'video';
  width: number;
  height: number;
  duration?: number;
};

export type NativeAlbumAssetsResult = {
  assets: NativeGalleryAsset[];
  hasNextPage: boolean;
  endCursor: string | null;
};
