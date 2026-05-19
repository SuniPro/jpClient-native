import { NativeModule, requireNativeModule } from 'expo';
import type {
  JpMediaThumbnailsModuleEvents,
  NativeAlbum,
  NativeAlbumAssetsResult,
  NativeAssetsPage,
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

  /**
   * Called when JS switches to a new gallery source (album / smart album / bucket).
   *
   * Native should bump its internal sourceGeneration, clear any preload state
   * that belongs to the previous source, and return the new generation value.
   *
   * JS stores the returned generation in a ref and ignores any later
   * onThumbnailReady event whose sourceGeneration is lower than that ref,
   * because that event belongs to stale work from the previous source.
   */
  setActiveSource(sourceId: string): Promise<number>;

  getAlbums(): Promise<Array<NativeAlbum>>;

  getAssetsInAlbum(
    albumId: string,
    first: number,
    after?: string | null,
  ): Promise<NativeAlbumAssetsResult>;

  /**
   * Legacy API kept temporarily for compatibility while the iOS gallery flow
   * is being unified around albumId-based fetching.
   *
   * Prefer getAssetsInAlbum(albumId, first, after) for the current iOS path.
   */
  getAssets(options: {
    first: number;
    after?: string | null;
    albumId?: string | null;
    bucket: 'recent' | 'videos' | 'favorites' | 'albums';
  }): Promise<NativeAssetsPage>;

  debugGetPreloadGeneration(): Promise<number>;
}

export default requireNativeModule<JpMediaThumbnailsModule>('JpMediaThumbnails');
