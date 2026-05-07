import { NativeModule, requireNativeModule } from 'expo';
import type {
  JpMediaThumbnailsModuleEvents,
  StartPreloadingOptions,
  ThumbnailBatchResult,
  ThumbnailOptions,
} from './JpMediaThumbnails.types';

declare class JpMediaThumbnailsModule extends NativeModule<JpMediaThumbnailsModuleEvents> {
  getThumbnail(assetId: string, options: ThumbnailOptions): Promise<string | null>;

  getThumbnailBatch(assetIds: string[], options: ThumbnailOptions): Promise<ThumbnailBatchResult>;

  getCachedThumbnail(assetId: string, options: ThumbnailOptions): Promise<string | null>;

  startPreloading(assetIds: string[], options: StartPreloadingOptions): Promise<null>;

  stopPreloading(): void;
}

export default requireNativeModule<JpMediaThumbnailsModule>('JpMediaThumbnails');
