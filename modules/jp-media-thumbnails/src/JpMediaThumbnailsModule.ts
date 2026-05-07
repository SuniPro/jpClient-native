import { requireNativeModule } from 'expo-modules-core';
import type { ThumbnailBatchResult, ThumbnailOptions } from './JpMediaThumbnails.types';

export type JpMediaThumbnailsModuleType = {
  getThumbnail(assetId: string, options: ThumbnailOptions): Promise<string | null>;
  getThumbnailBatch(assetIds: string[], options: ThumbnailOptions): Promise<ThumbnailBatchResult>;
};

export default requireNativeModule<JpMediaThumbnailsModuleType>('JpMediaThumbnails');
