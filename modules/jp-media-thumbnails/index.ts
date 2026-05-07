import { requireNativeModule } from 'expo-modules-core';
import {
  StartPreloadingOptions,
  ThumbnailBatchResult,
  ThumbnailOptions,
} from '@/modules/jp-media-thumbnails/src/JpMediaThumbnails.types';

export type JpMediaThumbnailsModuleType = {
  getThumbnail(assetId: string, options: ThumbnailOptions): Promise<string | null>;
  getThumbnailBatch(assetIds: string[], options: ThumbnailOptions): Promise<ThumbnailBatchResult>;
  getThumbnail(assetId: string, options: ThumbnailOptions): Promise<string | null>;
  getThumbnailBatch(assetIds: string[], options: ThumbnailOptions): Promise<ThumbnailBatchResult>;
  getCachedThumbnail(assetId: string, options: ThumbnailOptions): Promise<string | null>;
  startPreloading(assetIds: string[], options: StartPreloadingOptions): Promise<null>;
  stopPreloading(): void;
};

export default requireNativeModule<JpMediaThumbnailsModuleType>('JpMediaThumbnails');
