import { requireNativeModule } from 'expo-modules-core';
import type {
  StartPreloadingOptions,
  ThumbnailBatchResult,
  ThumbnailOptions,
} from './JpMediaThumbnails.types';

export type JpMediaThumbnailsModuleType = {
  getThumbnail(assetId: string, options: ThumbnailOptions): Promise<string | null>;
  getThumbnailBatch(assetIds: string[], options: ThumbnailOptions): Promise<ThumbnailBatchResult>;
  getCachedThumbnail(assetId: string, options: ThumbnailOptions): Promise<string | null>;
  startPreloading(assetIds: string[], options: StartPreloadingOptions): Promise<null>;
  stopPreloading(): void;
};

export default requireNativeModule<JpMediaThumbnailsModuleType>('JpMediaThumbnails');
