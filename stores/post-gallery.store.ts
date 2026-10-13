import { create } from 'zustand';
import type { MediaBucketKey, PickerAsset } from '@/components/gallery/types';

export type PostGalleryStore = {
  // gallery restore
  assets: PickerAsset[];
  activeBucket: MediaBucketKey;
  activeAlbumId: string | null;
  activeAlbumTitle: string;
  endCursor: string | null;
  hasNextPage: boolean;
  multiSelectEnabled: boolean;
  activePreviewId: string | null;
  scrollOffset: number;

  // selection / edit
  selectedIds: string[];
  selectedAssets: PickerAsset[];
  activeEditAssetId: string | null;

  // actions
  setAssets: (assets: PickerAsset[]) => void;
  appendAssets: (assets: PickerAsset[]) => void;
  updateAssetThumbnails: (entries: { id: string; uri: string }[]) => void;
  updateAssetThumbnail: (assetId: string, uri: string) => void;

  setGalleryMeta: (
    next: Partial<{
      activeBucket: MediaBucketKey;
      activeAlbumId: string | null;
      activeAlbumTitle: string;
      endCursor: string | null;
      hasNextPage: boolean;
      multiSelectEnabled: boolean;
      activePreviewId: string | null;
      scrollOffset: number;
    }>,
  ) => void;

  setSelectedIds: (ids: string[]) => void;
  setSelectionFromCurrent: () => void;
  setSelection: (assets: PickerAsset[]) => void;
  removeSelected: (id: string) => void;
  clearSelection: () => void;
  setActiveEditAssetId: (id: string | null) => void;

  clearGalleryState: () => void;
  clearAll: () => void;
};

const initialState: Omit<
  PostGalleryStore,
  | 'setAssets'
  | 'appendAssets'
  | 'updateAssetThumbnails'
  | 'updateAssetThumbnail'
  | 'setGalleryMeta'
  | 'setSelectedIds'
  | 'setSelectionFromCurrent'
  | 'setSelection'
  | 'removeSelected'
  | 'clearSelection'
  | 'setActiveEditAssetId'
  | 'clearGalleryState'
  | 'clearAll'
> = {
  assets: [],
  activeBucket: 'recent',
  activeAlbumId: null,
  activeAlbumTitle: '최근 항목',
  endCursor: null,
  hasNextPage: true,
  multiSelectEnabled: false,
  activePreviewId: null,
  scrollOffset: 0,

  selectedIds: [],
  selectedAssets: [],
  activeEditAssetId: null,
};

export const usePostGalleryStore = create<PostGalleryStore>()((set, get) => ({
  ...initialState,

  setAssets: (assets) => {
    set({ assets });
  },

  appendAssets: (incomingAssets) => {
    const currentAssets = get().assets;
    const existingIds = new Set(currentAssets.map((asset) => asset.id));
    const deduped = incomingAssets.filter((asset) => !existingIds.has(asset.id));

    if (deduped.length === 0) return;

    set({
      assets: [...currentAssets, ...deduped],
    });
  },

  updateAssetThumbnails: (entries) => {
    if (entries.length === 0) return;

    const patchMap = new Map(
      entries
        .filter((entry): entry is { id: string; uri: string } => Boolean(entry.uri))
        .map((entry) => [entry.id, entry.uri]),
    );

    if (patchMap.size === 0) return;

    const currentAssets = get().assets;
    let changed = false;

    const nextAssets = currentAssets.map((asset) => {
      const nextThumb = patchMap.get(asset.id);
      if (!nextThumb || nextThumb === asset.thumbnailUri) return asset;

      changed = true;
      return {
        ...asset,
        thumbnailUri: nextThumb,
      };
    });

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!changed) return;

    set({ assets: nextAssets });
  },

  updateAssetThumbnail: (assetId, uri) => {
    const currentAssets = get().assets;
    let changed = false;

    const nextAssets = currentAssets.map((asset) => {
      if (asset.id !== assetId) return asset;
      if (asset.thumbnailUri === uri) return asset;

      changed = true;
      return {
        ...asset,
        thumbnailUri: uri,
      };
    });

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!changed) return;

    set({ assets: nextAssets });
  },

  setGalleryMeta: (next) => {
    set(next);
  },

  setSelectedIds: (ids) => {
    const currentPreviewId = get().activePreviewId;
    const nextPreviewId =
      ids.length === 0
        ? null
        : currentPreviewId && ids.includes(currentPreviewId)
          ? currentPreviewId
          : (ids[ids.length - 1] ?? null);

    set({
      selectedIds: ids,
      activePreviewId: nextPreviewId,
    });
  },

  setSelectionFromCurrent: () => {
    const { assets, selectedIds } = get();

    const assetMap = new Map(assets.map((asset) => [asset.id, asset]));
    const selectedAssets = selectedIds
      .map((id) => assetMap.get(id))
      .filter((asset): asset is PickerAsset => Boolean(asset));

    set({
      selectedAssets,
      activeEditAssetId: selectedAssets[selectedAssets.length - 1]?.id ?? null,
    });
  },

  setSelection: (assets) => {
    const selectedIds = assets.map((asset) => asset.id);

    set({
      selectedAssets: assets,
      selectedIds,
      activeEditAssetId: selectedIds[selectedIds.length - 1] ?? null,
      activePreviewId: selectedIds[selectedIds.length - 1] ?? null,
    });
  },

  removeSelected: (id) => {
    const { selectedIds, selectedAssets, activeEditAssetId, activePreviewId } = get();

    const nextSelectedIds = selectedIds.filter((itemId) => itemId !== id);
    const nextSelectedAssets = selectedAssets.filter((asset) => asset.id !== id);

    const fallbackId = nextSelectedIds[nextSelectedIds.length - 1] ?? null;

    set({
      selectedIds: nextSelectedIds,
      selectedAssets: nextSelectedAssets,
      activeEditAssetId: activeEditAssetId === id ? fallbackId : activeEditAssetId,
      activePreviewId: activePreviewId === id ? fallbackId : activePreviewId,
    });
  },

  clearSelection: () => {
    set({
      selectedIds: [],
      selectedAssets: [],
      activeEditAssetId: null,
      activePreviewId: null,
    });
  },

  setActiveEditAssetId: (id) => {
    set({ activeEditAssetId: id });
  },

  clearGalleryState: () => {
    set({
      assets: [],
      activeBucket: 'recent',
      activeAlbumId: null,
      activeAlbumTitle: '최근 항목',
      endCursor: null,
      hasNextPage: true,
      multiSelectEnabled: false,
      activePreviewId: null,
      scrollOffset: 0,
    });
  },

  clearAll: () => {
    set(initialState);
  },
}));
