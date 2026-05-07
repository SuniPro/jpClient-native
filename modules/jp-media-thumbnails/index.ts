import { requireNativeModule } from 'expo-modules-core';

export type ThumbnailQuality = 'fast' | 'high';

export type ThumbnailOptions = {
  width: number;
  height: number;
  quality?: ThumbnailQuality;
};

export type ThumbnailBatchResult = Record<string, string | null>;

export type JpMediaThumbnailsModuleType = {
  getThumbnail(assetId: string, options: ThumbnailOptions): Promise<string | null>;
  getThumbnailBatch(assetIds: string[], options: ThumbnailOptions): Promise<ThumbnailBatchResult>;
};

export default requireNativeModule<JpMediaThumbnailsModuleType>('JpMediaThumbnails');
